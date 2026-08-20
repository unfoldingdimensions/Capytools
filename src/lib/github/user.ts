import { fetchJSON, fetchPage, GITHUB_API_BASE } from "./client";
import type { GitHubEvent, GitHubRepo, GitHubUser } from "./types";
import { sanitizeUsername } from "@/lib/utils";

const REPOS_PER_PAGE = 100;
const MAX_REPO_PAGES = 10; // hard cap: 1000 repos
const PAGE_CONCURRENCY = 5; // parallel page fetches; modest, to stay clear of abuse limits
const EVENTS_PER_PAGE = 100;
const MAX_EVENT_PAGES = 5;
const EVENT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function getUser(username: string): Promise<GitHubUser> {
  const clean = sanitizeUsername(username);
  return fetchJSON<GitHubUser>(
    `${GITHUB_API_BASE}/users/${encodeURIComponent(clean)}`,
  );
}

/**
 * All of a user's repos.
 *
 * Page 1 is fetched first to learn the page count from the Link header, then
 * the remainder go out in parallel batches. Walking `next` sequentially cost
 * one round-trip per 100 repos, so an account with a thousand of them spent ten
 * serial requests before anything else could start — which is what made the
 * language and OG routes slow enough to risk a crawler timing out.
 */
export async function getRepos(username: string): Promise<GitHubRepo[]> {
  const clean = sanitizeUsername(username);
  const pageUrl = (page: number) =>
    `${GITHUB_API_BASE}/users/${encodeURIComponent(clean)}/repos` +
    `?per_page=${REPOS_PER_PAGE}&page=${page}`;

  const first = await fetchPage<GitHubRepo[]>(pageUrl(1));
  const repos: GitHubRepo[] = [...first.data];
  const lastPage = Math.min(first.lastPage ?? 1, MAX_REPO_PAGES);

  for (let page = 2; page <= lastPage; page += PAGE_CONCURRENCY) {
    const batch = [];
    for (let i = page; i < Math.min(page + PAGE_CONCURRENCY, lastPage + 1); i++) {
      batch.push(fetchPage<GitHubRepo[]>(pageUrl(i)).catch(() => null));
    }
    for (const result of await Promise.all(batch)) {
      if (result) repos.push(...result.data);
    }
  }
  repos.sort(
    (a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
  );
  return repos;
}

/**
 * Fetch public events, newest-first. Pages are pulled until the oldest event on
 * a page falls outside the 90-day window (or 5 pages are collected), then the
 * result is filtered to the window. An empty array is returned when even the
 * first page is already older than the window.
 */
export async function getEvents(
  username: string,
  now: Date = new Date(),
): Promise<GitHubEvent[]> {
  const clean = sanitizeUsername(username);
  const cutoffMs = now.getTime() - EVENT_WINDOW_MS;
  const events: GitHubEvent[] = [];

  for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
    const url =
      `${GITHUB_API_BASE}/users/${encodeURIComponent(clean)}/events/public` +
      `?per_page=${EVENTS_PER_PAGE}&page=${page}`;
    const { data, next } = await fetchPage<GitHubEvent[]>(url);
    if (data.length === 0) break;

    // GitHub returns pages newest-first; the last item is the oldest on the page.
    const oldestOnPage = new Date(data[data.length - 1].created_at).getTime();
    if (oldestOnPage < cutoffMs) {
      events.push(...data.filter((e) => new Date(e.created_at).getTime() >= cutoffMs));
      break;
    }
    events.push(...data);
    if (next === null) break;
  }

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return events;
}
