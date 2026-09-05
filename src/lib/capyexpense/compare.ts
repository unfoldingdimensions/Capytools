import type { DateRange } from "./bucket";
import {
  addDays,
  addMonths,
  clampDate,
  daysBetween,
  daysInclusive,
  endOfMonth,
  endOfWeek,
  endOfYear,
  minDate,
  startOfWeek,
} from "./dates";
import type { IsoDate } from "./types";

/**
 * Like-for-like period comparison.
 *
 * THE PROBLEM this file exists to solve: on the 5th of the month, a
 * month-to-date total of 200 is not "85% down" on last month's 1,300. It is five
 * days against thirty. Comparing a partial period against a whole one is the
 * single most common way a spending dashboard lies to its user, and it always
 * lies in the flattering direction.
 *
 * So the current window is CLIPPED to the days that have actually happened, and
 * the previous window is clipped to the same number of days. Both numbers in a
 * delta describe the same amount of elapsed time.
 */

export interface ComparisonWindows {
  /**
   * The range clipped to today. For a range entirely in the future this comes
   * back inverted (`end < start`), which every filter treats as empty — exactly
   * the right answer, with no special case to forget.
   */
  current: DateRange;
  /** `null` for "all time", and for a period that has not started. */
  previous: DateRange | null;
  /** True while the period is still running. Drives the comparison copy. */
  partial: boolean;
  /** Days of the range that have actually happened. Zero for a future period. */
  elapsedDays: number;
}

export function comparisonWindows(
  range: DateRange,
  now: IsoDate,
  weekStart: 0 | 1,
): ComparisonWindows {
  const elapsedEnd = minDate(range.end, now);
  const elapsedDays = Math.max(0, daysBetween(range.start, elapsedEnd) + 1);
  const partial = range.end > now;
  const current: DateRange = { ...range, end: elapsedEnd };

  if (range.preset === "all" || elapsedDays === 0) {
    return { current, previous: null, partial, elapsedDays };
  }

  const previous = previousWindow(range, elapsedDays, elapsedEnd, weekStart);
  return { current, previous, partial, elapsedDays };
}

/**
 * The comparable earlier window. The rules are deliberately NOT uniform, because
 * what a human means by "the same period last time" changes with the grain.
 */
function previousWindow(
  range: DateRange,
  elapsedDays: number,
  elapsedEnd: IsoDate,
  weekStart: 0 | 1,
): DateRange | null {
  const shift = (start: IsoDate, end: IsoDate): DateRange => ({
    ...range,
    start,
    end,
  });

  switch (range.preset) {
    case "day":
      return shift(addDays(range.start, -1), addDays(range.start, -1));

    case "week": {
      const start = addDays(startOfWeek(range.start, weekStart), -7);
      return shift(start, minDate(addDays(start, elapsedDays - 1), endOfWeek(start, weekStart)));
    }

    case "month": {
      // Day-offset, clamped to the previous month's length. Without the clamp,
      // 31 days into a 31-day month would overflow February and quietly borrow
      // three days of March into the comparison.
      const start = addMonths(range.start, -1);
      const end = clampDate(addDays(start, elapsedDays - 1), start, endOfMonth(start));
      return shift(start, end);
    }

    case "year": {
      // Same CALENDAR DATE last year, not the same day index. "Year to date vs
      // last year to date" is read by date; using a day offset makes every
      // comparison after February drift by a day in a leap year, for nothing.
      const start = addMonths(range.start, -12);
      const end = clampDate(addMonths(elapsedEnd, -12), start, endOfYear(start));
      return shift(start, end);
    }

    case "custom": {
      // An equally long window ending the day before this one starts.
      const end = addDays(range.start, -1);
      return shift(addDays(end, -(elapsedDays - 1)), end);
    }

    case "all":
      return null;
  }
}

/** Within this band the two periods are reported as level rather than moved. */
export const FLAT_BAND = 0.02;

export interface Delta {
  current: number;
  previous: number | null;
  /** `current - previous`, or `null` when there is nothing to compare against. */
  absolute: number | null;
  /**
   * Proportional change. `null` when the previous period was zero — dividing by
   * it yields Infinity, and "up ∞%" is not a fact anyone can act on.
   */
  ratio: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  partial: boolean;
  /** Human tail for the delta chip, e.g. "vs the same 5 days last month". */
  label: string;
}

export function delta(
  current: number,
  previous: number | null,
  windows: ComparisonWindows,
): Delta {
  const label = comparisonLabel(windows);

  if (previous === null) {
    return {
      current,
      previous: null,
      absolute: null,
      ratio: null,
      direction: "unknown",
      partial: windows.partial,
      label,
    };
  }

  const absolute = current - previous;
  const ratio = previous === 0 ? null : absolute / Math.abs(previous);
  const direction =
    ratio === null
      ? absolute === 0
        ? "flat"
        : "unknown"
      : Math.abs(ratio) <= FLAT_BAND
        ? "flat"
        : ratio > 0
          ? "up"
          : "down";

  return { current, previous, absolute, ratio, direction, partial: windows.partial, label };
}

/**
 * The phrase under a delta. When a period is still running this says so out
 * loud — a chip reading "down 40% vs last month" on the 5th is technically a
 * number and practically a lie.
 */
export function comparisonLabel(windows: ComparisonWindows): string {
  if (!windows.previous) return "";
  const n = windows.elapsedDays;
  const same = `vs the same ${n} ${n === 1 ? "day" : "days"}`;

  switch (windows.current.preset) {
    case "day":
      return "vs the day before";
    case "week":
      return windows.partial ? `${same} last week` : "vs last week";
    case "month":
      return windows.partial ? `${same} last month` : "vs last month";
    case "year":
      return windows.partial ? "vs the same period last year" : "vs last year";
    case "custom":
      return `vs the previous ${n} ${n === 1 ? "day" : "days"}`;
    case "all":
      return "";
  }
}

/** Days in the full (unclipped) period — the x-axis width for the burn chart. */
export function periodDays(range: DateRange): number {
  return Math.max(1, daysInclusive(range.start, range.end));
}
