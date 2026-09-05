import { describe, expect, it } from "vitest";
import { buildDashboard } from "../src/lib/capyexpense/aggregate";
import type { Slice, SeriesPoint } from "../src/lib/capyexpense/aggregate";
import { resolveRange } from "../src/lib/capyexpense/bucket";
import { comparisonWindows } from "../src/lib/capyexpense/compare";
import {
  formatCompact,
  formatMoney,
  formatPct,
  formatRange,
  previousPeriodLabel,
} from "../src/lib/capyexpense/format";
import { buildBars } from "../src/lib/capyexpense/geometry/bars";
import { buildBurn } from "../src/lib/capyexpense/geometry/burn";
import {
  buildHeatmap,
  levelFor,
  quantileThresholds,
  rampOpacity,
} from "../src/lib/capyexpense/geometry/heatmap";
import { OTHER_KEY, buildRibbon } from "../src/lib/capyexpense/geometry/ribbon";
import { SAMPLE_CURRENCY, SAMPLE_NOW, SAMPLE_TRANSACTIONS } from "../src/lib/capyexpense/sample";

const slice = (key: string, value: number, share: number): Slice => ({
  key,
  label: key,
  value,
  share,
  count: 1,
});

const point = (label: string, value: number): SeriesPoint => ({
  key: label,
  start: "2026-09-01",
  label,
  value,
  count: value > 0 ? 1 : 0,
});

describe("ribbon", () => {
  it("fills the full width exactly, with no rounding gap at the right edge", () => {
    const slices = [slice("a", 50, 0.5), slice("b", 30, 0.3), slice("c", 20, 0.2)];
    const segs = buildRibbon(slices, 700);
    expect(segs).toHaveLength(3);
    const last = segs[segs.length - 1];
    expect(last.x + last.width).toBeCloseTo(700, 6);
    expect(segs[0].x).toBe(0);
  });

  it("folds everything past the fifth into one segment", () => {
    const slices = Array.from({ length: 9 }, (_, i) => slice(`c${i}`, 10, 1 / 9));
    const segs = buildRibbon(slices, 700);
    expect(segs).toHaveLength(6);
    expect(segs[5].key).toBe(OTHER_KEY);
    expect(segs[5].label).toBe("4 more");
    expect(segs[5].tone).toBe(-1);
  });

  it("keeps a sliver visible rather than deleting it", () => {
    const segs = buildRibbon([slice("big", 999, 0.999), slice("tiny", 1, 0.001)], 700);
    expect(segs[1].width).toBeGreaterThan(0);
  });

  it("draws nothing when there is nothing, and never a negative width", () => {
    expect(buildRibbon([], 700)).toEqual([]);
    expect(buildRibbon([slice("refunded", -50, 0)], 700)).toEqual([]);
    for (const s of buildRibbon([slice("a", 10, 1)], 700)) {
      expect(s.width).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("bars", () => {
  it("keeps a tiny bar visible beside a huge one", () => {
    const g = buildBars([point("1", 3), point("2", 900)], 700, 200);
    expect(g.bars[0].height).toBeGreaterThanOrEqual(2);
    expect(g.bars[1].isPeak).toBe(true);
    expect(g.peak?.value).toBe(900);
  });

  it("draws nothing for an empty bucket, so the gap is the signal", () => {
    const g = buildBars([point("1", 0), point("2", 10)], 700, 200);
    expect(g.bars[0].height).toBe(0);
    expect(g.bars[1].height).toBeGreaterThan(0);
  });

  it("always labels the last bucket even when the stride would skip it", () => {
    const g = buildBars(Array.from({ length: 31 }, (_, i) => point(String(i + 1), i)), 700, 200);
    expect(g.ticks[g.ticks.length - 1].label).toBe("31");
  });

  it("keeps bars inside the box at any density", () => {
    for (const n of [1, 7, 31, 365]) {
      const g = buildBars(Array.from({ length: n }, (_, i) => point(String(i), i + 1)), 400, 200);
      for (const b of g.bars) {
        expect(b.width).toBeGreaterThan(0);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(400.5);
        expect(b.y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("has no peak and no ticks when there is nothing to draw", () => {
    const g = buildBars([], 700, 200);
    expect(g.peak).toBeNull();
    expect(g.bars).toEqual([]);
    expect(g.max).toBe(0);
  });
});

describe("heatmap", () => {
  it("uses quantiles, so one huge day does not flatten the year", () => {
    const values = [...Array.from({ length: 40 }, (_, i) => i + 1), 900];
    const t = quantileThresholds(values);
    expect(t.length).toBeGreaterThanOrEqual(3);
    // The £900 day is top band; a £5 day is not.
    expect(levelFor(900, t)).toBe(4);
    expect(levelFor(5, t)).toBe(1);
  });

  it("does not sort three identical values all into the top band", () => {
    const t = quantileThresholds([10, 10, 10]);
    expect(new Set(t).size).toBe(t.length);
    expect(levelFor(10, t)).toBeLessThan(4);
  });

  it("keeps a known zero distinct from a day that has not happened", () => {
    const days = [
      { date: "2026-09-01", value: 0, future: false },
      { date: "2026-09-02", value: 20, future: false },
      { date: "2026-09-30", value: 0, future: true },
    ];
    const g = buildHeatmap(days, 1);
    // The future day is not drawn at all; the quiet day is, at level 0.
    expect(g.cells).toHaveLength(2);
    expect(g.cells.find((c) => c.date === "2026-09-01")!.level).toBe(0);
    expect(g.cells.find((c) => c.date === "2026-09-30")).toBeUndefined();
  });

  it("lays a year out on seven rows", () => {
    const days = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 8, 1) + i * 86_400_000).toISOString().slice(0, 10),
      value: i % 5,
      future: false,
    }));
    const g = buildHeatmap(days, 1);
    const rows = new Set(g.cells.map((c) => c.y));
    expect(rows.size).toBe(7);
    expect(g.columns).toBeGreaterThan(50);
    expect(g.months.length).toBeGreaterThan(6);
  });

  it("never collides two month labels", () => {
    const days = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 8, 1) + i * 86_400_000).toISOString().slice(0, 10),
      value: 1,
      future: false,
    }));
    const xs = buildHeatmap(days, 1).months.map((m) => m.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(3 * 14);
  });

  it("spreads the ramp to the bands the data actually needs", () => {
    expect(rampOpacity(0, 4)).toBe(0);
    expect(rampOpacity(1, 1)).toBeGreaterThan(0);
    expect(rampOpacity(4, 4)).toBe(1);
    expect(rampOpacity(1, 4)).toBeLessThan(rampOpacity(4, 4));
  });

  it("draws nothing from nothing", () => {
    expect(buildHeatmap([], 1).cells).toEqual([]);
    expect(quantileThresholds([])).toEqual([]);
  });
});

describe("burn", () => {
  const opts = { periodDays: 30, elapsed: 5, partial: true };

  it("steps rather than sloping", () => {
    const g = buildBurn([10, 10, 10, 25, 25], [], opts, 700, 200);
    expect(g.currentPath.startsWith("M")).toBe(true);
    // A step is two line segments per point: across, then up.
    expect((g.currentPath.match(/L/g) ?? []).length).toBe(8);
    expect(g.currentPath).not.toContain("C");
  });

  it("puts both series on one scale", () => {
    const g = buildBurn([10], [100], opts, 700, 200);
    // The bigger series must sit higher on the page (smaller y).
    expect(g.ghostEnd!.y).toBeLessThan(g.end!.y);
    expect(g.max).toBe(100);
  });

  it("draws the ghost's whole tail, dashed beyond today", () => {
    const previous = Array.from({ length: 28 }, (_, i) => (i + 1) * 10);
    const g = buildBurn([10, 20, 30, 40, 50], previous, opts, 700, 200);
    expect(g.previousSolidPath).not.toBe("");
    expect(g.previousTailPath).not.toBe("");
    expect(g.ghostEnd!.x).toBeGreaterThan(g.end!.x);
  });

  it("has no tail when the previous period is no longer than the elapsed part", () => {
    const g = buildBurn([10, 20, 30, 40, 50], [5, 10, 15, 20, 25], opts, 700, 200);
    expect(g.previousTailPath).toBe("");
  });

  it("marks today only while the period is running", () => {
    expect(buildBurn([10], [10], opts, 700, 200).todayX).not.toBeNull();
    expect(buildBurn([10], [10], { ...opts, partial: false }, 700, 200).todayX).toBeNull();
  });

  it("degrades to empty rather than dividing by zero", () => {
    const g = buildBurn([], [], { periodDays: 0, elapsed: 0, partial: false }, 700, 200);
    expect(g.currentPath).toBe("");
    expect(g.end).toBeNull();
    const flat = buildBurn([0, 0], [0], opts, 700, 200);
    expect(flat.currentPath).toBe("");
  });
});

describe("format", () => {
  it("formats money without inventing pennies on whole numbers", () => {
    expect(formatMoney(1200, "GBP", "en-GB")).toBe("£1,200");
    expect(formatMoney(12.5, "GBP", "en-GB")).toBe("£12.50");
  });

  it("formats an unlisted but well-formed code using the code itself", () => {
    // Intl does not check codes against a registry, it just prints them.
    expect(formatMoney(10, "ZZZ", "en-GB")).toContain("ZZZ");
    // Intl separates the code from the number with a NON-BREAKING space, so
    // never assert the exact string here — it looks identical and is not.
    expect(formatCompact(1500, "ZZZ", "en-GB").replace(/\s/g, " ")).toBe("ZZZ 1.5k");
  });

  it("falls back instead of throwing on a malformed code", () => {
    // Intl requires exactly three letters; anything else is a RangeError, and a
    // currency typed during onboarding must not be able to blank the dashboard.
    expect(formatMoney(10, "POUNDS", "en-GB")).toBe("POUNDS 10.00");
    expect(formatCompact(1500, "£", "en-GB")).toBe("£ 1500");
    expect(formatMoney(10, "", "en-GB")).toContain("10");
  });

  it("shows a dash rather than NaN when there is no comparison", () => {
    expect(formatPct(null)).toBe("—");
    expect(formatPct(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatPct(-0.18, "en-GB")).toBe("18%");
  });

  it("names the comparison period by PRESET, not by calendar month", () => {
    // Regression: naming the previous month while viewing a year put
    // "december" under a chart comparing 2026 against 2025.
    const w = (preset: "day" | "week" | "month" | "year" | "custom") =>
      comparisonWindows(
        resolveRange({ preset, anchor: "2026-09-05", custom: { start: "2026-08-01", end: "2026-08-10" } }, { weekStart: 1 }),
        "2026-09-05",
        1,
      );
    expect(previousPeriodLabel(w("year"))).toBe("2025");
    expect(previousPeriodLabel(w("month"))).toBe("August");
    expect(previousPeriodLabel(w("week"))).toBe("last week");
    expect(previousPeriodLabel(w("day"))).toBe("4 Sep");
    expect(previousPeriodLabel(w("custom"))).toBe("the previous period");
  });

  it("names a range the way a person would", () => {
    const r = (preset: "day" | "week" | "month" | "year") =>
      formatRange(resolveRange({ preset, anchor: "2026-09-05" }, { weekStart: 1 }));
    expect(r("day")).toBe("5 September 2026");
    expect(r("month")).toBe("September 2026");
    expect(r("year")).toBe("2026");
    expect(r("week")).toBe("31 Aug – 6 Sep");
  });

  it("shows the year on a span that crosses one", () => {
    // Regression: a range from 1 Sep 2025 to 5 Sep 2026 rendered as
    // "1 Sep – 5 Sep", reading as four days beside a whole year's total.
    const crossing = resolveRange(
      { preset: "custom", anchor: "2026-09-05", custom: { start: "2025-09-01", end: "2026-09-05" } },
      { weekStart: 1 },
    );
    expect(formatRange(crossing)).toBe("1 Sep 2025 – 5 Sep 2026");

    const within = resolveRange(
      { preset: "custom", anchor: "2026-09-05", custom: { start: "2026-03-01", end: "2026-03-10" } },
      { weekStart: 1 },
    );
    expect(formatRange(within)).toBe("1 Mar – 10 Mar");
  });
});

describe("sample data", () => {
  it("is deterministic, so the demo can server-render and hydrate", () => {
    const a = SAMPLE_TRANSACTIONS.map((t) => `${t.date}|${t.amount}|${t.category}`).join();
    expect(a).toBe(SAMPLE_TRANSACTIONS.map((t) => `${t.date}|${t.amount}|${t.category}`).join());
    expect(SAMPLE_TRANSACTIONS.length).toBeGreaterThan(300);
  });

  it("covers a full year up to the fixed demo date", () => {
    const dates = SAMPLE_TRANSACTIONS.map((t) => t.date);
    expect(Math.min(...dates.map((d) => Date.parse(d)))).toBeLessThan(Date.parse("2025-10-01"));
    expect(Math.max(...dates.map((d) => Date.parse(d)))).toBeLessThanOrEqual(Date.parse(SAMPLE_NOW));
  });

  it("exercises subscriptions, income and refunds", () => {
    expect(SAMPLE_TRANSACTIONS.some((t) => t.type === "subscription")).toBe(true);
    expect(SAMPLE_TRANSACTIONS.some((t) => t.kind === "income")).toBe(true);
    expect(SAMPLE_TRANSACTIONS.some((t) => t.kind === "refund")).toBe(true);
    expect(SAMPLE_TRANSACTIONS.some((t) => t.interval === "yearly")).toBe(true);
  });

  it("builds a dashboard with every number finite", () => {
    const range = resolveRange({ preset: "month", anchor: SAMPLE_NOW }, { weekStart: 1 });
    const m = buildDashboard(SAMPLE_TRANSACTIONS, range, {
      now: SAMPLE_NOW,
      weekStart: 1,
      currency: SAMPLE_CURRENCY,
    });
    expect(m.empty).toBe(false);
    expect(Number.isFinite(m.totals.spend)).toBe(true);
    expect(Number.isFinite(m.perDay)).toBe(true);
    expect(m.subs.activeCount).toBeGreaterThan(3);
    expect(m.categories.length).toBeGreaterThan(2);
    expect(m.noSpend.outOf).toBe(5);
  });
});
