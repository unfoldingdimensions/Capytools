import { describe, expect, it } from "vitest";
import {
  bucketKey,
  bucketStart,
  bucketsIn,
  dataSpanOf,
  defaultGrain,
  filterRange,
  inRange,
  resolveRange,
  stepRange,
} from "../src/lib/capyexpense/bucket";
import type { RangeState } from "../src/lib/capyexpense/bucket";
import type { IsoDate, Transaction } from "../src/lib/capyexpense/types";

const tx = (date: IsoDate, amount = 10): Transaction => ({
  id: `x#Sep#${date}`,
  date,
  category: "groceries",
  type: "one-time",
  kind: "expense",
  amount,
  note: "",
  paymentMethod: null,
  account: null,
  needWant: null,
  interval: null,
  currency: "GBP",
  source: { file: "x.xlsx", sheet: "Sep", row: 2 },
  extra: {},
});

const state = (preset: RangeState["preset"], anchor: IsoDate, custom?: RangeState["custom"]): RangeState => ({
  preset,
  anchor,
  custom,
});

const OPTS = { weekStart: 1 as const };

describe("resolveRange", () => {
  it("resolves a single day", () => {
    const r = resolveRange(state("day", "2026-09-05"), OPTS);
    expect([r.start, r.end]).toEqual(["2026-09-05", "2026-09-05"]);
    expect(r.grain).toBe("day");
  });

  it("resolves the week containing the anchor, honouring week start", () => {
    // 2026-09-05 is a Saturday.
    expect(resolveRange(state("week", "2026-09-05"), { weekStart: 1 }).start).toBe("2026-08-31");
    expect(resolveRange(state("week", "2026-09-05"), { weekStart: 0 }).start).toBe("2026-08-30");
  });

  it("resolves the whole month and year around the anchor", () => {
    const m = resolveRange(state("month", "2026-09-05"), OPTS);
    expect([m.start, m.end]).toEqual(["2026-09-01", "2026-09-30"]);

    const y = resolveRange(state("year", "2026-09-05"), OPTS);
    expect([y.start, y.end]).toEqual(["2026-01-01", "2026-12-31"]);
    expect(y.grain).toBe("month");
  });

  it("spans every loaded workbook for all-time", () => {
    const r = resolveRange(state("all", "2026-09-05"), {
      weekStart: 1,
      dataSpan: { min: "2025-01-04", max: "2026-09-01" },
    });
    expect([r.start, r.end]).toEqual(["2025-01-04", "2026-09-01"]);
  });

  it("collapses all-time to the anchor when there is no data at all", () => {
    const r = resolveRange(state("all", "2026-09-05"), OPTS);
    expect([r.start, r.end]).toEqual(["2026-09-05", "2026-09-05"]);
  });

  it("un-crosses a backwards custom range rather than rendering nothing", () => {
    const r = resolveRange(state("custom", "2026-09-05", { start: "2026-09-30", end: "2026-09-01" }), OPTS);
    expect([r.start, r.end]).toEqual(["2026-09-01", "2026-09-30"]);
  });
});

describe("defaultGrain", () => {
  it("keeps daily bars until they stop fitting", () => {
    expect(defaultGrain("2026-01-01", "2026-01-31")).toBe("day");
    expect(defaultGrain("2026-01-01", "2026-04-01")).toBe("day");
  });

  it("steps up as the span grows", () => {
    expect(defaultGrain("2026-01-01", "2026-06-01")).toBe("week");
    expect(defaultGrain("2020-01-01", "2026-01-01")).toBe("month");
    expect(defaultGrain("2000-01-01", "2026-01-01")).toBe("year");
  });

  it("switches grain exactly on the documented boundaries", () => {
    // 92 days inclusive is still daily; 93 is not.
    expect(defaultGrain("2026-01-01", "2026-04-02")).toBe("day");
    expect(defaultGrain("2026-01-01", "2026-04-03")).toBe("week");
    // 2026 + 2027 is exactly 730 days.
    expect(defaultGrain("2026-01-01", "2027-12-31")).toBe("week");
    expect(defaultGrain("2026-01-01", "2028-01-01")).toBe("month");
  });
});

describe("stepRange", () => {
  it("walks backwards and forwards a period at a time", () => {
    expect(stepRange(state("day", "2026-09-05"), -1, 1).anchor).toBe("2026-09-04");
    expect(stepRange(state("week", "2026-09-05"), -1, 1).anchor).toBe("2026-08-24");
    expect(stepRange(state("month", "2026-09-05"), -1, 1).anchor).toBe("2026-08-01");
    expect(stepRange(state("year", "2026-09-05"), 1, 1).anchor).toBe("2027-01-01");
  });

  it("clamps month stepping instead of skipping a short month", () => {
    // Anchored on the 31st, stepping back must not land in the wrong month.
    expect(stepRange(state("month", "2026-03-31"), -1, 1).anchor).toBe("2026-02-01");
  });

  it("leaves all-time and custom alone", () => {
    expect(stepRange(state("all", "2026-09-05"), -1, 1).anchor).toBe("2026-09-05");
    expect(stepRange(state("custom", "2026-09-05"), -1, 1).anchor).toBe("2026-09-05");
  });
});

describe("bucketsIn", () => {
  it("returns a DENSE run of days, including the empty ones", () => {
    // The whole point: a quiet fortnight must still occupy fourteen slots.
    const r = resolveRange(state("month", "2026-09-05"), OPTS);
    const buckets = bucketsIn(r, 1);
    expect(buckets).toHaveLength(30);
    expect(buckets[0].key).toBe("2026-09-01");
    expect(buckets[29].key).toBe("2026-09-30");
  });

  it("covers a February in a leap year", () => {
    expect(bucketsIn(resolveRange(state("month", "2028-02-10"), OPTS), 1)).toHaveLength(29);
  });

  it("buckets a year into twelve months", () => {
    const buckets = bucketsIn(resolveRange(state("year", "2026-06-01"), OPTS), 1);
    expect(buckets).toHaveLength(12);
    expect(buckets.map((b) => b.key)).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
      "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
    expect(buckets[8].label).toBe("SEP");
  });

  it("starts weekly buckets on the week containing the range start", () => {
    const r = resolveRange(state("custom", "2026-09-05", { start: "2026-01-01", end: "2026-06-30" }), OPTS);
    expect(r.grain).toBe("week");
    const buckets = bucketsIn(r, 1);
    // 1 Jan 2026 is a Thursday; its Monday is 29 Dec 2025.
    expect(buckets[0].key).toBe("2025-12-29");
    expect(new Set(buckets.map((b) => b.key)).size).toBe(buckets.length);
  });

  it("gives a single day one bucket", () => {
    expect(bucketsIn(resolveRange(state("day", "2026-09-05"), OPTS), 1)).toHaveLength(1);
  });
});

describe("bucketKey / bucketStart", () => {
  it("keys by grain, and keys sort chronologically", () => {
    expect(bucketKey("2026-09-05", "day", 1)).toBe("2026-09-05");
    expect(bucketKey("2026-09-05", "week", 1)).toBe("2026-08-31");
    expect(bucketKey("2026-09-05", "month", 1)).toBe("2026-09");
    expect(bucketKey("2026-09-05", "year", 1)).toBe("2026");
    expect("2026-09" < "2026-10").toBe(true);
  });

  it("round-trips a key back to its first day", () => {
    expect(bucketStart("2026-09", "month")).toBe("2026-09-01");
    expect(bucketStart("2026", "year")).toBe("2026-01-01");
    expect(bucketStart("2026-09-05", "day")).toBe("2026-09-05");
  });
});

describe("inRange / filterRange", () => {
  const r = resolveRange(state("month", "2026-09-05"), OPTS);

  it("includes both endpoints", () => {
    expect(inRange("2026-09-01", r)).toBe(true);
    expect(inRange("2026-09-30", r)).toBe(true);
    expect(inRange("2026-08-31", r)).toBe(false);
    expect(inRange("2026-10-01", r)).toBe(false);
  });

  it("filters transactions", () => {
    const rows = [tx("2026-08-31"), tx("2026-09-01"), tx("2026-09-30"), tx("2026-10-01")];
    expect(filterRange(rows, r).map((t) => t.date)).toEqual(["2026-09-01", "2026-09-30"]);
  });

  it("returns nothing for an inverted range, with no special case", () => {
    const inverted = { ...r, start: "2026-11-01", end: "2026-09-05" };
    expect(filterRange([tx("2026-10-01")], inverted)).toEqual([]);
  });
});

describe("dataSpanOf", () => {
  it("finds the outer dates regardless of input order", () => {
    expect(dataSpanOf([tx("2026-05-01"), tx("2025-01-04"), tx("2026-09-01")])).toEqual({
      min: "2025-01-04",
      max: "2026-09-01",
    });
  });

  it("is null with no transactions", () => {
    expect(dataSpanOf([])).toBeNull();
  });
});
