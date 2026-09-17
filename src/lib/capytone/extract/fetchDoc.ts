/**
 * The guarded fetch: validateTarget + resolveAndCheck re-run on EVERY hop,
 * redirects followed by hand (never by the HTTP layer), a streamed byte cap
 * and a shared deadline.
 *
 * Everything here is dependency-injected — a HostResolver and a Transport —
 * so the whole redirect/block/cap machinery is table-tested offline. The
 * only piece that touches a real socket lives in workersTransport.ts.
 */

import {
  resolveAndCheck,
  validateTarget,
  type BlockReason,
  type HostResolver,
} from "./ssrf";

/** Why a guarded fetch failed. BlockReasons are re-raised verbatim; the rest
 * describe the fetch itself. */
export type FetchFailure =
  | BlockReason
  | "dns"
  | "timed_out"
  | "too_large"
  | "not_html"
  | "upstream"
  | "too_many_redirects"
  | "network";

export type FetchOutcome<TMeta = void> =
  | { ok: true; doc: FetchedDoc<TMeta> }
  | { ok: false; failure: FetchFailure };

export interface FetchedDoc<TMeta = void> {
  /** The URL the body actually came from (post-redirects), absolute. */
  url: string;
  text: string;
  bytes: number;
  /** Transport-provided context carried alongside the body. */
  meta: TMeta;
}

/** One already-validated HTTP response, body unread. */
export interface HttpReply<TMeta = unknown> {
  status: number;
  contentType: string | null;
  contentEncoding: string | null;
  /** The raw Location header, when the status is a redirect. */
  location: string | null;
  body: AsyncIterable<Uint8Array>;
  /**
   * Tear the body down without reading it, when the transport needs a
   * different verb than a Node stream's `destroy()`. Web ReadableStreams
   * cancel through their reader, and calling `destroy()` on one is a silent
   * no-op — see `discard`.
   */
  cancel?: () => void;
  meta: TMeta;
}

/** Opens exactly ONE request. No auto-redirects, no body buffering, no
 * retries — the guards here own all of that. */
export type Transport<TMeta = unknown> = (
  url: URL,
  options: { signal: AbortSignal; accept: string },
) => Promise<HttpReply<TMeta>>;

export interface FetchGuards<TMeta = unknown> {
  resolver: HostResolver;
  transport: Transport<TMeta>;
  /** Shared deadline for the whole operation (every hop, every await). */
  signal: AbortSignal;
  /** Response bodies stream through this cap; a byte over aborts the body. */
  maxBytes: number;
  /** Redirects followed after the initial request (so ≤ max+1 requests). */
  maxRedirects: number;
  /** The final response's content type must start with one of these. */
  accept: readonly string[];
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

class DeadlineError extends Error {
  constructor() {
    super("the fetch deadline passed");
    this.name = "DeadlineError";
  }
}

/** Bind an await to the shared deadline — dns.promises takes no signal, so
 * without this race the 10s total would not actually bound resolution. */
function raceDeadline<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DeadlineError());
  let onAbort: () => void;
  const lost = new Promise<never>((_, reject) => {
    onAbort = () => {
      reject(new DeadlineError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
  p.catch(() => {}); // a late failure must not become an unhandled rejection
  return Promise.race([p, lost]).finally(() => {
    signal.removeEventListener("abort", onAbort);
  });
}

/** Stream the body through the cap. One byte over the cap aborts the hop's
 * socket and reports too_large — no partial body is ever handed on. */
async function readCapped(
  body: AsyncIterable<Uint8Array>,
  maxBytes: number,
  stop: (reason: Error) => void,
): Promise<{ ok: true; text: string; bytes: number } | { ok: false; reason: FetchFailure }> {
  const decoder = new TextDecoder("utf-8");
  const parts: string[] = [];
  let total = 0;
  let capped = false;
  try {
    for await (const chunk of body) {
      total += chunk.byteLength;
      if (total > maxBytes) {
        capped = true;
        stop(new Error("response exceeded the byte cap"));
        break;
      }
      parts.push(decoder.decode(chunk, { stream: true }));
    }
  } catch {
    if (!capped) return { ok: false, reason: "network" };
  }
  if (capped) return { ok: false, reason: "too_large" };
  parts.push(decoder.decode());
  return { ok: true, text: parts.join(""), bytes: total };
}

/** Tear a response down without reading it. A body that is never consumed
 * holds its socket open — and against an upstream that sends headers and
 * then stalls, "until the response ends" means forever. The shared deadline
 * cannot help: the per-hop abort listener is gone by the time these
 * early returns happen.
 *
 * Two runtimes, two verbs. Node streams have `destroy()`; web
 * ReadableStreams do not, and the optional-call form below would have found
 * nothing and silently done nothing on Workers — leaving every redirect and
 * every refused content-type holding its response open. A transport that
 * needs the other verb supplies `cancel`, and it wins. */
function discard<TMeta>(reply: HttpReply<TMeta>): void {
  if (reply.cancel) {
    reply.cancel();
    return;
  }
  (reply.body as { destroy?: (error?: Error) => void }).destroy?.();
}

/**
 * The ordered stack, per hop: parse (validateTarget) → DNS + blocklist
 * (resolveAndCheck) → one transport call. Redirects loop back through all of
 * it with the Location-resolved URL — the merge gate's "redirect to a
 * private hop" dies at the gate 2 check of hop 2, before its socket opens.
 */
export async function fetchWithGuards<TMeta = unknown>(
  startUrl: URL,
  guards: FetchGuards<TMeta>,
): Promise<FetchOutcome<TMeta>> {
  let current = startUrl;
  for (let hop = 0; ; hop++) {
    if (guards.signal.aborted) return { ok: false, failure: "timed_out" };

    const check = validateTarget(current.href);
    if (!check.ok) return { ok: false, failure: check.reason };

    let resolved: Awaited<ReturnType<typeof resolveAndCheck>>;
    try {
      resolved = await raceDeadline(resolveAndCheck(check.url, guards.resolver), guards.signal);
    } catch {
      return { ok: false, failure: "timed_out" };
    }
    if (!resolved.ok) return { ok: false, failure: resolved.reason };

    // The transport gets its own abort handle: the shared deadline kills it,
    // and so does the byte cap when it stops reading mid-body.
    const hopAbort = new AbortController();
    const onParentAbort = () => hopAbort.abort(guards.signal.reason);
    guards.signal.addEventListener("abort", onParentAbort, { once: true });

    let reply: Awaited<ReturnType<Transport<TMeta>>>;
    try {
      reply = await raceDeadline(
        guards.transport(check.url, { signal: hopAbort.signal, accept: guards.accept[0] }),
        guards.signal,
      );
    } catch (error) {
      // A deadline loss is the clock; anything else is the wire.
      const timedOut = error instanceof DeadlineError || guards.signal.aborted;
      return { ok: false, failure: timedOut ? "timed_out" : "network" };
    } finally {
      guards.signal.removeEventListener("abort", onParentAbort);
    }

    if (REDIRECT_STATUSES.has(reply.status) && reply.location) {
      // The redirect body is never read — tear the response down so the
      // socket cannot linger for the next hop.
      discard(reply);
      if (hop >= guards.maxRedirects) {
        return { ok: false, failure: "too_many_redirects" };
      }
      try {
        current = new URL(reply.location, check.url);
      } catch {
        return { ok: false, failure: "bad_url" };
      }
      continue;
    }

    if (reply.status < 200 || reply.status > 299) {
      discard(reply);
      return { ok: false, failure: "upstream" };
    }
    const contentType = (reply.contentType ?? "").split(";")[0].trim().toLowerCase();
    if (!guards.accept.some((prefix) => contentType.startsWith(prefix))) {
      discard(reply);
      return { ok: false, failure: "not_html" };
    }
    if (reply.contentEncoding && reply.contentEncoding.trim().toLowerCase() !== "identity") {
      // We asked for identity; an encoded body would be unreadable bytes to
      // the parser, and decompressing it would open a bomb we capped away.
      discard(reply);
      return { ok: false, failure: "upstream" };
    }

    const read = await readCapped(reply.body, guards.maxBytes, (reason) => hopAbort.abort(reason));
    if (!read.ok) return { ok: false, failure: read.reason };
    return {
      ok: true,
      doc: { url: check.url.href, text: read.text, bytes: read.bytes, meta: reply.meta },
    };
  }
}
