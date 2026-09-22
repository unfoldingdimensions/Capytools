import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CACHE_STATUS_HEADER,
  EDGE_CACHE_SECONDS,
  withEdgeCache,
} from "../src/lib/capytools/edge-cache";

/**
 * The response cache that replaced `s-maxage` on Workers.
 *
 * The rules worth pinning are the ones whose absence is silent: an error
 * response must never be stored (a bad half-hour at GitHub would otherwise
 * become a sticky 502), the key must include the whole URL (so a future query
 * parameter cannot quietly share one entry), and a missing Cache API must
 * degrade to "just produce it" rather than to a fake that always misses.
 */

/** A minimal stand-in for `caches.default`, keyed the way the real one is. */
function fakeCache() {
  const entries = new Map<string, Response>();
  const cache = {
    match: (req: Request) => Promise.resolve(entries.get(req.url)?.clone()),
    put: (req: Request, res: Response) => {
      entries.set(req.url, res);
      return Promise.resolve();
    },
  };
  return { cache, entries };
}

function installCache() {
  const { cache, entries } = fakeCache();
  vi.stubGlobal("caches", { default: cache });
  return entries;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const REQ = (url = "https://capytools.app/api/languages/octocat") => new Request(url);

describe("withEdgeCache", () => {
  it("produces on a miss and marks it", async () => {
    installCache();
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    const res = await withEdgeCache(REQ(), produce);

    expect(produce).toHaveBeenCalledTimes(1);
    expect(res.headers.get(CACHE_STATUS_HEADER)).toBe("miss");
    await expect(res.json()).resolves.toEqual({ ok: 1 });
  });

  it("serves the second request from the cache without producing again", async () => {
    installCache();
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    await withEdgeCache(REQ(), produce);
    const second = await withEdgeCache(REQ(), produce);

    // This is the whole point: one GitHub fan-out, not two.
    expect(produce).toHaveBeenCalledTimes(1);
    expect(second.headers.get(CACHE_STATUS_HEADER)).toBe("hit");
    await expect(second.json()).resolves.toEqual({ ok: 1 });
  });

  it("keys on the full URL — a different username is a different entry", async () => {
    installCache();
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    await withEdgeCache(REQ("https://capytools.app/api/languages/octocat"), produce);
    await withEdgeCache(REQ("https://capytools.app/api/languages/torvalds"), produce);

    expect(produce).toHaveBeenCalledTimes(2);
  });

  it("collapses spellings of one account onto the canonical path", async () => {
    installCache();
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    // What the three routes pass: the sanitized, lowercased login. Without
    // it the raw URL is the key, and the second spelling buys a second
    // ~55-request fan-out on the server's token — which is what the live
    // deployment did until this argument existed.
    await withEdgeCache(REQ("https://capytools.app/api/og/Torvalds"), produce, "/api/og/torvalds");
    await withEdgeCache(REQ("https://capytools.app/api/og/torvalds"), produce, "/api/og/torvalds");

    expect(produce).toHaveBeenCalledTimes(1);
  });

  it("still keys on the query string, canonical path or not", async () => {
    installCache();
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    await withEdgeCache(REQ("https://capytools.app/api/og/octocat"), produce, "/api/og/octocat");
    await withEdgeCache(
      REQ("https://capytools.app/api/og/octocat?variant=dark"),
      produce,
      "/api/og/octocat",
    );

    expect(produce).toHaveBeenCalledTimes(2);
  });

  it("keys on the query string too, so a future parameter cannot share an entry", async () => {
    installCache();
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    await withEdgeCache(REQ("https://capytools.app/api/og/octocat"), produce);
    await withEdgeCache(REQ("https://capytools.app/api/og/octocat?variant=dark"), produce);

    expect(produce).toHaveBeenCalledTimes(2);
  });

  describe("only 200s are stored", () => {
    for (const status of [404, 500, 502]) {
      it(`does not cache a ${status}`, async () => {
        const entries = installCache();
        const produce = vi.fn(async () => Response.json({ error: "no" }, { status }));

        const first = await withEdgeCache(REQ(), produce);
        expect(first.status).toBe(status);
        expect(entries.size).toBe(0);

        // A transient upstream failure must not become a sticky one.
        await withEdgeCache(REQ(), produce);
        expect(produce).toHaveBeenCalledTimes(2);
      });
    }
  });

  it("gives a stored response its own lifetime when the route set none", async () => {
    const entries = installCache();
    await withEdgeCache(REQ(), async () => new Response("hi", { status: 200 }));

    const stored = [...entries.values()][0];
    expect(stored.headers.get("Cache-Control")).toBe(`public, s-maxage=${EDGE_CACHE_SECONDS}`);
  });

  it("keeps the route's own Cache-Control when it set one", async () => {
    const entries = installCache();
    await withEdgeCache(REQ(), async () =>
      Response.json({ ok: 1 }, { headers: { "Cache-Control": "public, s-maxage=60" } }),
    );

    const stored = [...entries.values()][0];
    expect(stored.headers.get("Cache-Control")).toBe("public, s-maxage=60");
  });

  it("without a Cache API it just produces — no shim, no pretending", async () => {
    // vitest and the Node build have no `caches`. The honest answer is "no
    // cache"; a fake that always missed would let the tests agree with a
    // deployment where caching silently did nothing.
    vi.stubGlobal("caches", undefined);
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    const res = await withEdgeCache(REQ(), produce);

    expect(produce).toHaveBeenCalledTimes(1);
    expect(res.headers.get(CACHE_STATUS_HEADER)).toBeNull();
  });

  it("a cache read that throws falls back to producing, never to failing", async () => {
    vi.stubGlobal("caches", {
      default: {
        match: () => Promise.reject(new Error("cache unavailable")),
        put: () => Promise.resolve(),
      },
    });
    const produce = vi.fn(async () => Response.json({ ok: 1 }));

    const res = await withEdgeCache(REQ(), produce);

    expect(res.status).toBe(200);
    expect(produce).toHaveBeenCalledTimes(1);
  });
});
