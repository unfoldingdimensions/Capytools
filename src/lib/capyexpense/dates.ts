import type { IsoDate } from "./types";

/**
 * Calendar-date arithmetic. Every function takes and returns `"YYYY-MM-DD"`.
 *
 * TWO RULES, and both exist to stop a whole class of off-by-one-day bug:
 *
 * 1. Dates are parsed at UTC NOON, never midnight. `new Date("2026-03-14")` is
 *    UTC midnight, so anyone west of Greenwich reading `.getDate()` off it gets
 *    the 13th. Noon leaves 12 hours of slack in both directions, which covers
 *    every real timezone.
 * 2. All internal component reads use the `getUTC*` family, so DST does not
 *    exist here at all. An expense has no clock; it should not be able to move
 *    because a government changed one.
 *
 * Comparison needs no parsing: zero-padded ISO strings sort correctly with plain
 * `<`, so `"2026-09-05" < "2026-09-06"` is both true and fast.
 */

const DAY_MS = 86_400_000;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

const iso = (y: number, month1: number, day: number): IsoDate =>
  `${String(y).padStart(4, "0")}-${pad(month1)}-${pad(day)}`;

/** Shape check plus a real-calendar check, so "2026-02-31" is rejected. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m - 1);
}

/** Days in a 0-based month. Day 0 of the next month is the last of this one. */
export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Epoch ms at UTC noon on that calendar day. `NaN` for anything malformed. */
export function parseIso(d: IsoDate): number {
  if (!isIsoDate(d)) return Number.NaN;
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd, 12);
}

export function toIso(ms: number): IsoDate {
  const dt = new Date(ms);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function todayIso(now: Date = new Date()): IsoDate {
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(d: IsoDate): number {
  return new Date(parseIso(d)).getUTCDay();
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return toIso(parseIso(d) + n * DAY_MS);
}

/**
 * Add calendar months, CLAMPING to the target month's last day.
 *
 * This is the behaviour the period comparison depends on: 31 March minus one
 * month must be 28 (or 29) February, not 2 or 3 March. Naive date arithmetic
 * overflows into the following month and silently compares the wrong window.
 */
export function addMonths(d: IsoDate, n: number): IsoDate {
  const [y, m, dd] = d.split("-").map(Number);
  const target = m - 1 + n;
  const ty = y + Math.floor(target / 12);
  const tm = ((target % 12) + 12) % 12;
  return iso(ty, tm + 1, Math.min(dd, daysInMonth(ty, tm)));
}

export function startOfWeek(d: IsoDate, weekStart: 0 | 1): IsoDate {
  const back = (((dayOfWeek(d) - weekStart) % 7) + 7) % 7;
  return addDays(d, -back);
}

export function endOfWeek(d: IsoDate, weekStart: 0 | 1): IsoDate {
  return addDays(startOfWeek(d, weekStart), 6);
}

export function startOfMonth(d: IsoDate): IsoDate {
  const [y, m] = d.split("-").map(Number);
  return iso(y, m, 1);
}

export function endOfMonth(d: IsoDate): IsoDate {
  const [y, m] = d.split("-").map(Number);
  return iso(y, m, daysInMonth(y, m - 1));
}

export function startOfYear(d: IsoDate): IsoDate {
  return iso(Number(d.slice(0, 4)), 1, 1);
}

export function endOfYear(d: IsoDate): IsoDate {
  return iso(Number(d.slice(0, 4)), 12, 31);
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIso(b) - parseIso(a)) / DAY_MS);
}

/** Inclusive day count of `[a, b]`. `daysInclusive(x, x)` is 1. */
export function daysInclusive(a: IsoDate, b: IsoDate): number {
  return daysBetween(a, b) + 1;
}

export function clampDate(d: IsoDate, min: IsoDate, max: IsoDate): IsoDate {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/** "SEP" — for mono axis ticks and month dividers. */
export function monthLabel(d: IsoDate): string {
  return MONTHS_SHORT[Number(d.slice(5, 7)) - 1];
}

export function yearOf(d: IsoDate): number {
  return Number(d.slice(0, 4));
}

/**
 * Excel stores dates as a day count, and the two epochs it uses are both
 * slightly wrong in ways we have to reproduce exactly.
 *
 * The 1900 system pretends 1900 was a leap year (serial 60 is the date
 * 29 February 1900, which never happened) — a bug Lotus 1-2-3 shipped and Excel
 * kept for compatibility. So serials at or below 59 count from 1899-12-31, and
 * serials from 61 count from 1899-12-30, which absorbs the phantom day. Serial
 * 60 itself has no real calendar date and is rejected.
 *
 * The 1904 system, from old Mac Excel, simply counts from 1904-01-01 and has no
 * such wart.
 */
export function fromExcelSerial(n: number, epoch1904 = false): IsoDate | null {
  if (!Number.isFinite(n)) return null;
  const days = Math.floor(n);
  if (epoch1904) {
    if (days < 0) return null;
    return toIso(Date.UTC(1904, 0, 1, 12) + days * DAY_MS);
  }
  if (days < 1 || days === 60) return null;
  const base = days < 60 ? Date.UTC(1899, 11, 31, 12) : Date.UTC(1899, 11, 30, 12);
  return toIso(base + days * DAY_MS);
}
