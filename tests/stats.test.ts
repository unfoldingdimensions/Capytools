import { describe, expect, it } from "vitest";
import type { GitHubRepo } from "../src/lib/github/types";
import {
  FIXTURE_NOW,
  fixtureActiveDev,
  fixtureEmptyEvents,
  fixtureLowActivity,
  fixtureOwnerLike,
  fixtureZeroRepoUser,
} from "../src/lib/github/fixtures";
import {
  activityStats,
  computeWrapped,
  languageBreakdown,
  mostRecentlyUpdated,
  oldestRepo,
  topRepo,
  topTopics,
  totalStars,
  yearsActive,
} from "../src/lib/github/stats";
import { extractNextPage } from "../src/lib/github/client";
import { sanitizeUsername } from "../src/lib/utils";
import {
  activityMonthTicks,
  buildSparkline,
  SPARK,
  trimLeadingZeros,
} from "../src/lib/capytools/sparkline";

describe("totalStars", () => {
  it("excludes fork repos and sums stargazers across the rest", () => {
    const { repos } = fixtureActiveDev;
    const expected = repos
      .filter((r) => !r.fork)
      .reduce((sum, r) => sum + r.stargazers_count, 0);
    expect(totalStars(repos)).toBe(expected);
    // sanity: the fixture really does include starred forks
    expect(repos.some((r) => r.fork && r.stargazers_count > 0)).toBe(true);
  });

  it("returns 0 for an empty list", () => {
    expect(totalStars([])).toBe(0);
  });
});

describe("topRepo", () => {
  it("returns the clear winner with its star count", () => {
    const { repos } = fixtureActiveDev;
    const result = topRepo(repos);
    expect(result).toEqual({ name: "capytools", stars: 12000 });
  });

  it("returns null for an empty list", () => {
    expect(topRepo([])).toBeNull();
  });
});

describe("yearsActive", () => {
  it("counts full calendar years since account creation", () => {
    // created 2016-09-13 → anniversary 2026-09-13 is after FIXTURE_NOW
    expect(yearsActive(fixtureActiveDev.user, FIXTURE_NOW)).toBe(9);
  });

  it("returns exactly 1 on the one-year anniversary", () => {
    // created 2025-08-20, exactly one year before FIXTURE_NOW
    expect(yearsActive(fixtureLowActivity.user, FIXTURE_NOW)).toBe(1);
  });

  it("is at least 1 even for accounts younger than a year", () => {
    const youngUser = {
      ...fixtureZeroRepoUser,
      created_at: "2026-07-01T00:00:00Z",
    };
    expect(yearsActive(youngUser, FIXTURE_NOW)).toBe(1);
  });
});

describe("languageBreakdown", () => {
  it("caps at the top 5 languages by repo count", () => {
    const { repos } = fixtureActiveDev;
    const result = languageBreakdown(repos);
    expect(result.length).toBe(5);
    // 45 language-bearing repos (40 own + 5 forks): 11 TS, 9 Python, 8 Rust,
    // 7 Go, 6 JavaScript, 4 C → top five exclude C
    expect(result[0]).toEqual({ name: "TypeScript", percent: 24.4 });
    expect(result.map((l) => l.name)).toEqual([
      "TypeScript",
      "Python",
      "Rust",
      "Go",
      "JavaScript",
    ]);
  });

  it("breaks count ties alphabetically", () => {
    const a = makeRepo("x", "alpha-repo", "Zeta", 0, "2024-01-01T00:00:00Z");
    const b = makeRepo("x", "beta-repo", "Alpha", 0, "2024-01-01T00:00:00Z");
    expect(languageBreakdown([a, b]).map((l) => l.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("keeps percentages summing to ~100 (±0.2)", () => {
    // Only fixtures whose languages all fit in the top-5 cap can sum to ~100:
    // ownerLike has exactly 5 languages, lowActivity has 1.
    for (const fixture of [fixtureOwnerLike, fixtureLowActivity]) {
      const result = languageBreakdown(fixture.repos);
      const sum = result.reduce((s, l) => s + l.percent, 0);
      expect(sum).toBeGreaterThan(99.8);
      expect(sum).toBeLessThan(100.2);
    }
  });

  it("excludes repos without a language", () => {
    const noLang = { ...makeRepo("x", "nl", null, 0, "2024-01-01T00:00:00Z") };
    const withLang = { ...makeRepo("x", "pl", "Ruby", 0, "2024-01-01T00:00:00Z") };
    expect(languageBreakdown([noLang, withLang])).toEqual([{ name: "Ruby", percent: 100 }]);
  });

  it("returns [] for an empty list", () => {
    expect(languageBreakdown([])).toEqual([]);
  });
});

describe("oldestRepo / mostRecentlyUpdated", () => {
  it("oldestRepo returns the earliest-created repo", () => {
    expect(oldestRepo(fixtureActiveDev.repos)).toEqual({
      name: "capytools",
      created_at: "2016-08-01T08:00:00Z",
    });
  });

  it("mostRecentlyUpdated returns the latest-updated repo", () => {
    expect(mostRecentlyUpdated(fixtureActiveDev.repos)).toEqual({
      name: "capytools",
      updated_at: "2026-08-15T10:00:00Z",
    });
  });

  it("excludes forks", () => {
    const { repos } = fixtureActiveDev;
    const oldest = oldestRepo(repos);
    const newest = mostRecentlyUpdated(repos);
    expect(repos.find((r) => r.name === oldest!.name)!.fork).toBe(false);
    expect(repos.find((r) => r.name === newest!.name)!.fork).toBe(false);
  });

  it("returns null for an empty list", () => {
    expect(oldestRepo([])).toBeNull();
    expect(mostRecentlyUpdated([])).toBeNull();
  });
});

describe("topTopics", () => {
  it("orders topics by descending frequency", () => {
    const result = topTopics(fixtureActiveDev.repos);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toBe("developer-tools");
    const counts = new Map<string, number>();
    for (const repo of fixtureActiveDev.repos) {
      for (const topic of repo.topics) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
    for (let i = 1; i < result.length; i++) {
      expect(counts.get(result[i - 1])!).toBeGreaterThanOrEqual(counts.get(result[i])!);
    }
  });

  it("breaks count ties alphabetically", () => {
    const repos = [
      { ...makeRepo("x", "r1", "A", 0, "2024-01-01T00:00:00Z"), topics: ["zeta", "alpha"] },
      { ...makeRepo("x", "r2", "B", 0, "2024-01-01T00:00:00Z"), topics: ["zeta"] },
      { ...makeRepo("x", "r3", "C", 0, "2024-01-01T00:00:00Z"), topics: ["alpha", "beta"] },
    ];
    // alpha ×2, zeta ×2, beta ×1
    expect(topTopics(repos)).toEqual(["alpha", "zeta", "beta"]);
  });

  it("caps at 6 topics", () => {
    const many = [
      { ...makeRepo("x", "r1", "A", 0, "2024-01-01T00:00:00Z"), topics: ["one", "two", "three", "four", "five", "six", "seven"] },
    ];
    // all counts equal → alphabetical
    expect(topTopics(many)).toEqual(["five", "four", "one", "seven", "six", "three"]);
  });

  it("returns [] for an empty list", () => {
    expect(topTopics([])).toEqual([]);
  });
});

describe("activityStats", () => {
  it("returns zeros and a dash weekday for empty events", () => {
    const result = activityStats(fixtureEmptyEvents, FIXTURE_NOW);
    expect(result.windowLabel).toBe("90 days");
    expect(result.count).toBe(0);
    expect(result.busiestWeekday).toBe("—");
    expect(result.dominantEventType).toBe("—");
    expect(result.dailySeries).toHaveLength(90);
    expect(result.dailySeries.every((n) => n === 0)).toBe(true);
  });

  it("counts, buckets and classifies a crafted event set", () => {
    const events = [
      { id: "a", type: "PushEvent", created_at: "2026-08-18T12:00:00Z", repo: { name: "x/r" } },
      { id: "b", type: "PushEvent", created_at: "2026-08-11T12:00:00Z", repo: { name: "x/r" } },
      { id: "c", type: "WatchEvent", created_at: "2026-08-04T12:00:00Z", repo: { name: "x/r" } },
      { id: "d", type: "WatchEvent", created_at: "2026-08-15T12:00:00Z", repo: { name: "x/r" } },
      { id: "e", type: "IssuesEvent", created_at: "2026-07-10T09:00:00Z", repo: { name: "x/r" } },
      { id: "f", type: "CreateEvent", created_at: "2026-06-01T15:30:00Z", repo: { name: "x/r" } },
      { id: "g", type: "ForkEvent", created_at: "2026-05-25T08:00:00Z", repo: { name: "x/r" } },
      // outside the window → excluded
      { id: "h", type: "PushEvent", created_at: "2026-05-20T12:00:00Z", repo: { name: "x/r" } },
    ];
    const result = activityStats(events, FIXTURE_NOW);

    expect(result.count).toBe(7);
    // two events land on Tuesday (Aug 18 & 11), all others one per day
    expect(result.busiestWeekday).toBe("Tuesday");
    expect(result.dominantEventType).toBe("pushes");
    expect(result.dailySeries).toHaveLength(90);
    const day = (iso: string) =>
      Math.floor((Date.parse(iso) - Date.parse("2026-05-22T00:00:00Z")) / 86_400_000);
    expect(result.dailySeries[day("2026-08-18T12:00:00Z")]).toBe(1);
    expect(result.dailySeries[day("2026-08-11T12:00:00Z")]).toBe(1);
    expect(result.dailySeries[day("2026-08-04T12:00:00Z")]).toBe(1);
    expect(result.dailySeries[day("2026-08-15T12:00:00Z")]).toBe(1);
    expect(result.dailySeries[day("2026-07-10T09:00:00Z")]).toBe(1);
    expect(result.dailySeries[day("2026-06-01T15:30:00Z")]).toBe(1);
    expect(result.dailySeries[day("2026-05-25T08:00:00Z")]).toBe(1);
    // the out-of-window event contributes nothing
    expect(result.dailySeries.reduce((s, n) => s + n, 0)).toBe(result.count);
  });

  it("pretty-prints the PushEvent case and handles unknown types", () => {
    const dominant = activityStats(
      [
        { id: "a", type: "PushEvent", created_at: "2026-08-01T12:00:00Z", repo: { name: "x/r" } },
        { id: "b", type: "PushEvent", created_at: "2026-08-02T12:00:00Z", repo: { name: "x/r" } },
        { id: "c", type: "GollumEvent", created_at: "2026-08-03T12:00:00Z", repo: { name: "x/r" } },
      ],
      FIXTURE_NOW,
    );
    expect(dominant.dominantEventType).toBe("pushes");

    const unknown = activityStats(
      [{ id: "d", type: "GollumEvent", created_at: "2026-08-04T12:00:00Z", repo: { name: "x/r" } }],
      FIXTURE_NOW,
    );
    expect(unknown.dominantEventType).toBe("gollum");
  });
});

describe("computeWrapped", () => {
  it("assembles a complete, consistent snapshot from the owner-like fixture", () => {
    const result = computeWrapped(fixtureOwnerLike.user, fixtureOwnerLike.repos, fixtureOwnerLike.events, FIXTURE_NOW);

    expect(result.username).toBe("cappyowner");
    expect(result.displayName).toBe("Cappy Owner");
    expect(result.avatarUrl).toBe(fixtureOwnerLike.user.avatar_url);
    expect(result.profileUrl).toBe("https://github.com/cappyowner");
    expect(result.totalRepos).toBe(fixtureOwnerLike.repos.length);
    expect(result.totalStars).toBeGreaterThan(0);
    expect(result.topRepo).toEqual({ name: "owner-tools", stars: 890 });
    expect(result.yearsActive).toBeGreaterThanOrEqual(1);
    expect(result.topLanguages.length).toBeLessThanOrEqual(5);
    const languageSum = result.topLanguages.reduce((s, l) => s + l.percent, 0);
    expect(languageSum).toBeGreaterThan(99.8);
    expect(languageSum).toBeLessThan(100.2);
    expect(result.oldestRepo).not.toBeNull();
    expect(result.mostRecentlyUpdated).not.toBeNull();
    expect(result.topTopics.length).toBeLessThanOrEqual(6);
    expect(result.activity.windowLabel).toBe("90 days");
    expect(result.activity.count).toBeGreaterThan(0);
    expect(result.activity.busiestWeekday).not.toBe("—");
    expect(result.activity.dominantEventType).not.toBe("—");
    expect(result.activity.dailySeries).toHaveLength(90);
    expect(result.activity.dailySeries.reduce((s, n) => s + n, 0)).toBe(result.activity.count);
  });

  it("handles an account with zero repos and zero events", () => {
    const result = computeWrapped(fixtureZeroRepoUser, [], fixtureEmptyEvents, FIXTURE_NOW);
    expect(result.username).toBe("cappynobody");
    expect(result.totalRepos).toBe(0);
    expect(result.totalStars).toBe(0);
    expect(result.topRepo).toBeNull();
    expect(result.topLanguages).toEqual([]);
    expect(result.oldestRepo).toBeNull();
    expect(result.mostRecentlyUpdated).toBeNull();
    expect(result.topTopics).toEqual([]);
    expect(result.activity.count).toBe(0);
    expect(result.activity.busiestWeekday).toBe("—");
  });
});

describe("extractNextPage", () => {
  it("parses a real GitHub-style Link header with multiple rels", () => {
    const link =
      '<https://api.github.com/user/repos?page=3&per_page=100>; rel="prev", ' +
      '<https://api.github.com/user/repos?page=5&per_page=100>; rel="last", ' +
      '<https://api.github.com/user/repos?page=4&per_page=100>; rel="next"';
    expect(extractNextPage(link)).toBe("https://api.github.com/user/repos?page=4&per_page=100");
  });

  it("returns null for a null or header without next", () => {
    expect(extractNextPage(null)).toBeNull();
    expect(extractNextPage('<https://api.github.com/user/repos?page=1&per_page=100>; rel="first"')).toBeNull();
  });
});

describe("sanitizeUsername", () => {
  it("trims whitespace and strips leading @", () => {
    expect(sanitizeUsername("  @torvalds  ")).toBe("torvalds");
    expect(sanitizeUsername("@@octocat")).toBe("octocat");
  });

  it("extracts username from full github URLs", () => {
    expect(sanitizeUsername("https://github.com/torvalds")).toBe("torvalds");
    expect(sanitizeUsername("http://github.com/unfoldingdimensions/")).toBe("unfoldingdimensions");
    expect(sanitizeUsername("github.com/mojombo?tab=repositories")).toBe("mojombo");
  });

  it("handles plain usernames untouched", () => {
    expect(sanitizeUsername("cappydev")).toBe("cappydev");
  });
});

describe("activityStats edge boundaries", () => {
  it("retains events occurring at the exact current timestamp (now) in the last dailySeries bucket", () => {
    const eventAtNow = {
      id: "now-evt",
      type: "PushEvent",
      created_at: FIXTURE_NOW.toISOString(),
      repo: { name: "x/r" },
    };
    const result = activityStats([eventAtNow], FIXTURE_NOW);
    expect(result.count).toBe(1);
    expect(result.dailySeries[89]).toBe(1);
    expect(result.dailySeries.reduce((s, n) => s + n, 0)).toBe(1);
  });
});

describe("buildSparkline", () => {
  it("positions the peak node at the peak day coordinates", () => {
    const data = [0, 2, 10, 4, 1];
    const result = buildSparkline(data, 100, 50);
    // Peak is at index 2 (value 10).
    // x at index 2 should be (2/4)*100 = 50.
    expect(result.peakX).toBe(50);
    expect(result.zero).toBe(false);
  });

  it("insets the ends so a first/last peak marker is not clipped", () => {
    // The exported <img> clips, unlike the preview SVG, so an end-of-series
    // peak must sit at least a halo radius inside the box.
    const last = buildSparkline([1, 1, 9], 100, 50);
    expect(last.peakX).toBeLessThanOrEqual(100 - SPARK.halo);
    const first = buildSparkline([9, 1, 1], 100, 50);
    expect(first.peakX).toBeGreaterThanOrEqual(SPARK.halo);
  });

  it("keeps the curve inside the plot band even after a flat run", () => {
    const { linePath } = buildSparkline([0, 0, 0, 0, 0, 40, 0, 0], 100, 50);
    // Every odd-indexed number in the path data is a y coordinate.
    const nums = linePath.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    // padTop = 7, baseline = 45: no control point may overshoot either edge.
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...ys)).toBeLessThanOrEqual(45);
  });
});

describe("activityMonthTicks", () => {
  const now = new Date("2026-08-20T00:00:00Z");

  it("labels the month the window opens in, not just the boundaries inside it", () => {
    // 32-day window opens Jul 19: without the opening label this reads as "AUG" only.
    const ticks = activityMonthTicks(now, 32);
    expect(ticks.map((t) => t.label)).toEqual(["JUL", "AUG"]);
    expect(ticks[0].x).toBe(0);
    expect(ticks[1].x).toBeCloseTo(13 / 32, 3);
  });

  it("emits a single label for a window that never crosses a month", () => {
    expect(activityMonthTicks(now, 10).map((t) => t.label)).toEqual(["AUG"]);
  });

  it("does not double-label when the window opens on the 1st", () => {
    const ticks = activityMonthTicks(new Date("2026-08-31T00:00:00Z"), 30);
    expect(ticks.map((t) => t.label)).toEqual(["AUG"]);
    expect(ticks[0].x).toBe(0);
  });
});

describe("trimLeadingZeros", () => {
  it("leaves an all-zero series untouched", () => {
    const data = new Array(90).fill(0);
    expect(trimLeadingZeros(data)).toEqual({ data, days: 90 });
  });

  it("drops the dead lead-in but keeps one zero as a baseline anchor", () => {
    expect(trimLeadingZeros([0, 0, 0, 5, 0, 2])).toEqual({ data: [0, 5, 0, 2], days: 4 });
  });

  it("is a no-op when the series starts hot", () => {
    expect(trimLeadingZeros([3, 0, 1])).toEqual({ data: [3, 0, 1], days: 3 });
  });
});

// --- helpers ---------------------------------------------------------------

function makeRepo(
  owner: string,
  name: string,
  language: string | null,
  stars: number,
  createdAt: string,
): GitHubRepo {
  return {
    name,
    full_name: `${owner}/${name}`,
    html_url: `https://github.com/${owner}/${name}`,
    description: null,
    language,
    stargazers_count: stars,
    fork: false,
    topics: [],
    created_at: createdAt,
    updated_at: createdAt,
    pushed_at: createdAt,
  };
}
