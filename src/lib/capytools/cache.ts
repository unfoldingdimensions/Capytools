import type { WrappedStats } from "@/lib/github/types";

// Bump when the WrappedStats shape changes: an entry written by an older build
// would otherwise be read back missing fields the card now requires.
const CACHE_VERSION = "v2";
const CACHE_PREFIX = `capytools:wrapped:${CACHE_VERSION}:`;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const memoryCache: Record<string, { raw: string; parsed: WrappedStats }> = {};

export function readWrappedCache(username: string): WrappedStats | null {
  if (typeof window === "undefined") return null;
  try {
    const key = CACHE_PREFIX + username.toLowerCase();
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    if (memoryCache[key]?.raw === raw) {
      return memoryCache[key].parsed;
    }
    const entry = JSON.parse(raw) as { stats: WrappedStats; at: number };
    if (Date.now() - entry.at >= CACHE_TTL_MS) return null;
    // Guard against a partially-written or hand-edited entry.
    if (!Array.isArray(entry.stats?.activity?.chartSeries)) return null;
    memoryCache[key] = { raw, parsed: entry.stats };
    return entry.stats;
  } catch {
    /* ignore malformed cache */
  }
  return null;
}

export function writeWrappedCache(username: string, stats: WrappedStats): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + username.toLowerCase(),
      JSON.stringify({ stats, at: Date.now() }),
    );
  } catch {
    /* ignore quota / private browsing storage failures */
  }
}
