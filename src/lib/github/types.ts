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
    windowLabel: "last 90 days";
    count: number;                                          // events in window
    busiestWeekday: string;                                 // "Monday".."Sunday" (UTC), null-ish → "—" if no events
    dominantEventType: string;                              // e.g. "PushEvent" → pretty "pushes"
    dailySeries: number[];                                  // length 90, index 0 = oldest day
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
