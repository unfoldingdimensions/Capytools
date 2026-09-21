/**
 * The response cache for the three GitHub-backed routes.
 *
 * Why this file exists at all: on Vercel, `s-maxage` and the `revalidate`
 * segment export were enough — the platform's CDN read them and served repeats
 * itself. On Workers neither is honoured without configuration, so those
 * headers became decoration the moment we moved, and every request for the
 * same username would have gone back to GitHub. That is the difference between
 * one fan-out per username per half-hour and one per *request* — and
 * `/api/og/<user>` costs up to ~55 upstream calls, all of them spending the
 * server's 5,000/hr token rather than the caller's.
 *
 * This is the real protection for that quota. The in-memory limiter in
 * proxy.ts is per-isolate and therefore per-colo, with buckets that reset
 * whenever an isolate is recycled; it bounds an individual caller, not the
 * total. If this cache is ever removed, the limiter does not cover for it and
 * the Durable Object seam (plan §11) stops being optional.
 *
 * Deliberately the Cache API and not Cache Rules: Cache Rules are a zone
 * feature and do not exist on `*.workers.dev`, so choosing them would have
 * made this impossible to prove before the DNS cutover — which is exactly the
 * gate it most needs to pass.
 *
 * Privacy note: what is stored here is a public GitHub profile's derived
 * counts, keyed by the username already in the URL. No visitor is identified,
 * nothing is stored per-visitor, and the cache is Cloudflare's own edge cache
 * — the site's "nothing stored" promise is about *your* data, and none of
 * that passes through here.
 */

/** Matches the `s-maxage` the routes already advertise. One source of truth. */
export const EDGE_CACHE_SECONDS = 1800;

/** Header for making a hit visible — to the §10.3 smoke gate, and in dev. */
export const CACHE_STATUS_HEADER = "x-capy-cache";

/**
 * The Cache API, when there is one.
 *
 * `caches.default` is a Workers global. Under vitest and during the Node
 * build there is no such thing, and the honest answer is "no cache" rather
 * than a shim that pretends — a fake that always misses would make the tests
 * agree with a broken deployment.
 */
function edgeCache(): Cache | null {
  const store = (globalThis as { caches?: { default?: Cache } }).caches;
  return store?.default ?? null;
}

/**
 * Hand work to the platform's `waitUntil` so a cache write cannot be cut off
 * when the response is returned — and so a failure to get the context is
 * never a failure to answer the request.
 */
async function afterResponse(work: Promise<unknown>): Promise<void> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    getCloudflareContext().ctx.waitUntil(work);
  } catch {
    // No context (build, test, or a future runtime): just let it run. The
    // await is deliberate — better a few extra ms than a dropped write.
    await work.catch(() => {});
  }
}

/**
 * Serve `request` from the edge cache, or produce it and store it.
 *
 * Keyed on the full request URL, so a route that grows a query parameter
 * later keys on it automatically instead of quietly sharing one entry.
 *
 * `canonicalPath` replaces the path before keying, for a route whose segment
 * has more than one spelling of the same thing. GitHub logins are unique
 * case-insensitively, so `/api/og/Torvalds` and `/api/og/torvalds` name one
 * account — but as two raw URLs they were two entries, and the second one
 * bought its own ~55-request fan-out on the server's token. Lowercasing in
 * `sanitizeUsername` alone did NOT fix that: this key never saw the sanitized
 * value. MEASURED on the live deployment before this was added.
 *
 * Only 200s are stored. Caching a 404 for a username that does not exist yet,
 * or a 502 from a bad half-hour at GitHub, would turn a transient upstream
 * problem into a sticky one.
 */
export async function withEdgeCache(
  request: Request,
  produce: () => Promise<Response>,
  canonicalPath?: string,
): Promise<Response> {
  const cache = edgeCache();
  if (!cache) return produce();

  // GET only: the Cache API refuses anything else as a key, and these three
  // routes are reads.
  const url = new URL(request.url);
  if (canonicalPath) url.pathname = canonicalPath;
  const key = new Request(url.toString(), { method: "GET" });

  const hit = await cache.match(key).catch(() => undefined);
  if (hit) {
    const served = new Response(hit.body, hit);
    served.headers.set(CACHE_STATUS_HEADER, "hit");
    return served;
  }

  const fresh = await produce();
  if (fresh.status === 200) {
    const stored = fresh.clone();
    // The entry needs its own lifetime. The routes advertise `s-maxage` for
    // any CDN in front of us; this is what the edge cache itself reads.
    if (!stored.headers.has("Cache-Control")) {
      stored.headers.set("Cache-Control", `public, s-maxage=${EDGE_CACHE_SECONDS}`);
    }
    await afterResponse(cache.put(key, stored).catch(() => {}));
  }

  const served = new Response(fresh.body, fresh);
  served.headers.set(CACHE_STATUS_HEADER, "miss");
  return served;
}
