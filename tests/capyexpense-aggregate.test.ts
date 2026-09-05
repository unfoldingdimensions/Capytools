import { describe, expect, it } from "vitest";
import {
  ANNUAL_FACTOR,
  buildDashboard,
  byCategory,
  cashOf,
  cumulative,
  dailyTotals,
  needVsWant,
  nextDue,
  noSpendStats,
  spendOf,
  subscriptions,
  totals,
} from "../src/lib/capyexpense/aggregate";
import { resolveRange } from "../src/lib/capyexpense/bucket";
import type { RangeState } from "../src/lib/capyexpense/bucket";
import type { Interval, IsoDate, Transaction } from "../src/lib/capyexpense/types";

let seq = 0;
const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: `f#Sep#${++seq}`,
  date: "2026-09-03",
  category: "groceries",
  type: "one-time",
  kind: "expense",
  amount: 10,
  note: "",
  paymentMethod: null,
  account: null,
  needWant: null,
  interval: null,
  currency: "GBP",
  source: { file: "f.xlsx", sheet: "Sep", row: 2 },
  extra: {},
  ...over,
});

const range = (preset: RangeState["preset"], anchor: IsoDate) =>
  resolveRange({ preset, anchor }, { weekStart: 1 });

describe("spendOf / cashOf", () => {
  it("scores a refund as negative spend but income as no spend at all", () => {
    expect(spendOf(tx({ kind: "expense", amount: 50 }))).toBe(50);
    expect(spendOf(tx({ kind: "refund", amount: 20 }))).toBe(-20);
    expect(spendOf(tx({ kind: "income", amount: 900 }))).toBe(0);
  });

  it("scores cash flow with money out negative", () => {
    expect(cashOf(tx({ kind: "expense", amount: 50 }))).toBe(-50);
    expect(cashOf(tx({ kind: "refund", amount: 20 }))).toBe(20);
    expect(cashOf(tx({ kind: "income", amount: 900 }))).toBe(900);
  });
});

describe("totals", () => {
  it("lets a refund reduce spend, and keeps income out of it", () => {
    const t = totals([
      tx({ kind: "expense", amount: 100 }),
      tx({ kind: "refund", amount: 30 }),
      tx({ kind: "income", amount: 2000 }),
    ]);
    expect(t.spend).toBe(70);
    expect(t.refunds).toBe(30);
    expect(t.income).toBe(2000);
    expect(t.net).toBe(1930);
    expect(t.count).toBe(3);
  });

  it("is all zeroes on an empty ledger, never NaN", () => {
    const t = totals([]);
    expect([t.spend, t.refunds, t.income, t.net, t.count]).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("byCategory", () => {
  it("ranks by spend and shares sum to exactly one", () => {
    const slices = byCategory([
      tx({ category: "rent", amount: 600 }),
      tx({ category: "groceries", amount: 300 }),
      tx({ category: "groceries", amount: 100 }),
    ]);
    expect(slices.map((s) => s.key)).toEqual(["rent", "groceries"]);
    expect(slices[1].count).toBe(2);
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 9);
  });

  it("nets a refund against its own category", () => {
    const slices = byCategory([
      tx({ category: "shopping", amount: 100 }),
      tx({ category: "shopping", kind: "refund", amount: 40 }),
    ]);
    expect(slices[0].value).toBe(60);
  });

  it("gives a category that nets negative a zero share rather than a backwards wedge", () => {
    const slices = byCategory([
      tx({ category: "rent", amount: 500 }),
      tx({ category: "shopping", amount: 20 }),
      tx({ category: "shopping", kind: "refund", amount: 90 }),
    ]);
    const shopping = slices.find((s) => s.key === "shopping")!;
    expect(shopping.value).toBe(-70);
    expect(shopping.share).toBe(0);
    expect(slices.find((s) => s.key === "rent")!.share).toBe(1);
  });

  it("names the blank category rather than dropping it", () => {
    expect(byCategory([tx({ category: "  " })])[0].key).toBe("uncategorised");
  });

  it("is empty, not divided by zero, with no rows", () => {
    expect(byCategory([])).toEqual([]);
  });
});

describe("needVsWant", () => {
  it("always returns all three slots, even when unused", () => {
    const r = needVsWant([tx({ needWant: "need", amount: 40 })]);
    expect(r.need.value).toBe(40);
    expect(r.want.value).toBe(0);
    expect(r.unknown.value).toBe(0);
  });

  it("collects unlabelled rows under unsorted", () => {
    expect(needVsWant([tx({ needWant: null, amount: 15 })]).unknown.value).toBe(15);
  });
});

describe("dailyTotals / cumulative", () => {
  it("is dense — a quiet day is a zero, not a missing entry", () => {
    const d = dailyTotals([tx({ date: "2026-09-01", amount: 5 }), tx({ date: "2026-09-04", amount: 7 })], "2026-09-01", 5);
    expect(d).toEqual([5, 0, 0, 7, 0]);
  });

  it("accumulates as a step function", () => {
    expect(cumulative([5, 0, 0, 7, 0])).toEqual([5, 5, 5, 12, 12]);
  });

  it("returns nothing for a zero-length window", () => {
    expect(dailyTotals([tx()], "2026-09-01", 0)).toEqual([]);
  });
});

describe("noSpendStats", () => {
  it("counts quiet days and the longest run, with its dates", () => {
    const rows = [tx({ date: "2026-09-01", amount: 5 }), tx({ date: "2026-09-06", amount: 7 })];
    const s = noSpendStats(rows, "2026-09-01", 7);
    expect(s.days).toBe(5);
    expect(s.outOf).toBe(7);
    expect(s.longestRun).toBe(4);
    expect(s.longestRunStart).toBe("2026-09-02");
    expect(s.longestRunEnd).toBe("2026-09-05");
  });

  it("only counts days that have actually happened", () => {
    // Five days into a thirty-day month is not a twenty-five day winning streak.
    const s = noSpendStats([tx({ date: "2026-09-01", amount: 5 })], "2026-09-01", 5);
    expect(s.days).toBe(4);
    expect(s.outOf).toBe(5);
  });

  it("has no run to report when every day had spending", () => {
    const rows = ["2026-09-01", "2026-09-02"].map((date) => tx({ date, amount: 3 }));
    const s = noSpendStats(rows, "2026-09-01", 2);
    expect(s.days).toBe(0);
    expect(s.longestRun).toBe(0);
    expect(s.longestRunStart).toBeNull();
  });
});

describe("subscriptions", () => {
  const sub = (over: Partial<Transaction>) =>
    tx({ type: "subscription", interval: "monthly", ...over });

  it("annualises every cadence", () => {
    expect(ANNUAL_FACTOR).toEqual({
      weekly: 52,
      fortnightly: 26,
      monthly: 12,
      quarterly: 4,
      yearly: 1,
    });
    const intervals: Interval[] = ["weekly", "fortnightly", "monthly", "quarterly", "yearly"];
    for (const i of intervals) expect(ANNUAL_FACTOR[i]).toBeGreaterThan(0);
  });

  it("turns a weekly five into 260 a year and 21.67 a month", () => {
    const s = subscriptions([sub({ interval: "weekly", amount: 5, date: "2026-09-01", note: "coffee" })], "2026-09-05");
    expect(s.lines[0].annualised).toBe(260);
    expect(s.lines[0].monthlyEquivalent).toBeCloseTo(21.67, 2);
  });

  it("folds repeat charges of the same subscription into one line", () => {
    const s = subscriptions(
      [
        sub({ note: "netflix", amount: 12, date: "2026-07-01" }),
        sub({ note: "netflix", amount: 12, date: "2026-08-01" }),
        sub({ note: "netflix", amount: 12, date: "2026-09-01" }),
      ],
      "2026-09-05",
    );
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].count).toBe(3);
    expect(s.lines[0].lastCharged).toBe("2026-09-01");
  });

  it("counts a recent charge as live and a stale one as gone", () => {
    // Monthly tolerance is 1.5 intervals, so about 46 days.
    const live = subscriptions([sub({ note: "gym", date: "2026-07-27" })], "2026-09-05");
    expect(live.lines[0].active).toBe(true);

    const dead = subscriptions([sub({ note: "gym", date: "2026-07-07" })], "2026-09-05");
    expect(dead.lines[0].active).toBe(false);
    expect(dead.activeCount).toBe(0);
    expect(dead.annualCommitment).toBe(0);
  });

  it("commits only what is still live", () => {
    const s = subscriptions(
      [
        sub({ note: "netflix", amount: 12, date: "2026-09-01" }),
        sub({ note: "old thing", amount: 99, date: "2025-01-01" }),
      ],
      "2026-09-05",
    );
    expect(s.activeCount).toBe(1);
    expect(s.annualCommitment).toBe(144);
    expect(s.monthlyCommitment).toBe(12);
  });

  it("assumes monthly when the cadence column is blank", () => {
    const s = subscriptions([sub({ interval: null, amount: 10, date: "2026-09-01" })], "2026-09-05");
    expect(s.lines[0].interval).toBe("monthly");
  });

  it("ignores one-off rows and refunds", () => {
    const s = subscriptions(
      [tx({ amount: 500 }), sub({ kind: "refund", amount: 12, date: "2026-09-01" })],
      "2026-09-05",
    );
    expect(s.lines).toEqual([]);
  });

  it("rolls the next charge forward past today", () => {
    expect(nextDue("2026-09-01", "monthly", "2026-09-05")).toBe("2026-10-01");
    expect(nextDue("2026-09-04", "weekly", "2026-09-05")).toBe("2026-09-11");
    expect(nextDue("2026-01-15", "yearly", "2026-09-05")).toBe("2027-01-15");
  });
});

describe("buildDashboard", () => {
  const OPTS = { now: "2026-09-05" as IsoDate, weekStart: 1 as const, currency: "GBP" };

  it("renders an empty month without a single NaN or Infinity", () => {
    const m = buildDashboard([], range("month", "2026-09-05"), OPTS);
    expect(m.empty).toBe(true);
    expect(m.totals.spend).toBe(0);
    expect(m.perDay).toBe(0);
    expect(m.spendDelta.ratio).toBeNull();
    for (const v of [m.totals.spend, m.totals.net, m.perDay, ...m.series.map((s) => s.value)]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("divides by days ELAPSED, not by the whole month", () => {
    // Five days into September: 100 spent is 20 a day, not 100/30.
    const m = buildDashboard([tx({ date: "2026-09-02", amount: 100 })], range("month", "2026-09-05"), OPTS);
    expect(m.windows.elapsedDays).toBe(5);
    expect(m.perDay).toBe(20);
    expect(m.projected).toBe(600);
  });

  it("stops projecting once the period is over", () => {
    const m = buildDashboard([tx({ date: "2026-03-02", amount: 100 })], range("month", "2026-03-15"), OPTS);
    expect(m.windows.partial).toBe(false);
    expect(m.projected).toBeNull();
  });

  it("compares like for like against the same days last month", () => {
    const rows = [
      tx({ date: "2026-09-02", amount: 100 }),
      tx({ date: "2026-08-02", amount: 50 }), // inside the comparable window
      tx({ date: "2026-08-20", amount: 900 }), // outside it — must not count
    ];
    const m = buildDashboard(rows, range("month", "2026-09-05"), OPTS);
    expect(m.totals.spend).toBe(100);
    expect(m.spendDelta.previous).toBe(50);
    expect(m.spendDelta.direction).toBe("up");
  });

  it("marks future days in the heatmap rather than calling them quiet", () => {
    const m = buildDashboard([], range("month", "2026-09-05"), OPTS);
    expect(m.daily).toHaveLength(30);
    expect(m.daily.filter((d) => !d.future)).toHaveLength(5);
    expect(m.daily[29].future).toBe(true);
    expect(m.noSpend.outOf).toBe(5);
  });

  it("caps the ghost line at the current period's length instead of stretching it", () => {
    // March has 31 days, February 28. The tail stops short, and says so.
    const m = buildDashboard([tx({ date: "2026-02-10", amount: 40 })], range("month", "2026-03-15"), OPTS);
    expect(m.burn.periodDays).toBe(31);
    expect(m.burn.previousPeriodDays).toBe(28);
    expect(m.burn.previousTotal).toBe(40);
  });

  it("reports where the previous period finished, not just where it was compared", () => {
    // Delta compares the first 5 days; the ghost still knows August's whole total.
    const rows = [
      tx({ date: "2026-09-02", amount: 10 }),
      tx({ date: "2026-08-02", amount: 50 }),
      tx({ date: "2026-08-20", amount: 900 }),
    ];
    const m = buildDashboard(rows, range("month", "2026-09-05"), OPTS);
    expect(m.spendDelta.previous).toBe(50);
    expect(m.burn.previousTotal).toBe(950);
  });

  it("keeps subscriptions visible outside the range being viewed", () => {
    // A yearly renewal seen in March is still a commitment when viewing September.
    const rows = [tx({ date: "2026-03-01", type: "subscription", interval: "yearly", amount: 120, note: "domain" })];
    const m = buildDashboard(rows, range("month", "2026-09-05"), OPTS);
    expect(m.empty).toBe(true);
    expect(m.subs.lines).toHaveLength(1);
    expect(m.subs.annualCommitment).toBe(120);
  });

  it("gives the trend chart a dense series", () => {
    const m = buildDashboard([tx({ date: "2026-09-02", amount: 12 })], range("month", "2026-09-05"), OPTS);
    expect(m.series).toHaveLength(30);
    expect(m.series[1].value).toBe(12);
    expect(m.series[0].value).toBe(0);
  });
});
