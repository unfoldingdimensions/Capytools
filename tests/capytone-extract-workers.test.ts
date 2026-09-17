import { afterEach, describe, expect, it, vi } from "vitest";

import { createDohResolver } from "../src/lib/capytone/extract/dohResolver";
import { workersTransport, CAPYTONE_USER_AGENT } from "../src/lib/capytone/extract/workersTransport";
import { resolveAndCheck } from "../src/lib/capytone/extract/ssrf";

/**
 * The Cloudflare half of the Extract route's SSRF stack.
 *
 * `tests/capytone-extract.test.ts` already pins the gate itself — the
 * reserved-range table, the every-record-public rule, the redirect re-gating.
 * None of that moved. What moved is the lookup (node:dns → DoH) and the
 * socket (node:http + request-filtering-agent → fetch), and this file pins
 * the two replacements against a stubbed `fetch` so it stays offline.
 *
 * The rule these tests encode: every path that is not a clean, well-formed,
 * public answer resolves to NO ADDRESSES, because `resolveAndCheck` turns an
 * empty answer into a refusal. Fail-closed is the only acceptable direction
 * for a resolver feeding an SSRF gate.
 */

/** A DoH JSON reply, as cloudflare-dns.com would send it. */
function dohReply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/dns-json" },
  });
}

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", (input: URL | string, init?: RequestInit) => {
    const url = input instanceof URL ? input.href : String(input);
    calls.push({ url, init });
    return Promise.resolve(impl(url, init));
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DoH resolver — the node:dns replacement", () => {
  it("asks cloudflare-dns.com for the right name and type, as JSON", async () => {
    const calls = stubFetch(() => dohReply({ Status: 0, Answer: [] }));
    await createDohResolver().resolve4("example.com");

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe("https://cloudflare-dns.com/dns-query");
    expect(url.searchParams.get("name")).toBe("example.com");
    expect(url.searchParams.get("type")).toBe("1");
    expect(new Headers(calls[0].init?.headers).get("Accept")).toBe("application/dns-json");
  });

  it("never follows a redirect from the resolver — that is not an answer", async () => {
    const calls = stubFetch(() => dohReply({ Status: 0, Answer: [] }));
    await createDohResolver().resolve6("example.com");
    expect(calls[0].init?.redirect).toBe("manual");
    expect(new URL(calls[0].url).searchParams.get("type")).toBe("28");
  });

  it("returns the A records of a clean answer", async () => {
    stubFetch(() =>
      dohReply({
        Status: 0,
        Answer: [
          { name: "example.com", type: 1, TTL: 60, data: "93.184.216.34" },
          { name: "example.com", type: 1, TTL: 60, data: "93.184.216.35" },
        ],
      }),
    );
    await expect(createDohResolver().resolve4("example.com")).resolves.toEqual([
      "93.184.216.34",
      "93.184.216.35",
    ]);
  });

  it("keeps only the requested type — a CNAME row is the chain, not the destination", async () => {
    // The resolver does the chasing; the answer section carries the chain AND
    // its terminal rows. Judging the terminal rows is the whole point.
    stubFetch(() =>
      dohReply({
        Status: 0,
        Answer: [
          { name: "www.example.com", type: 5, TTL: 60, data: "lb.internal.example." },
          { name: "lb.internal.example", type: 1, TTL: 60, data: "93.184.216.34" },
        ],
      }),
    );
    await expect(createDohResolver().resolve4("www.example.com")).resolves.toEqual([
      "93.184.216.34",
    ]);
  });

  it("a chain that never reaches an address yields nothing, which is a refusal", async () => {
    stubFetch(() =>
      dohReply({
        Status: 0,
        Answer: [{ name: "www.example.com", type: 5, TTL: 60, data: "nowhere.example." }],
      }),
    );
    await expect(createDohResolver().resolve4("www.example.com")).resolves.toEqual([]);
  });

  describe("every malformed or unhappy answer fails closed", () => {
    const cases: [string, () => Response | Promise<Response>][] = [
      ["NXDOMAIN", () => dohReply({ Status: 3, Answer: [] })],
      ["SERVFAIL", () => dohReply({ Status: 2 })],
      ["non-200", () => dohReply({ Status: 0, Answer: [{ type: 1, data: "1.1.1.1" }] }, 502)],
      ["not JSON", () => new Response("<html>nope</html>", { status: 200 })],
      ["Answer not an array", () => dohReply({ Status: 0, Answer: { type: 1, data: "1.1.1.1" } })],
      ["Answer missing", () => dohReply({ Status: 0 })],
      ["row data not a string", () => dohReply({ Status: 0, Answer: [{ type: 1, data: 12345 }] })],
      ["row is null", () => dohReply({ Status: 0, Answer: [null] })],
      ["empty data string", () => dohReply({ Status: 0, Answer: [{ type: 1, data: "  " }] })],
      ["network error", () => Promise.reject(new Error("offline")) as unknown as Response],
    ];

    for (const [name, reply] of cases) {
      it(name, async () => {
        stubFetch(() => reply());
        await expect(createDohResolver().resolve4("example.com")).resolves.toEqual([]);
      });
    }
  });

  it("feeds the real gate: a private record still fails the every-record-public rule", async () => {
    // The resolver is only half the story — this is the half that matters.
    stubFetch(() =>
      dohReply({
        Status: 0,
        Answer: [
          { type: 1, data: "93.184.216.34" },
          { type: 1, data: "10.0.0.5" },
        ],
      }),
    );
    const verdict = await resolveAndCheck(new URL("https://example.com/"), createDohResolver());
    expect(verdict).toEqual({ ok: false, reason: "blocked_host" });
  });

  it("feeds the real gate: an empty answer is a dns failure, never a pass", async () => {
    stubFetch(() => dohReply({ Status: 0, Answer: [] }));
    const verdict = await resolveAndCheck(new URL("https://example.com/"), createDohResolver());
    expect(verdict).toEqual({ ok: false, reason: "dns" });
  });
});

describe("workers transport — the node:http replacement", () => {
  const options = { signal: new AbortController().signal, accept: "text/html" };

  it("sends GET, manual redirect, and the honest constant User-Agent", async () => {
    const calls = stubFetch(() => new Response("<html></html>", { status: 200 }));
    await workersTransport(new URL("https://example.com/"), options);

    const init = calls[0].init as RequestInit;
    expect(init.method).toBe("GET");
    // Automatic redirects would follow a Location to a private host before
    // gate 2 ever saw it. This is the line that keeps redirects in the guards.
    expect(init.redirect).toBe("manual");
    const headers = new Headers(init.headers);
    expect(headers.get("User-Agent")).toBe(CAPYTONE_USER_AGENT);
    expect(headers.get("Accept")).toBe("text/html");
    expect(headers.get("Accept-Encoding")).toBe("identity");
  });

  it("surfaces the headers the guards judge, without reading the body", async () => {
    stubFetch(
      () =>
        new Response("body bytes", {
          status: 301,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            Location: "https://elsewhere.example/",
          },
        }),
    );
    const reply = await workersTransport(new URL("https://example.com/"), options);
    expect(reply.status).toBe(301);
    expect(reply.contentType).toBe("text/html; charset=utf-8");
    expect(reply.location).toBe("https://elsewhere.example/");
  });

  it("streams the body through as an async iterable", async () => {
    stubFetch(() => new Response("hello world", { status: 200 }));
    const reply = await workersTransport(new URL("https://example.com/"), options);

    const chunks: Uint8Array[] = [];
    for await (const chunk of reply.body) chunks.push(chunk);
    const joined = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
    expect(joined).toBe("hello world");
  });

  it("exposes a cancel that actually tears a web stream down (A4)", async () => {
    // reply.body.destroy() is a Node idiom and a silent no-op on a
    // ReadableStream. Without a real cancel, every redirect and every refused
    // content-type would leave its response open.
    stubFetch(() => new Response("never fully read", { status: 302, headers: { Location: "/x" } }));
    const reply = await workersTransport(new URL("https://example.com/"), options);

    expect(typeof reply.cancel).toBe("function");
    expect(() => reply.cancel?.()).not.toThrow();
  });

  it("a body-less response still satisfies the iterable contract", async () => {
    stubFetch(() => new Response(null, { status: 304 }));
    const reply = await workersTransport(new URL("https://example.com/"), options);

    const chunks: Uint8Array[] = [];
    for await (const chunk of reply.body) chunks.push(chunk);
    expect(chunks).toEqual([]);
    expect(() => reply.cancel?.()).not.toThrow();
  });
});
