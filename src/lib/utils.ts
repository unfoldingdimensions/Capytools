import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean up user-provided GitHub usernames:
 * - Trims leading/trailing whitespace
 * - Strips leading '@' characters
 * - Extracts username if full github.com URL was provided
 * - Strips trailing query params or slashes
 */
export function sanitizeUsername(input: string): string {
  let clean = input.trim();
  // Strip leading @
  clean = clean.replace(/^@+/, "");
  // Extract username if URL is provided (e.g. https://github.com/torvalds, github.com/torvalds)
  const match = clean.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)/i);
  if (match?.[1]) {
    return match[1];
  }
  // Strip trailing slashes or queries if formatted as a path
  clean = clean.replace(/[/?#].*$/, "");
  return clean;
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
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://capytools.vercel.app"
).replace(/\/+$/, "");
