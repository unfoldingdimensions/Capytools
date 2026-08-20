import { fetchJSON, GITHUB_API_BASE } from "./client";
import { getRepos } from "./user";
import { GithubError } from "./types";
import type { LanguageShare } from "./types";
import { sanitizeUsername } from "@/lib/utils";

/**
 * Repos to sample, largest first. GitHub's own language bar is bytes of code,
 * so the biggest repositories dominate the result — sampling the largest keeps
 * the numbers honest while bounding the API cost for accounts with hundreds of
 * repos. Every repo is included for anyone below this many.
 */
const MAX_REPOS = 40;
/**
 * Concurrent /languages requests. Raised from 8 because the round count, not
 * the request count, is what a social crawler waits on: 40 repos is now 2
 * rounds instead of 5.
 */
const BATCH = 20;

/**
 * Byte totals per language → top-5 shares.
 *
 * This is what GitHub actually shows. Counting repos by their PRIMARY language
 * instead (the old approach) badly distorts the picture: five small scripts
 * outrank one large application, and every secondary language in a repo
 * disappears entirely.
 */
export function sharesFromBytes(bytes: Record<string, number>): LanguageShare[] {
  const total = Object.values(bytes).reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];
  return Object.entries(bytes)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, n]) => ({ name, percent: Math.round((n / total) * 1000) / 10 }));
}

/**
 * Sum `/repos/{owner}/{repo}/languages` across a user's own repositories.
 *
 * Server-side only: this costs one request per repo, which would eat a
 * visitor's whole unauthenticated hourly allowance. A repo whose lookup fails
 * is skipped rather than failing the batch, so a partial rate-limit still
 * yields usable numbers.
 */
export async function fetchLanguageShares(username: string): Promise<LanguageShare[]> {
  const clean = sanitizeUsername(username);
  const repos = (await getRepos(clean))
    .filter((repo) => !repo.fork)
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, MAX_REPOS);

  const bytes: Record<string, number> = {};
  for (let i = 0; i < repos.length; i += BATCH) {
    const slice = repos.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map((repo) =>
        fetchJSON<Record<string, number>>(
          `${GITHUB_API_BASE}/repos/${repo.full_name}/languages`,
        ).catch(() => null),
      ),
    );
    for (const result of results) {
      if (!result) continue;
      for (const [lang, n] of Object.entries(result)) {
        bytes[lang] = (bytes[lang] ?? 0) + n;
      }
    }
  }
  return sharesFromBytes(bytes);
}

/** Fetch byte-based language shares via our proxy route (client-side). */
export async function getLanguages(username: string): Promise<LanguageShare[]> {
  const clean = sanitizeUsername(username);
  const res = await fetch(`/api/languages/${encodeURIComponent(clean)}`);
  if (res.status === 404) throw new GithubError("not_found", `No such user: ${clean}`);
  if (!res.ok) throw new GithubError("network", `Language lookup failed (${res.status})`);
  const body = (await res.json()) as { languages?: LanguageShare[] };
  return body.languages ?? [];
}
