export interface GitHubUser {
  login: string; name: string | null; avatar_url: string;
  html_url: string; created_at: string; public_repos: number; followers: number;
}
export interface GitHubRepo {
  name: string; full_name: string; html_url: string; description: string | null;
  language: string | null; stargazers_count: number; fork: boolean;
  topics: string[]; created_at: string; updated_at: string; pushed_at: string;
}
export interface GitHubEvent {
  id: string; type: string; created_at: string; repo: { name: string };
}
export type LanguageShare = { name: string; percent: number };
export interface WrappedStats {
  username: string; displayName: string | null; avatarUrl: string; profileUrl: string;
  totalStars: number; topRepo: { name: string; stars: number } | null;
  totalRepos: number; yearsActive: number;                 // >= 1
  topLanguages: LanguageShare[];                            // top 5, percent rounded to 1 dp, sum ~ 100
  oldestRepo: { name: string; created_at: string } | null;
  mostRecentlyUpdated: { name: string; updated_at: string } | null;
  topTopics: string[];                                      // max 6, most common first
  activity: {
    windowLabel: string;                                    // "12 months" | "5 months" | "23 days"
    count: number;                                          // contributions/events in window
    busiestWeekday: string;                                 // "Monday".."Sunday" (UTC), null-ish → "—" if no events
    dominantEventType: string;                              // e.g. "PushEvent" → pretty "pushes"
    dailySeries: number[];                                  // events path: length 90, index 0 = oldest day
    chartSeries: number[];                                  // exactly what the sparkline draws
    monthTicks: { label: string; x: number }[];             // month labels, x = 0..1 across chartSeries
    empty: boolean;                                         // no activity in the last 12 months
    peak: { value: number; label: string } | null;          // busiest plotted point, for the guide line
  };
}
export class GithubError extends Error {
  kind: "not_found" | "rate_limited" | "network" | "empty";
  constructor(kind: GithubError["kind"], message: string) {
    super(message);
    this.name = "GithubError";
    this.kind = kind;
  }
}
