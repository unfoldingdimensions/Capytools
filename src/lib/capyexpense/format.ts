import type { DateRange } from "./bucket";
import type { ComparisonWindows } from "./compare";
import { monthLabel } from "./dates";
import type { IsoDate } from "./types";

/**
 * Formatting. Every function takes an explicit locale.
 *
 * That is not pedantry: these components server-render on the marketing page and
 * hydrate in the browser. `Intl` with an implicit locale resolves to the build
 * machine's on the server and the visitor's in the client, so the two renders
 * disagree and React throws a hydration mismatch on a number nobody looked at.
 * Passing it in makes the output a pure function of its arguments.
 */

export const DEFAULT_LOCALE = "en-GB";

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function formatMoney(
  value: number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      // Whole numbers read better on a dashboard; the pennies are noise at a
      // glance and the table shows them when it matters.
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // An unknown currency code must not take the page down with it.
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** "£1.2k" — for axis labels and tight tiles. */
export function formatCompact(
  value: number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

/** "18%" — takes a ratio, not a percentage. Sign is dropped; direction is separate. */
export function formatPct(ratio: number | null, locale: string = DEFAULT_LOCALE): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: Math.abs(ratio) < 0.1 ? 1 : 0,
  }).format(Math.abs(ratio));
}

export function formatCount(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** "5 Sep" — the short form, for axis ticks and dense rows. */
export function formatDay(date: IsoDate): string {
  const m = monthLabel(date);
  return `${Number(date.slice(8, 10))} ${m.charAt(0)}${m.slice(1).toLowerCase()}`;
}

/** "5 september 2026" — for a single named day. */
export function formatLongDay(date: IsoDate): string {
  return `${Number(date.slice(8, 10))} ${MONTHS_LONG[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

export function formatMonth(date: IsoDate): string {
  return `${MONTHS_LONG[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** What the range bar and the status line call the current window. */
export function formatRange(range: DateRange): string {
  switch (range.preset) {
    case "day":
      return formatLongDay(range.start);
    case "week":
      return spanLabel(range);
    case "month":
      return formatMonth(range.start);
    case "year":
      return range.start.slice(0, 4);
    case "all":
      return range.start === range.end ? "All time" : `All time · ${range.start.slice(0, 4)}–${range.end.slice(0, 4)}`;
    case "custom":
      return spanLabel(range);
  }
}

/**
 * A day-to-day span, with the years shown only when they differ.
 *
 * Without the year check a range running from 1 September 2025 to 5 September
 * 2026 renders as "1 Sep – 5 Sep", which reads as four days rather than a full
 * year — the label silently contradicting the total sitting next to it.
 */
function spanLabel(range: DateRange): string {
  const startYear = range.start.slice(0, 4);
  const endYear = range.end.slice(0, 4);
  if (startYear === endYear) return `${formatDay(range.start)} – ${formatDay(range.end)}`;
  return `${formatDay(range.start)} ${startYear} – ${formatDay(range.end)} ${endYear}`;
}

/** "3 days", "1 day" — used wherever a span is spelled out. */
export function pluralDays(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

/**
 * What to call the period being compared against.
 *
 * Must follow the PRESET, not the calendar. Naming the previous month while the
 * user is looking at a year would put "december" under a chart comparing 2026
 * against 2025 — a label that is confidently, specifically wrong.
 */
export function previousPeriodLabel(windows: ComparisonWindows): string {
  const prev = windows.previous;
  if (!prev) return "";
  switch (windows.current.preset) {
    case "day":
      return formatDay(prev.start);
    case "week":
      return "last week";
    case "month":
      return MONTHS_LONG[Number(prev.start.slice(5, 7)) - 1];
    case "year":
      return prev.start.slice(0, 4);
    case "custom":
      return "the previous period";
    case "all":
      return "";
  }
}
