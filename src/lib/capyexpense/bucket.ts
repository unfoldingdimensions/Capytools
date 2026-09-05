import {
  addDays,
  addMonths,
  daysInclusive,
  endOfMonth,
  endOfWeek,
  endOfYear,
  monthLabel,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "./dates";
import type { IsoDate, Transaction } from "./types";

export type Grain = "day" | "week" | "month" | "year";

/** The six things the range bar can be set to. */
export type RangePreset = "day" | "week" | "month" | "year" | "all" | "custom";

/**
 * What the range bar holds. The `anchor` is any day inside the period being
 * viewed, which is what makes the back/forward stepper trivial: stepping a month
 * is `addMonths(anchor, -1)`, and the preset does the rest.
 */
export interface RangeState {
  preset: RangePreset;
  anchor: IsoDate;
  custom?: { start: IsoDate; end: IsoDate };
}

export interface DateRange {
  start: IsoDate;
  /** Inclusive. */
  end: IsoDate;
  preset: RangePreset;
  anchor: IsoDate;
  /** Bucket size for the trend chart. */
  grain: Grain;
}

export interface DataSpan {
  min: IsoDate;
  max: IsoDate;
}

export interface ResolveOptions {
  weekStart: 0 | 1;
  /** Earliest and latest transaction across every loaded workbook. */
  dataSpan?: DataSpan | null;
}

/**
 * Bucket size for a span, picked so a chart never draws more marks than it has
 * pixels. The thresholds are generous on the daily end because daily bars are
 * the most readable view and a quarter of them still fits comfortably.
 */
export function defaultGrain(start: IsoDate, end: IsoDate): Grain {
  const days = daysInclusive(start, end);
  if (days <= 92) return "day";
  if (days <= 730) return "week";
  if (days <= 365 * 8) return "month";
  return "year";
}

export function resolveRange(state: RangeState, opts: ResolveOptions): DateRange {
  const { preset, anchor } = state;
  const base = { preset, anchor };

  switch (preset) {
    case "day":
      return { ...base, start: anchor, end: anchor, grain: "day" };
    case "week":
      return {
        ...base,
        start: startOfWeek(anchor, opts.weekStart),
        end: endOfWeek(anchor, opts.weekStart),
        grain: "day",
      };
    case "month":
      return { ...base, start: startOfMonth(anchor), end: endOfMonth(anchor), grain: "day" };
    case "year":
      return { ...base, start: startOfYear(anchor), end: endOfYear(anchor), grain: "month" };
    case "all": {
      // With no data at all, collapse to the anchor day. Every downstream
      // function then sees a valid one-day range rather than a null it has to
      // branch on, and the dashboard renders its empty state normally.
      const span = opts.dataSpan;
      if (!span) return { ...base, start: anchor, end: anchor, grain: "day" };
      return { ...base, start: span.min, end: span.max, grain: defaultGrain(span.min, span.max) };
    }
    case "custom": {
      const c = state.custom;
      if (!c) return { ...base, start: anchor, end: anchor, grain: "day" };
      // Tolerate a backwards pair rather than rendering an empty dashboard: a
      // user dragging two date inputs will cross them over at some point.
      const start = c.start <= c.end ? c.start : c.end;
      const end = c.start <= c.end ? c.end : c.start;
      return { ...base, start, end, grain: defaultGrain(start, end) };
    }
  }
}

/** Step the anchor one period in either direction. `all` does not move. */
export function stepRange(state: RangeState, direction: -1 | 1, weekStart: 0 | 1): RangeState {
  const { preset, anchor } = state;
  switch (preset) {
    case "day":
      return { ...state, anchor: addDays(anchor, direction) };
    case "week":
      return { ...state, anchor: addDays(startOfWeek(anchor, weekStart), direction * 7) };
    case "month":
      return { ...state, anchor: addMonths(startOfMonth(anchor), direction) };
    case "year":
      return { ...state, anchor: addMonths(startOfYear(anchor), direction * 12) };
    case "all":
    case "custom":
      return state;
  }
}

/** The key a date falls into at a given grain. Keys sort chronologically. */
export function bucketKey(date: IsoDate, grain: Grain, weekStart: 0 | 1): string {
  switch (grain) {
    case "day":
      return date;
    case "week":
      return startOfWeek(date, weekStart);
    case "month":
      return date.slice(0, 7);
    case "year":
      return date.slice(0, 4);
  }
}

/** First calendar day of a bucket, from its key. */
export function bucketStart(key: string, grain: Grain): IsoDate {
  switch (grain) {
    case "day":
    case "week":
      return key;
    case "month":
      return `${key}-01`;
    case "year":
      return `${key}-01-01`;
  }
}

function bucketLabel(start: IsoDate, grain: Grain): string {
  switch (grain) {
    case "day":
      return String(Number(start.slice(8, 10)));
    case "week":
      return `${Number(start.slice(8, 10))} ${monthLabel(start)}`;
    case "month":
      return monthLabel(start);
    case "year":
      return start.slice(0, 4);
  }
}

export interface Bucket {
  key: string;
  start: IsoDate;
  label: string;
}

/**
 * Every bucket the range covers, INCLUDING empty ones.
 *
 * Density is the point. A chart drawn only over buckets that happen to contain
 * a transaction silently compresses a quiet fortnight into nothing, which turns
 * "I spent nothing for two weeks" into "those two weeks did not exist".
 */
export function bucketsIn(range: DateRange, weekStart: 0 | 1): Bucket[] {
  const { grain } = range;
  const out: Bucket[] = [];
  const seen = new Set<string>();

  let cursor =
    grain === "week"
      ? startOfWeek(range.start, weekStart)
      : grain === "month"
        ? startOfMonth(range.start)
        : grain === "year"
          ? startOfYear(range.start)
          : range.start;

  // Guard against a malformed range spinning forever; ~30 years of daily
  // buckets is far past anything a personal ledger will hold.
  for (let i = 0; cursor <= range.end && i < 12_000; i++) {
    const key = bucketKey(cursor, grain, weekStart);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ key, start: cursor, label: bucketLabel(cursor, grain) });
    }
    cursor =
      grain === "day"
        ? addDays(cursor, 1)
        : grain === "week"
          ? addDays(cursor, 7)
          : grain === "month"
            ? addMonths(cursor, 1)
            : addMonths(cursor, 12);
  }

  return out;
}

export function inRange(date: IsoDate, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function filterRange(txs: readonly Transaction[], range: DateRange): Transaction[] {
  return txs.filter((t) => inRange(t.date, range));
}

/** Earliest and latest transaction date, or `null` when there are none. */
export function dataSpanOf(txs: readonly Transaction[]): DataSpan | null {
  if (txs.length === 0) return null;
  let min = txs[0].date;
  let max = txs[0].date;
  for (const t of txs) {
    if (t.date < min) min = t.date;
    if (t.date > max) max = t.date;
  }
  return { min, max };
}
