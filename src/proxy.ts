import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Per-IP rate limiting for the GitHub-backed API routes.
 *
 * Why these routes specifically: one call to /api/languages/<user> costs up to
 * 41 upstream requests, and /api/og/<user> closer to 55 — all of them spending
 * the SERVER's GITHUB_TOKEN allowance (5,000/hr), not the caller's (60/hr).
 * Caching keys on the username, so distinct names miss cache every time. Left
 * open, a few minutes of trivial traffic exhausts the hourly quota and every
 * card on the site fails for everyone.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
/** Sweep threshold — see the eviction note in `tooMany`. */
const MAX_TRACKED = 5_000;

const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * The caller's address, taken from the platform rather than from the caller.
 *
 * `x-forwarded-for` arrives attacker-controlled: trusting its leftmost value
 * lets anyone mint a fresh identity per request and walk straight past this.
 * Cloudflare overwrites `cf-connecting-ip` at its edge with the real peer, so
 * that is the one worth keying on. It is a single address, not a list — but
 * the split is kept so a proxy that appends cannot smuggle a second value in.
 *
 * When the header is absent — local dev, or a host that is not Cloudflare —
 * everyone shares one bucket. That fails CLOSED (stricter, not looser), which
 * is the right direction for a fallback to lean, but it does mean a self-hosted
 * deploy limits ALL visitors to 30 API calls a minute between them: swap
 * `cf-connecting-ip` for whatever header that platform sets at its edge.
 * Documented for self-hosters on /notes.
 */
function clientKey(request: NextRequest): string {
  const platform = request.headers.get("cf-connecting-ip");
  return platform ? platform.split(",")[0].trim() : "unattributed";
}

function tooMany(key: string, now: number): boolean {
  // Evict on the way through. A limiter that trims counts but never removes
  // keys leaks one map entry per source address for the life of the process.
  // ponytail: O(n) sweep on a threshold — fine for one instance's working set;
  // move to a shared store (Upstash/Redis) if this ever needs to be exact.
  if (hits.size > MAX_TRACKED) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

/**
 * Plain HTTP is a second copy of the whole site, and Google found it.
 *
 * MEASURED: `http://capytools.app/` answered **200 with the full page**, not
 * a redirect — the Worker serves whatever scheme it is asked on. Search
 * Console filed the homepage under "Duplicate without user-selected
 * canonical", because at the time neither copy named a canonical. The
 * canonical shipped since and resolves the duplicate signal; this closes the
 * duplicate itself so there is only ever one URL to choose between.
 *
 * `.app` is HSTS-preloaded, so no BROWSER ever reaches this path — which is
 * exactly why it went unnoticed. Crawlers are not browsers.
 *
 * Reads `x-forwarded-proto` and NOTHING else, and an absent or unrecognised
 * value does nothing. That is deliberate: the failure mode of guessing wrong
 * on an https request is every page redirecting to itself forever, so this
 * only ever acts on an explicit "http". A zone-level "Always Use HTTPS" rule
 * would do the same job one layer earlier and this can go the day one exists
 * — see the rate-limiting note below for the same trade.
 *
 * LOOPBACK IS EXEMPT, and that is not a nicety. `next dev` sets
 * `x-forwarded-proto: http` on every request it serves, so the first version
 * of this redirected every local page to `https://localhost:3024` — a port
 * with no TLS listener — and broke the dev server for everyone. There is no
 * https on a dev host to upgrade to, so there is nothing here to do.
 */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function httpsRedirect(request: NextRequest): NextResponse | null {
  if (request.headers.get("x-forwarded-proto") !== "http") return null;
  const url = new URL(request.url);
  if (LOOPBACK_HOSTS.has(url.hostname)) return null;
  url.protocol = "https:";
  return NextResponse.redirect(url, 301);
}

export function proxy(request: NextRequest) {
  const upgrade = httpsRedirect(request);
  if (upgrade) return upgrade;

  // The limiter is the API surface only — the matcher now covers pages too,
  // for the redirect above, and counting page views here would spend the
  // budget the fan-out routes need.
  if (!request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  const now = Date.now();
  const key = clientKey(request);
  if (tooMany(key, now)) {
    const entry = hits.get(key);
    const retryAfter = entry ? Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) : 60;
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return NextResponse.next();
}

/**
 * Pages as well as the API now, because the http -> https upgrade above has
 * to reach every URL a crawler can try. The RATE LIMITER is still the API
 * surface only — that is where the fan-out lives (`/api/og`,
 * `/api/languages`, `/api/contributions`), and counting page views would just
 * spend budget on them; `proxy` returns early for anything outside `/api/`.
 *
 * `/_next/static/*` is served by the assets binding before the Worker runs,
 * so it never reaches this regardless of what the matcher says.
 *
 * MEASURED, not assumed: this does NOT rate limit on Cloudflare. The Map is
 * per isolate, and isolates are per request far more often than per caller —
 * 60 parallel requests from one machine spread across ~17 of them, the busiest
 * bucket reaching 7. Cloudflare adds isolates under load, so the threshold of
 * 30 is never reached and no 429 is ever returned. It behaves correctly under
 * `wrangler dev`, which is exactly why that was not enough evidence.
 *
 * So the real per-IP limit is a **Cloudflare Rate Limiting rule on the zone**,
 * enforced at the edge before this Worker runs (plan decision, phase 7b). What
 * survives here is burst damping within a single isolate — cheap, honest, and
 * not something to describe as rate limiting on its own.
 *
 * The GitHub quota, meanwhile, is protected by caching, not by this: the edge
 * cache in front (CF-Cache-Status: HIT, no Worker invocation) and the Cache API
 * within (lib/capytools/edge-cache.ts). If those ever go, the exposure is real
 * and a Durable Object becomes the answer, not a bigger number here.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
