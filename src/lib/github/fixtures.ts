import type { GitHubEvent, GitHubRepo, GitHubUser } from "./types";

/**
 * Fixed reference timestamp so fixture dates and all tests are deterministic.
 * The 90-day window is [2026-05-22T00:00:00Z, 2026-08-20T00:00:00Z].
 */
export const FIXTURE_NOW = new Date("2026-08-20T00:00:00Z");

const EVENT_TYPES = [
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "CreateEvent",
  "WatchEvent",
  "ForkEvent",
  "DeleteEvent",
];

function isoDate(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(Date.UTC(year, month, day, hour, minute, 0)).toISOString();
}

interface RepoOptions {
  fork?: boolean;
  topics?: string[];
  updatedAt?: string;
}

function makeRepo(
  owner: string,
  name: string,
  language: string | null,
  stars: number,
  createdAt: string,
  options: RepoOptions = {},
): GitHubRepo {
  const updatedAt = options.updatedAt ?? createdAt;
  return {
    name,
    full_name: `${owner}/${name}`,
    html_url: `https://github.com/${owner}/${name}`,
    description: `${name} — ${language ?? "misc utility"}`,
    language,
    stargazers_count: stars,
    fork: options.fork ?? false,
    topics: options.topics ?? [],
    created_at: createdAt,
    updated_at: updatedAt,
    pushed_at: updatedAt,
  };
}

/**
 * Deterministic event generator: `perDay` events per day starting 2026-05-25,
 * 3h apart, cycling through `types`. Stays inside the 90-day window for counts
 * up to perDay * 86.
 */
function generateEvents(
  owner: string,
  count: number,
  types: string[],
  repos: GitHubRepo[],
): GitHubEvent[] {
  const events: GitHubEvent[] = [];
  const perDay = types.length;
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / perDay);
    const hour = (i % perDay) * 3;
    events.push({
      id: `evt-${i}`,
      type: types[i % types.length],
      created_at: isoDate(2026, 4, 25 + dayOffset, hour),
      repo: { name: repos[i % repos.length].full_name },
    });
  }
  return events;
}

// ---------------------------------------------------------------------------
// fixtureActiveDev — prolific dev, ~9 years old, 45 repos (40 own + 5 forks),
// 6 languages, one clear ~12k-star top repo, 600 events.
// ---------------------------------------------------------------------------

function activeRepo(
  name: string,
  language: string | null,
  stars: number,
  createdAt: string,
  topics: string[] = [],
  fork = false,
): GitHubRepo {
  return makeRepo("cappydev", name, language, stars, createdAt, {
    topics,
    fork,
    updatedAt: name === "capytools" ? "2026-08-15T10:00:00Z" : "2026-06-01T12:00:00Z",
  });
}

const ACTIVE_REPOS: GitHubRepo[] = [
  // TypeScript (10)
  activeRepo("capytools", "TypeScript", 12000, "2016-08-01T08:00:00Z", ["privacy", "developer-tools", "cli"]),
  activeRepo("renderkit", "TypeScript", 4300, "2017-03-14T10:00:00Z", ["developer-tools", "react", "web"]),
  activeRepo("typecli", "TypeScript", 980, "2018-07-22T11:00:00Z", ["cli", "developer-tools"]),
  activeRepo("formstate", "TypeScript", 620, "2019-01-08T09:00:00Z", ["react", "web"]),
  activeRepo("bundlex", "TypeScript", 350, "2019-09-30T14:00:00Z", ["developer-tools", "tooling"]),
  activeRepo("apiclient", "TypeScript", 210, "2020-02-11T08:00:00Z", ["developer-tools", "sdk"]),
  activeRepo("codegen", "TypeScript", 120, "2020-11-05T16:00:00Z", ["developer-tools", "cli"]),
  activeRepo("tskit", "TypeScript", 85, "2021-04-18T10:00:00Z", ["privacy", "security"]),
  activeRepo("dataflow-ts", "TypeScript", 64, "2021-10-02T09:00:00Z", ["data", "automation"]),
  activeRepo("notch", "TypeScript", 41, "2022-06-15T12:00:00Z", ["privacy"]),
  // Python (8)
  activeRepo("mlforge", "Python", 2200, "2016-11-20T10:00:00Z", ["ai", "machine-learning", "data"]),
  activeRepo("pydata", "Python", 1500, "2017-05-09T08:00:00Z", ["data", "automation"]),
  activeRepo("scriptz", "Python", 500, "2018-08-27T13:00:00Z", ["automation", "cli"]),
  activeRepo("pykit", "Python", 180, "2019-12-01T09:00:00Z", ["privacy"]),
  activeRepo("autograde", "Python", 95, "2020-07-19T11:00:00Z", ["developer-tools", "education"]),
  activeRepo("netwatch", "Python", 52, "2021-03-03T08:00:00Z", ["security", "automation"]),
  activeRepo("pyfmt", "Python", 30, "2022-01-25T15:00:00Z", ["developer-tools"]),
  activeRepo("beampy", "Python", 15, "2022-09-10T10:00:00Z"),
  // Rust (7)
  activeRepo("rustcore", "Rust", 1100, "2017-08-01T09:00:00Z", ["rust", "developer-tools"]),
  activeRepo("crabc", "Rust", 400, "2018-04-14T12:00:00Z", ["rust"]),
  activeRepo("sysrs", "Rust", 240, "2019-02-22T10:00:00Z", ["rust", "security"]),
  activeRepo("ironline", "Rust", 130, "2020-05-30T14:00:00Z", ["rust", "cli"]),
  activeRepo("cratescan", "Rust", 70, "2021-07-11T08:00:00Z", ["rust", "developer-tools"]),
  activeRepo("rustfmt2", "Rust", 22, "2022-03-08T11:00:00Z", ["rust"]),
  activeRepo("minirust", "Rust", 9, "2023-01-17T09:00:00Z"),
  // Go (6)
  activeRepo("gocore", "Go", 760, "2018-01-12T10:00:00Z", ["go", "developer-tools"]),
  activeRepo("gonet", "Go", 290, "2018-10-08T08:00:00Z", ["go", "web"]),
  activeRepo("gobench", "Go", 160, "2019-06-21T13:00:00Z", ["go", "automation"]),
  activeRepo("gocloud", "Go", 88, "2020-09-14T09:00:00Z", ["go", "developer-tools"]),
  activeRepo("goserve", "Go", 45, "2021-12-05T15:00:00Z", ["go"]),
  activeRepo("gotool", "Go", 11, "2023-04-02T10:00:00Z"),
  // JavaScript (5)
  activeRepo("jstool", "JavaScript", 520, "2017-11-11T08:00:00Z", ["javascript", "developer-tools"]),
  activeRepo("jswatch", "JavaScript", 300, "2019-04-19T09:00:00Z", ["web"]),
  activeRepo("jsmini", "JavaScript", 140, "2020-08-06T12:00:00Z", ["privacy"]),
  activeRepo("jspack", "JavaScript", 66, "2021-09-23T10:00:00Z", ["developer-tools"]),
  activeRepo("jsext", "JavaScript", 18, "2023-06-11T14:00:00Z"),
  // C (4)
  activeRepo("cembed", "C", 380, "2018-06-27T09:00:00Z", ["c", "automation"]),
  activeRepo("ckernel", "C", 170, "2019-08-15T11:00:00Z", ["c", "security"]),
  activeRepo("cdriver", "C", 55, "2020-12-20T08:00:00Z", ["c"]),
  activeRepo("cmicro", "C", 6, "2022-11-09T13:00:00Z"),
  // Forks (5) — starred forks must not count toward totalStars
  activeRepo("fork-ts", "TypeScript", 320, "2022-05-14T10:00:00Z", [], true),
  activeRepo("fork-py", "Python", 150, "2023-02-28T09:00:00Z", [], true),
  activeRepo("fork-rust", "Rust", 85, "2023-08-19T12:00:00Z", [], true),
  activeRepo("fork-js", "JavaScript", 40, "2024-03-07T10:00:00Z", [], true),
  activeRepo("fork-go", "Go", 12, "2024-09-25T11:00:00Z", [], true),
];

export const fixtureActiveDev: {
  user: GitHubUser;
  repos: GitHubRepo[];
  events: GitHubEvent[];
} = {
  user: {
    login: "cappydev",
    name: "Cappy Dev",
    avatar_url: "https://avatars.githubusercontent.com/u/1234567?v=4",
    html_url: "https://github.com/cappydev",
    created_at: "2016-09-13T09:00:00Z",
    public_repos: 45,
    followers: 1240,
  },
  repos: ACTIVE_REPOS,
  events: generateEvents("cappydev", 600, EVENT_TYPES, ACTIVE_REPOS),
};

// ---------------------------------------------------------------------------
// fixtureOwnerLike — steady maintainer, ~5 years old, 27 repos (25 own + 2
// forks), 5 languages, 200 events.
// ---------------------------------------------------------------------------

function ownerRepo(
  name: string,
  language: string | null,
  stars: number,
  createdAt: string,
  topics: string[] = [],
  fork = false,
): GitHubRepo {
  return makeRepo("cappyowner", name, language, stars, createdAt, {
    topics,
    fork,
    updatedAt: name === "owner-dash" ? "2026-08-10T09:00:00Z" : "2026-05-01T00:00:00Z",
  });
}

const OWNER_REPOS: GitHubRepo[] = [
  // TypeScript (8)
  ownerRepo("owner-tools", "TypeScript", 890, "2020-01-15T08:00:00Z", ["privacy", "developer-tools"]),
  ownerRepo("owner-core", "TypeScript", 420, "2020-06-22T10:00:00Z", ["privacy", "developer-tools"]),
  ownerRepo("owner-cli", "TypeScript", 210, "2020-11-30T09:00:00Z", ["privacy", "cli"]),
  ownerRepo("owner-web", "TypeScript", 130, "2021-04-07T12:00:00Z", ["privacy", "web"]),
  ownerRepo("owner-api", "TypeScript", 75, "2021-09-18T08:00:00Z", ["developer-tools", "docs"]),
  ownerRepo("owner-ui", "TypeScript", 45, "2022-02-14T10:00:00Z", ["web"]),
  ownerRepo("owner-sdk", "TypeScript", 20, "2022-08-26T11:00:00Z", ["developer-tools"]),
  ownerRepo("owner-utils", "TypeScript", 8, "2023-03-09T09:00:00Z", ["docs"]),
  // JavaScript (6 + 1 fork)
  ownerRepo("owner-dash", "JavaScript", 320, "2020-03-25T10:00:00Z", ["cli", "web"]),
  ownerRepo("owner-widget", "JavaScript", 160, "2020-09-11T08:00:00Z", ["cli"]),
  ownerRepo("owner-lib", "JavaScript", 90, "2021-06-02T14:00:00Z", ["web"]),
  ownerRepo("owner-ext", "JavaScript", 35, "2022-01-19T09:00:00Z", ["docs"]),
  ownerRepo("owner-mini", "JavaScript", 12, "2022-12-06T11:00:00Z", ["web"]),
  ownerRepo("owner-snippet", "JavaScript", 5, "2023-08-22T10:00:00Z"),
  ownerRepo("fork-owner-js", "JavaScript", 60, "2023-11-15T09:00:00Z", [], true),
  // Python (5 + 1 fork)
  ownerRepo("owner-ml", "Python", 250, "2021-02-08T10:00:00Z", ["developer-tools", "privacy"]),
  ownerRepo("owner-svc", "Python", 90, "2021-07-30T08:00:00Z", ["automation"]),
  ownerRepo("owner-bot", "Python", 40, "2022-04-13T12:00:00Z", ["cli", "automation"]),
  ownerRepo("owner-script", "Python", 15, "2022-11-02T09:00:00Z", ["automation"]),
  ownerRepo("owner-toolz", "Python", 4, "2023-09-29T10:00:00Z"),
  ownerRepo("fork-owner-py", "Python", 25, "2024-02-20T09:00:00Z", [], true),
  // HTML (4)
  ownerRepo("owner-site", "HTML", 55, "2021-12-14T10:00:00Z", ["web"]),
  ownerRepo("owner-landing", "HTML", 30, "2022-07-21T08:00:00Z"),
  ownerRepo("owner-blog", "HTML", 9, "2023-05-17T11:00:00Z"),
  ownerRepo("owner-about", "HTML", 2, "2024-04-08T10:00:00Z"),
  // CSS (2)
  ownerRepo("owner-theme", "CSS", 18, "2022-10-05T09:00:00Z", ["web"]),
  ownerRepo("owner-style", "CSS", 6, "2023-12-12T10:00:00Z"),
];

export const fixtureOwnerLike: {
  user: GitHubUser;
  repos: GitHubRepo[];
  events: GitHubEvent[];
} = {
  user: {
    login: "cappyowner",
    name: "Cappy Owner",
    avatar_url: "https://avatars.githubusercontent.com/u/7654321?v=4",
    html_url: "https://github.com/cappyowner",
    created_at: "2021-03-10T10:00:00Z",
    public_repos: 27,
    followers: 210,
  },
  repos: OWNER_REPOS,
  events: generateEvents("cappyowner", 200, EVENT_TYPES, OWNER_REPOS),
};

// ---------------------------------------------------------------------------
// fixtureLowActivity — brand-new account (~1 year), 3 repos, 1 language,
// 4 events spread across the window.
// ---------------------------------------------------------------------------

const LOW_REPOS: GitHubRepo[] = [
  makeRepo("cappynew", "shelltool", "Shell", 12, "2025-08-20T09:00:00Z", {
    topics: [],
    updatedAt: "2026-08-01T12:00:00Z",
  }),
  makeRepo("cappynew", "backupz", "Shell", 3, "2025-11-01T10:00:00Z", {
    topics: [],
    updatedAt: "2026-02-01T00:00:00Z",
  }),
  makeRepo("cappynew", "tinybox", "Shell", 1, "2026-03-15T08:00:00Z", {
    topics: [],
    updatedAt: "2026-02-01T00:00:00Z",
  }),
];

const LOW_EVENTS: GitHubEvent[] = [
  { id: "low-1", type: "PushEvent", created_at: "2026-08-18T12:00:00Z", repo: { name: "cappynew/shelltool" } },
  { id: "low-2", type: "WatchEvent", created_at: "2026-07-10T09:00:00Z", repo: { name: "cappynew/shelltool" } },
  { id: "low-3", type: "CreateEvent", created_at: "2026-06-01T15:30:00Z", repo: { name: "cappynew/backupz" } },
  { id: "low-4", type: "PushEvent", created_at: "2026-05-25T08:00:00Z", repo: { name: "cappynew/tinybox" } },
];

export const fixtureLowActivity: {
  user: GitHubUser;
  repos: GitHubRepo[];
  events: GitHubEvent[];
} = {
  user: {
    login: "cappynew",
    name: null,
    avatar_url: "https://avatars.githubusercontent.com/u/9999999?v=4",
    html_url: "https://github.com/cappynew",
    created_at: "2025-08-20T00:00:00Z",
    public_repos: 3,
    followers: 2,
  },
  repos: LOW_REPOS,
  events: LOW_EVENTS,
};

export const fixtureZeroRepoUser: GitHubUser = {
  login: "cappynobody",
  name: null,
  avatar_url: "",
  html_url: "https://github.com/cappynobody",
  created_at: "2024-01-01T00:00:00Z",
  public_repos: 0,
  followers: 0,
};

export const fixtureEmptyEvents: GitHubEvent[] = [];

/**
 * A deterministic 12-month contribution calendar for the demo card, so the
 * landing page exercises the same month-scale chart real users get instead of
 * the sparse 90-day events fallback. Shaped by a fixed formula — no RNG — so
 * the server and client renders agree (see CardArt's hydration note).
 */
export const fixtureContributions: { date: string; count: number }[] = (() => {
  const days: { date: string; count: number }[] = [];
  const DAY = 24 * 60 * 60 * 1000;
  // Integer-only shaping: Math.sin is implementation-defined in ECMAScript, and
  // a float that differs by one ULP between the server and browser engines
  // would surface as a hydration mismatch in the chart's coordinates.
  const SWELL = [4, 5, 7, 9, 11, 12, 10, 8, 6, 5, 7, 9, 11];
  for (let i = 368; i >= 0; i--) {
    const d = new Date(FIXTURE_NOW.getTime() - i * DAY);
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const base = SWELL[Math.floor(((368 - i) / 369) * SWELL.length)];
    const jitter = ((i * 7919) % 5) - 2; // deterministic ±2
    days.push({
      date: d.toISOString().slice(0, 10),
      count: Math.max(0, (weekend ? 1 : base) + jitter),
    });
  }
  return days;
})();
