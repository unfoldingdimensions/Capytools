import type {
  GitHubEvent,
  GitHubRepo,
  GitHubUser,
  LanguageShare,
  WrappedStats,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  PushEvent: "pushes",
  PullRequestEvent: "pull requests",
  IssuesEvent: "issues",
  CreateEvent: "repos created",
  WatchEvent: "stars",
  ForkEvent: "forks",
};

function prettyEventType(type: string): string {
  const label = EVENT_TYPE_LABELS[type];
  if (label !== undefined) return label;
  return type.replace(/Event$/, "").toLowerCase() || type.toLowerCase();
}

export function totalStars(repos: GitHubRepo[]): number {
  return repos.reduce((sum, repo) => (repo.fork ? sum : sum + repo.stargazers_count), 0);
}

export function topRepo(repos: GitHubRepo[]): { name: string; stars: number } | null {
  if (repos.length === 0) return null;
  const best = [...repos].sort(
    (a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
  )[0];
  return { name: best.name, stars: best.stargazers_count };
}

/**
 * Full calendar years since the account was created (anniversary-based, so the
 * "exact boundary" case is deterministic), minimum 1.
 */
export function yearsActive(user: GitHubUser, now: Date = new Date()): number {
  const created = new Date(user.created_at);
  if (Number.isNaN(created.getTime())) return 1;
  let years = now.getUTCFullYear() - created.getUTCFullYear();
  const anniversary = new Date(
    Date.UTC(now.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()),
  );
  if (now.getTime() < anniversary.getTime()) years -= 1;
  return Math.max(1, years);
}

export function languageBreakdown(repos: GitHubRepo[]): LanguageShare[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.language === null) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, count]) => ({ name, percent: Math.round((count / total) * 1000) / 10 }));
}

export function oldestRepo(repos: GitHubRepo[]): { name: string; created_at: string } | null {
  const candidates = repos.filter((repo) => !repo.fork);
  if (candidates.length === 0) return null;
  const oldest = candidates
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
        a.name.localeCompare(b.name),
    )[0];
  return { name: oldest.name, created_at: oldest.created_at };
}

export function mostRecentlyUpdated(
  repos: GitHubRepo[],
): { name: string; updated_at: string } | null {
  const candidates = repos.filter((repo) => !repo.fork);
  if (candidates.length === 0) return null;
  const newest = candidates
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() ||
        a.name.localeCompare(b.name),
    )[0];
  return { name: newest.name, updated_at: newest.updated_at };
}

export function topTopics(repos: GitHubRepo[]): string[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    for (const topic of repo.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([topic]) => topic);
}

export function activityStats(
  events: GitHubEvent[],
  now: Date = new Date(),
): WrappedStats["activity"] {
  const cutoffMs = now.getTime() - WINDOW_DAYS * DAY_MS;
  const inWindow = events.filter((e) => new Date(e.created_at).getTime() >= cutoffMs);

  const dailySeries = new Array<number>(WINDOW_DAYS).fill(0);
  const weekdayCounts = new Array<number>(7).fill(0);
  const typeCounts = new Map<string, number>();

  for (const event of inWindow) {
    const time = new Date(event.created_at).getTime();
    // Window-anchored buckets: index 0 covers [now - 90d, now - 90d + 1d).
    const dayIndex = Math.floor((time - cutoffMs) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < WINDOW_DAYS) dailySeries[dayIndex] += 1;
    weekdayCounts[new Date(event.created_at).getUTCDay()] += 1;
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
  }

  // Strictly-greater keeps the first max, i.e. Sunday-first tie-breaking.
  let busiestWeekdayIndex = -1;
  let busiestWeekdayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (weekdayCounts[i] > busiestWeekdayCount) {
      busiestWeekdayIndex = i;
      busiestWeekdayCount = weekdayCounts[i];
    }
  }

  const dominantType = [...typeCounts.entries()].sort(
    (a, b) => b[1] - a[1] || prettyEventType(a[0]).localeCompare(prettyEventType(b[0])),
  )[0]?.[0];

  return {
    windowLabel: "last 90 days",
    count: inWindow.length,
    busiestWeekday: busiestWeekdayIndex >= 0 ? WEEKDAYS[busiestWeekdayIndex] : "—",
    dominantEventType: dominantType === undefined ? "—" : prettyEventType(dominantType),
    dailySeries,
  };
}

export function computeWrapped(
  user: GitHubUser,
  repos: GitHubRepo[],
  events: GitHubEvent[],
  now: Date = new Date(),
): WrappedStats {
  return {
    username: user.login,
    displayName: user.name,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url,
    totalStars: totalStars(repos),
    topRepo: topRepo(repos),
    totalRepos: repos.length,
    yearsActive: yearsActive(user, now),
    topLanguages: languageBreakdown(repos),
    oldestRepo: oldestRepo(repos),
    mostRecentlyUpdated: mostRecentlyUpdated(repos),
    topTopics: topTopics(repos),
    activity: activityStats(events, now),
  };
}
