/**
 * The real transport for the Extract route on Cloudflare Workers — the
 * replacement for the `node:http` + `request-filtering-agent` transport this
 * route used on Vercel. Neither exists on workerd — there is no `http.Agent`
 * for the filtering agent to attach to — so both were removed with this port
 * rather than left in the tree as dead code that still pulls `node:http`
 * into the worker bundle. Git history has the original.
 *
 * GET only. The User-Agent is honest and constant. Bodies are never read
 * here, logged, or echoed — only handed, unbuffered, to the cap reader.
 * `redirect: "manual"` keeps redirects physically impossible inside this
 * file, exactly as the raw `node:http` call did: the guards in fetchDoc own
 * them, and every hop is re-resolved and re-gated before its socket opens.
 *
 * ── What moved, and what it costs ──────────────────────────────────────────
 *
 * 1. CONNECT-TIME ADDRESS CHECKING — replaced, not lost. MEASURED.
 *    Node re-resolved the host at connect time and refused private addresses
 *    on the wire, so a DNS-rebinding window between our check and the socket
 *    met a second, independent gate. Workers has no such hook. The replacement
 *    is the platform's `global_fetch_strictly_public` compatibility flag (set
 *    in wrangler.jsonc — it is load-bearing, not decoration).
 *
 *    Verified rather than assumed, by fetching private addresses directly from
 *    a staged Worker with every app-level gate bypassed:
 *      http://127.0.0.1/        -> 403, destination not reached
 *      http://169.254.169.254/  -> 403, destination not reached
 *      http://10.0.0.1/         -> 403, destination not reached
 *
 *    Note the SHAPE, because it decides how this file behaves if the app gates
 *    ever fail: the platform does NOT throw and does not refuse to open the
 *    subrequest. It answers with a 403 Response. So a private destination
 *    arrives here as an ordinary non-2xx reply, and fetchDoc's status gate
 *    turns it into an `upstream` failure — the body is discarded unread and
 *    nothing reaches the parser. Safe, but by a different route than "the
 *    fetch explodes", which is what a reader would otherwise assume.
 *
 *    `wrangler.jsonc` is therefore part of this file's security surface.
 *    Removing that flag silently removes this defence, and no test here would
 *    notice — the app-level gates would keep the suite green.
 *
 * 2. THE RESOLVE→CONNECT TOCTOU WINDOW — accepted, and smaller than it looks.
 *    `dohResolver` checks the records, then `fetch` resolves again on its own;
 *    nothing pins the address in between. That window cannot be closed on
 *    Workers. What bounds it: Cloudflare's egress cannot reach RFC1918 at all
 *    and there is no cloud metadata endpoint to reach, so the classic prize
 *    for winning the race — 169.254.169.254 — does not exist here.
 *
 * 3. CNAME-TO-PRIVATE — advisory on this platform.
 *    The DoH pre-check judges terminal A/AAAA records, so a chain that ends
 *    somewhere public passes even if an intermediate name is private. Gate 2
 *    is therefore advisory here rather than binding; (1) is what actually
 *    stops the connection.
 *
 * 4. THE COMPRESSION-BOMB GATE — genuinely weaker, and this is new.
 *    The Node transport sent `Accept-Encoding: identity` so the byte cap counted
 *    real wire bytes and no decompression bomb could hide behind a small
 *    content-length. Workers manages content encoding itself: it may add its
 *    own accept-encoding, transparently decompress, and strip the
 *    `content-encoding` header before we ever see it. So we ask for identity
 *    and we no longer get to insist.
 *    What still holds: `readCapped` counts what it is actually handed and
 *    aborts the body one byte over MAX_RESPONSE_BYTES, so the parser is still
 *    fed a bounded document and nothing unbounded is ever buffered. What is
 *    gone: the guarantee about bytes *on the wire*. A bomb now costs us
 *    decompression up to the cap rather than being refused at the header.
 *    That is bounded work, not unbounded, which is why it is accepted — but
 *    it is a real difference from Vercel and is not to be quietly re-claimed.
 */

import type { HttpReply, Transport } from "./fetchDoc";

export const CAPYTONE_USER_AGENT = "CapyTone/1.0 (+https://capytools.app)";

/**
 * A web ReadableStream as the AsyncIterable the cap reader wants.
 *
 * Not `for await (const c of stream)` directly: async iteration over
 * ReadableStream is not dependable across runtimes, and the cap reader stops
 * mid-body by design, so the reader has to be one we can also cancel from
 * `discard`. Holding it here keeps both behaviours in one place.
 */
function streamToIterable(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) return;
          if (value) yield value;
        }
      } finally {
        // Leaving a reader locked holds the response open. The cap reader
        // breaks out of this loop the moment it is one byte over, so this is
        // the ordinary path, not the exceptional one.
        reader.releaseLock();
      }
    },
  };
}

export const workersTransport: Transport<void> = async (url, { signal, accept }) => {
  const response = await fetch(url, {
    method: "GET",
    // The guards own redirects. Left automatic, a redirect to a private host
    // would be followed before gate 2 ever saw it.
    redirect: "manual",
    signal,
    headers: {
      "User-Agent": CAPYTONE_USER_AGENT,
      Accept: accept,
      // Asked for, not guaranteed — see (4) in the header above.
      "Accept-Encoding": "identity",
    },
  });

  // A redirect reply has no body worth reading; a bodyless response (304, or
  // a HEAD-like reply) still has to satisfy the AsyncIterable contract.
  const reader = response.body?.getReader();

  const reply: HttpReply<void> = {
    status: response.status,
    contentType: response.headers.get("content-type"),
    contentEncoding: response.headers.get("content-encoding"),
    location: response.headers.get("location"),
    body: reader ? streamToIterable(reader) : (async function* () {})(),
    // Tear-down that actually works on a web stream. `reply.body.destroy()`
    // is a Node-stream idiom and is a silent no-op here — which would have
    // regressed the fix that stopped refused responses holding their sockets
    // open until the upstream felt like ending them.
    cancel: () => {
      void reader?.cancel().catch(() => {});
    },
    meta: undefined,
  };
  return reply;
};
