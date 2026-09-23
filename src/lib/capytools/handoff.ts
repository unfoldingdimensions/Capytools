/**
 * Carry a visitor's own input from the landing's proof band into a tool —
 * through the URL FRAGMENT, never the query string.
 *
 * The distinction is the whole point. A query string is part of the request:
 * `/capyqr?text=…` would send what the visitor typed to our Worker, whose
 * request logging is on (`observability` in wrangler.jsonc), seconds after a
 * band whose only job is to prove nothing they type leaves the tab. A
 * fragment (`/capyqr#text=…`) is never sent by the browser at all.
 *
 * `readHandoff` also scrubs the fragment once read, so a reload or a copied
 * address bar does not keep replaying — or leaking — the text.
 */

const KEY = "text";

/** `/capyqr` + "a b" → `/capyqr#text=a%20b`. Empty input needs no hand-off. */
export function handoffHref(href: string, text: string): string {
  const value = text.trim();
  return value ? `${href}#${KEY}=${encodeURIComponent(value)}` : href;
}

/** Parse a fragment's hand-off text, or null. Pure, so node can test it. */
export function parseHandoff(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const value = new URLSearchParams(raw).get(KEY);
  return value && value.trim() ? value : null;
}

/**
 * Read the hand-off from the current URL and remove it from the address bar.
 * Browser-only; returns null on the server and when there is nothing to read.
 */
export function readHandoff(): string | null {
  if (typeof window === "undefined") return null;
  const value = parseHandoff(window.location.hash);
  if (value !== null) {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, "", pathname + search);
  }
  return value;
}
