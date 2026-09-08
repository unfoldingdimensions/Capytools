import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * GitHub's own rule: 1–39 characters of [A-Za-z0-9], hyphens allowed inside
 * only. Anything else cannot name a real account, so it has no business
 * reaching a fetch, a cache key, or a rendered page.
 */
const GITHUB_LOGIN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

/**
 * Clean up user-provided GitHub usernames, and reject what cannot be one:
 * - Trims leading/trailing whitespace
 * - Strips leading '@' characters
 * - Extracts username if full github.com URL was provided
 * - Strips trailing query params or slashes
 * - Returns "" for anything that is not a valid login
 *
 * The empty return is the contract callers already rely on — both API routes
 * do `if (!clean) return 400`. Rejecting here rather than at each call site is
 * what stops a 5,000-character "username" becoming a cache key and a
 * 41-request fan-out to GitHub on the server's token. Note this normalised
 * only, and never rejected, until a security review in Sep 2026.
 */
export function sanitizeUsername(input: string): string {
  let clean = input.trim();
  // Strip leading @
  clean = clean.replace(/^@+/, "");
  // Extract username if URL is provided (e.g. https://github.com/torvalds, github.com/torvalds)
  const match = clean.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)/i);
  if (match?.[1]) {
    return GITHUB_LOGIN.test(match[1]) ? match[1] : "";
  }
  // Strip trailing slashes or queries if formatted as a path
  clean = clean.replace(/[/?#].*$/, "");
  return GITHUB_LOGIN.test(clean) ? clean : "";
}

/**
 * Canonical public origin, used for anything an external service has to fetch:
 * OG image URLs and the links handed to X / LinkedIn. Deliberately NOT
 * `window.location.origin` — in dev that is `http://localhost:PORT`, which no
 * crawler can reach, so link previews silently fail (X shows no card, LinkedIn
 * drops the user on their feed). Override per-environment with
 * NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (
  // The `typeof` guard is load-bearing, not defensive noise. `cn` lives in this
  // module, and the CapyExpense desktop app imports it into a plain Vite bundle
  // where `process` does not exist — an unguarded read here throws at module
  // load and takes the whole app's first paint with it.
  //
  // The `process.env.NEXT_PUBLIC_SITE_URL` expression is left verbatim on
  // purpose: Next inlines it by textual match, and rewriting it (optional
  // chaining, destructuring) would silently stop that working.
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
  "https://capytools.vercel.app"
).replace(/\/+$/, "");
