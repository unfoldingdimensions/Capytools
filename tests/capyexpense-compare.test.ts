import { describe, expect, it } from "vitest";
import { resolveRange } from "../src/lib/capyexpense/bucket";
import type { RangeState } from "../src/lib/capyexpense/bucket";
import { comparisonWindows, delta, periodDays } from "../src/lib/capyexpense/compare";
import type { IsoDate } from "../src/lib/capyexpense/types";

const OPTS = { weekStart: 1 as const };

const win = (
  preset: RangeState["preset"],
  anchor: IsoDate,
  now: IsoDate,
  custom?: RangeState["custom"],
) => comparisonWindows(resolveRange({ preset, anchor, custom }, OPTS), now, 1);

describe("comparisonWindows — a running period", () => {
  it("clips the current window to today and reports it as partial", () => {
    const w = win("month", "2026-03-05", "2026-03-05");
    expect(w.current.start).toBe("2026-03-01");
    expect(w.current.end).toBe("2026-03-05");
    expect(w.partial).toBe(true);
    expect(w.elapsedDays).toBe(5);
  });

  it("compares against the SAME number of elapsed days last month", () => {
    const w = win("month", "2026-03-05", "2026-03-05");
    expect(w.previous).not.toBeNull();
    expect([w.previous!.start, w.previous!.end]).toEqual(["2026-02-01", "2026-02-05"]);
  });

  it("clamps into a short month instead of borrowing days from the next one", () => {
    // 31 elapsed days of March against February, which only has 28.
    const w = win("month", "2026-03-31", "2026-03-31");
    expect(w.elapsedDays).toBe(31);
    expect([w.previous!.start, w.previous!.end]).toEqual(["2026-02-01", "2026-02-28"]);
  });

  it("uses the leap day when there is one", () => {
    const w = win("month", "2028-03-31", "2028-03-31");
    expect(w.previous!.end).toBe("2028-02-29");
  });

  it("compares a part-week against the same part of last week", () => {
    // 2026-09-05 is a Saturday; the Monday week runs 08-31 to 09-06.
    const w = win("week", "2026-09-05", "2026-09-05");
    expect([w.current.start, w.current.end]).toEqual(["2026-08-31", "2026-09-05"]);
    expect(w.elapsedDays).toBe(6);
    expect([w.previous!.start, w.previous!.end]).toEqual(["2026-08-24", "2026-08-29"]);
  });

  it("compares a year against the same CALENDAR DATE last year", () => {
    // Not the same day index: that drifts by one after February in a leap year.
    const w = win("year", "2026-03-14", "2026-03-14");
    expect([w.previous!.start, w.previous!.end]).toEqual(["2025-01-01", "2025-03-14"]);
  });

  it("compares a day against the day before", () => {
    const w = win("day", "2026-09-05", "2026-09-05");
    expect(w.partial).toBe(false);
    expect(w.elapsedDays).toBe(1);
    expect([w.previous!.start, w.previous!.end]).toEqual(["2026-09-04", "2026-09-04"]);
  });
});

describe("comparisonWindows — a finished period", () => {
  it("is not partial, and compares whole period against whole period", () => {
    const w = win("month", "2026-03-14", "2026-09-05");
    expect(w.partial).toBe(false);
    expect(w.elapsedDays).toBe(31);
    expect([w.current.start, w.current.end]).toEqual(["2026-03-01", "2026-03-31"]);
    expect([w.previous!.start, w.previous!.end]).toEqual(["2026-02-01", "2026-02-28"]);
  });

  it("gives a custom range an equally long window ending the day before", () => {
    const w = win("custom", "2026-09-05", "2026-09-05", { start: "2026-03-01", end: "2026-03-10" });
    expect(w.elapsedDays).toBe(10);
    expect([w.previous!.start, w.previous!.end]).toEqual(["2026-02-19", "2026-02-28"]);
    expect(w.previous!.end).toBe("2026-02-28");
  });
});

describe("comparisonWindows — the edges", () => {
  it("has no previous period for all-time", () => {
    const w = comparisonWindows(
      resolveRange({ preset: "all", anchor: "2026-09-05" }, { weekStart: 1, dataSpan: { min: "2025-01-01", max: "2026-09-01" } }),
      "2026-09-05",
      1,
    );
    expect(w.previous).toBeNull();
  });

  it("treats a period that has not started as empty, not as negative", () => {
    const w = win("month", "2026-11-15", "2026-09-05");
    expect(w.elapsedDays).toBe(0);
    expect(w.previous).toBeNull();
    // The clipped window comes back inverted, which every filter reads as empty.
    expect(w.current.end < w.current.start).toBe(true);
  });

  it("counts the full period width for the burn chart axis", () => {
    expect(periodDays(resolveRange({ preset: "month", anchor: "2026-02-10" }, OPTS))).toBe(28);
    expect(periodDays(resolveRange({ preset: "month", anchor: "2026-09-10" }, OPTS))).toBe(30);
  });
});

describe("delta", () => {
  const w = win("month", "2026-03-05", "2026-03-05");

  it("reports a rise", () => {
    const d = delta(125, 100, w);
    expect(d.absolute).toBe(25);
    expect(d.ratio).toBeCloseTo(0.25);
    expect(d.direction).toBe("up");
  });

  it("reports a fall", () => {
    const d = delta(80, 100, w);
    expect(d.ratio).toBeCloseTo(-0.2);
    expect(d.direction).toBe("down");
  });

  it("calls small movement flat rather than dressing up noise as a trend", () => {
    expect(delta(100, 100, w).direction).toBe("flat");
    expect(delta(101, 100, w).direction).toBe("flat");
    expect(delta(98.5, 100, w).direction).toBe("flat");
    expect(delta(103, 100, w).direction).toBe("up");
  });

  it("never divides by a zero previous period", () => {
    const d = delta(100, 0, w);
    expect(d.ratio).toBeNull();
    expect(d.absolute).toBe(100);
    expect(d.direction).toBe("unknown");
    expect(Number.isFinite(d.ratio as number)).toBe(false);
  });

  it("is entirely unknown when there is no previous period", () => {
    const d = delta(100, null, w);
    expect(d.previous).toBeNull();
    expect(d.ratio).toBeNull();
    expect(d.absolute).toBeNull();
    expect(d.direction).toBe("unknown");
  });
});

describe("comparison copy", () => {
  it("says out loud that a running period is only part-way through", () => {
    expect(delta(1, 1, win("month", "2026-03-05", "2026-03-05")).label).toBe(
      "vs the same 5 days last month",
    );
    expect(delta(1, 1, win("week", "2026-09-05", "2026-09-05")).label).toBe(
      "vs the same 6 days last week",
    );
  });

  it("drops the qualifier once the period is over", () => {
    expect(delta(1, 1, win("month", "2026-03-14", "2026-09-05")).label).toBe("vs last month");
  });

  it("singularises a one-day comparison", () => {
    const w = win("custom", "2026-09-05", "2026-09-05", { start: "2026-03-01", end: "2026-03-01" });
    expect(delta(1, 1, w).label).toBe("vs the previous 1 day");
  });

  it("has nothing to say for all-time", () => {
    const w = comparisonWindows(
      resolveRange({ preset: "all", anchor: "2026-09-05" }, { weekStart: 1, dataSpan: { min: "2025-01-01", max: "2026-09-01" } }),
      "2026-09-05",
      1,
    );
    expect(delta(1, null, w).label).toBe("");
  });
});
