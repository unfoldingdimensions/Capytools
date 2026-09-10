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
 * Vercel overwrites `x-vercel-forwarded-for` at its edge with the real peer,
 * so that is the one worth keying on.
 *
 * When the header is absent — local dev, or a host that is not Vercel —
 * everyone shares one bucket. That fails CLOSED (stricter, not looser), which
 * is the right direction for a fallback to lean, but it does mean a self-hosted
 * deploy limits ALL visitors to 30 API calls a minute between them: swap
 * `x-vercel-forwarded-for` for whatever header that platform sets at its edge.
 * Documented for self-hosters on /notes.
 */
function clientKey(request: NextRequest): string {
  const platform = request.headers.get("x-vercel-forwarded-for");
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

export function proxy(request: NextRequest) {
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
 * The API surface only — that is where the fan-out lives (`/api/og`,
 * `/api/languages`, `/api/contributions`). The rest of the site is static and
 * cheap, and counting it here would just spend budget on page views.
 *
 * ponytail: in-memory, so the budget is per serverless instance rather than
 * global — a scaled-out deploy allows proportionally more. It still turns an
 * unbounded drain into a bounded one, which is the point; swap the Map for a
 * shared store if the quota still moves.
 */
export const config = {
  matcher: ["/api/:path*"],
};
