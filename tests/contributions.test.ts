import { describe, expect, it } from "vitest";
import {
  activityWindow,
  busiestWeekday,
  parseContributions,
  dayMonthTicks,
} from "../src/lib/github/contributions";

import type { ContributionDay } from "../src/lib/github/contributions";

const NOW = new Date("2026-08-20T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar of `n` days ending on NOW, with `counts` applied by index-from-end. */
function calendar(n: number, hot: (i: number) => number): ContributionDay[] {
  const days: ContributionDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push({
      date: new Date(NOW.getTime() - i * DAY_MS).toISOString().slice(0, 10),
      count: hot(n - 1 - i),
    });
  }
  return days;
}

describe("activityWindow", () => {
  it("rule 1: active over 12 months → a 12-month window", () => {
    const w = activityWindow(calendar(369, () => 1));
    expect(w.label).toBe("12 months");
    expect(w.days).toBe(365);
    expect(w.empty).toBe(false);
  });

  it("plots monthly totals, not daily counts, on a month-scale window", () => {
    const w = activityWindow(calendar(369, () => 2));
    // 365 days ending Aug 20 spans Aug 2025..Aug 2026 = 13 calendar months.
    expect(w.series).toHaveLength(13);
    // Full interior months are 2/day; the two partial Augusts are smaller.
    expect(w.series.slice(1, -1).every((n) => n >= 56)).toBe(true);
    expect(w.count).toBe(365 * 2);
    // Every plotted point is a month, so totals must reconstruct the count.
    expect(w.series.reduce((a, b) => a + b, 0)).toBe(w.count);
  });

  it("keeps a sub-90-day window on a daily scale", () => {
    const w = activityWindow(calendar(369, (i) => (i >= 369 - 40 ? 1 : 0)));
    expect(w.series).toHaveLength(40);
  });

  it("aligns ticks to the plotted series", () => {
    const w = activityWindow(calendar(369, () => 1));
    expect(w.ticks.length).toBeGreaterThan(0);
    expect(w.ticks[0].x).toBe(0);
    expect(Math.max(...w.ticks.map((t) => t.x))).toBeLessThanOrEqual(1);
  });

  it("rule 2: active between 90 days and 12 months → a whole-month window", () => {
    // First activity ~148 days back → spans 6 calendar months (Mar..Aug).
    const w = activityWindow(calendar(369, (i) => (i >= 369 - 148 ? 2 : 0)));
    expect(w.label).toBe("6 months");
    expect(w.days).toBeGreaterThan(148);
    expect(w.days).toBeLessThan(200);
    expect(w.series).toHaveLength(6); // month-scale too: one point per month
  });

  it("rule 3: active under 90 days → window starts on the first active day", () => {
    const w = activityWindow(calendar(369, (i) => (i >= 369 - 23 ? 3 : 0)));
    expect(w.label).toBe("23 days");
    expect(w.days).toBe(23);
    expect(w.series[0]).toBe(3);
    expect(w.count).toBe(23 * 3);
  });

  it("rule 4: nothing in the last 12 months → empty", () => {
    const w = activityWindow(calendar(369, () => 0));
    expect(w.empty).toBe(true);
    expect(w.label).toBe("last 12 months");
    expect(w.series).toEqual([]);
  });

  it("treats an absent calendar as empty rather than throwing", () => {
    expect(activityWindow([]).empty).toBe(true);
  });

  it("counts only what is inside the window", () => {
    // A spike 369 days back makes the span exceed 12 months (rule 1), but it
    // sits outside the 365-day window so it must not be counted.
    const days = calendar(369, (i) => (i >= 369 - 23 ? 1 : 0));
    days[0].count = 500;
    const w = activityWindow(days);
    expect(w.label).toBe("12 months");
    expect(w.days).toBe(365);
    expect(w.count).toBe(23);
  });
});

describe("busiestWeekday", () => {
  it("weights by contribution count, not by active-day count", () => {
    const days: ContributionDay[] = [
      { date: "2026-08-17", count: 1 }, // Monday
      { date: "2026-08-18", count: 1 }, // Tuesday
      { date: "2026-08-19", count: 9 }, // Wednesday
    ];
    expect(busiestWeekday(days)).toBe("Wednesday");
  });

  it("returns a dash when there is nothing to rank", () => {
    expect(busiestWeekday([{ date: "2026-08-17", count: 0 }])).toBe("—");
  });
});

describe("dayMonthTicks", () => {
  it("emits one tick per month, first at x=0", () => {
    const ticks = dayMonthTicks(calendar(70, () => 1)); // Jun 12 .. Aug 20
    expect(ticks.map((t) => t.label)).toEqual(["JUN", "JUL", "AUG"]);
    expect(ticks[0].x).toBe(0);
    expect(ticks[ticks.length - 1].x).toBeLessThan(1);
  });

  it("thins a year of labels so they can fit the axis", () => {
    const ticks = dayMonthTicks(calendar(365, () => 1));
    expect(ticks.length).toBeLessThanOrEqual(8);
    // The axis must still end on the window's final month.
    expect(ticks[ticks.length - 1].label).toBe("AUG");
  });
});

describe("parseContributions", () => {
  const html = `
    <td data-date="2026-08-18" id="c-1" data-level="1"></td>
    <td data-date="2026-08-19" id="c-2" data-level="0"></td>
    <td data-date="2026-08-20" id="c-3" data-level="4"></td>
    <tool-tip for="c-1" class="sr-only">6 contributions on August 18th.</tool-tip>
    <tool-tip for="c-2" class="sr-only">No contributions on August 19th.</tool-tip>
    <tool-tip for="c-3" class="sr-only">1,204 contributions on August 20th.</tool-tip>`;

  it("pairs each day cell with the count from its tool-tip", () => {
    expect(parseContributions(html)).toEqual([
      { date: "2026-08-18", count: 6 },
      { date: "2026-08-19", count: 0 },
      { date: "2026-08-20", count: 1204 },
    ]);
  });

  it("returns nothing rather than throwing on unrecognised markup", () => {
    expect(parseContributions("<html>signed out</html>")).toEqual([]);
  });
});

describe("activityWindow peak", () => {
  it("names the busiest month and its total", () => {
    // Everything at 1/day except a hot stretch in the final month.
    const days = calendar(369, (i) => (i >= 369 - 10 ? 9 : 1));
    const w = activityWindow(days);
    expect(w.peak).not.toBeNull();
    expect(w.peak!.label).toBe("Aug 2026"); // spelled out, with the year
    // The peak must equal the largest plotted point, or the guide line would
    // sit at a level the label contradicts.
    expect(w.peak!.value).toBe(Math.max(...w.series));
  });

  it("has no peak when there is nothing to plot", () => {
    expect(activityWindow(calendar(369, () => 0)).peak).toBeNull();
  });
});
