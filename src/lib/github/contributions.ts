import { GithubError } from "./types";
import { sanitizeUsername } from "@/lib/utils";

export interface ContributionDay {
  date: string; // YYYY-MM-DD, UTC
  count: number;
}

export interface ActivityWindow {
  /** The plotted series, oldest first — monthly totals for month-scale windows. */
  series: number[];
  /** Month labels aligned to `series`, x = 0..1. */
  ticks: { label: string; x: number }[];
  /** Days spanned by the window (== series.length). */
  days: number;
  /** Whole months the window covers, for the month-scale label. */
  months: number;
  /** Human label for the stat cell, e.g. "12 months" / "5 months" / "23 days". */
  label: string;
  /** Total contributions inside the window. */
  count: number;
  /** No contributions at all in the last 12 months. */
  empty: boolean;
  /** Busiest plotted point — the value the peak marker sits on, and when. */
  peak: { value: number; label: string } | null; // label e.g. "Jan 2026"
}

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_DAYS = 365;
const QUARTER_DAYS = 90;

/**
 * Fetch + parse the contribution calendar straight from github.com. Server-side
 * only: the browser can't read github.com cross-origin, which is why the
 * `/api/contributions` proxy exists for client callers.
 */
export async function fetchContributions(username: string): Promise<ContributionDay[]> {
  const clean = sanitizeUsername(username);
  const res = await fetch(`https://github.com/users/${encodeURIComponent(clean)}/contributions`, {
    headers: { Accept: "text/html", "User-Agent": "capytools" },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 1800 },
  } as RequestInit);
  if (res.status === 404) throw new GithubError("not_found", `No such user: ${clean}`);
  if (!res.ok) throw new GithubError("network", `Contributions page returned ${res.status}`);
  return parseContributions(await res.text());
}

/** Fetch the last ~12 months of daily contribution counts via our proxy route. */
export async function getContributions(username: string): Promise<ContributionDay[]> {
  const clean = sanitizeUsername(username);
  const res = await fetch(`/api/contributions/${encodeURIComponent(clean)}`);
  if (res.status === 404) throw new GithubError("not_found", `No such user: ${clean}`);
  if (!res.ok) throw new GithubError("network", `Contributions lookup failed (${res.status})`);
  const body = (await res.json()) as { days?: ContributionDay[] };
  return body.days ?? [];
}

/**
 * Pick the chart window from a year of daily counts:
 *
 *  1. active for more than 12 months  → the last 12 months
 *  2. active for 3–12 months          → whole months back to the first activity (e.g. 5 months)
 *  3. active for less than 90 days    → from the first active day
 *  4. no activity in the last 12 mo   → empty
 *
 * "Active for" means time since the earliest contribution in the fetched year,
 * so case 1 also covers anyone whose history predates the window entirely. The
 * calendar always ends on today, so no `now` is needed to anchor the window.
 */
export function activityWindow(days: ContributionDay[]): ActivityWindow {
  const firstActive = days.findIndex((d) => d.count > 0);
  if (days.length === 0 || firstActive === -1) {
    return {
      series: [],
      ticks: [],
      days: 0,
      months: 0,
      label: "last 12 months",
      count: 0,
      empty: true,
      peak: null,
    };
  }

  const spanDays = days.length - firstActive;
  let startIndex: number;
  let label: string;

  if (spanDays > YEAR_DAYS) {
    startIndex = Math.max(0, days.length - YEAR_DAYS);
    label = "12 months";
  } else if (spanDays >= QUARTER_DAYS) {
    // Round out to whole months so the axis reads as "5 months", not "148 days".
    const months = monthsBetween(days[firstActive].date, days[days.length - 1].date);
    startIndex = Math.max(
      0,
      days.findIndex((d) => d.date >= monthStartNMonthsBack(days[days.length - 1].date, months)),
    );
    label = `${months} months`;
  } else {
    startIndex = firstActive;
    label = `${spanDays} days`;
  }

  const window = days.slice(startIndex);
  const monthScale = spanDays >= QUARTER_DAYS;
  const buckets = monthScale ? totalsByMonth(window) : null;

  const series = buckets ? buckets.map((b) => b.total) : window.map((d) => d.count);
  // Month for each plotted point, so the peak can name itself.
  const pointMonths = buckets ? buckets.map((b) => b.month) : window.map((d) => d.date.slice(0, 7));
  let peakIndex = 0;
  for (let i = 1; i < series.length; i++) if (series[i] > series[peakIndex]) peakIndex = i;

  return {
    series,
    ticks: buckets ? monthLabels(buckets.map((b) => b.month)) : dayMonthTicks(window),
    days: window.length,
    months: monthsBetween(window[0].date, window[window.length - 1].date),
    label,
    count: window.reduce((sum, d) => sum + d.count, 0),
    empty: false,
    peak: {
      value: series[peakIndex],
      label: monthTitle(pointMonths[peakIndex]),
    },
  };
}

/** "2026-01" → "Jan 2026", for the peak annotation. */
function monthTitle(yearMonth: string): string {
  const abbr = MONTHS[Number(yearMonth.slice(5, 7)) - 1];
  return `${abbr[0]}${abbr.slice(1).toLowerCase()} ${yearMonth.slice(0, 4)}`;
}

/** Sum daily counts into calendar months, oldest first. */
function totalsByMonth(days: ContributionDay[]): { month: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const d of days) {
    const key = d.date.slice(0, 7); // YYYY-MM
    totals.set(key, (totals.get(key) ?? 0) + d.count);
  }
  return [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));
}

/** One label per plotted month, evenly spaced across the series. */
function monthLabels(months: string[]): { label: string; x: number }[] {
  const span = Math.max(1, months.length - 1);
  return thin(
    months.map((m, i) => ({ label: MONTHS[Number(m.slice(5, 7)) - 1], x: i / span })),
  );
}

/** Busiest weekday name across a window of daily counts (UTC), or "—". */
export function busiestWeekday(days: ContributionDay[]): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const totals = new Array<number>(7).fill(0);
  for (const d of days) totals[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count;
  let best = -1;
  let bestCount = 0;
  for (let i = 0; i < 7; i++) {
    if (totals[i] > bestCount) {
      best = i;
      bestCount = totals[i];
    }
  }
  return best >= 0 ? names[best] : "—";
}

/** Whole calendar months spanned, inclusive of both ends (min 1). */
function monthsBetween(fromISO: string, toISO: string): number {
  const [fy, fm] = fromISO.split("-").map(Number);
  const [ty, tm] = toISO.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

/** First day of the month `n - 1` months before `toISO`'s month, as YYYY-MM-DD. */
function monthStartNMonthsBack(toISO: string, n: number): string {
  const [y, m] = toISO.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - (n - 1), 1));
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Month boundaries positioned by day index — used for sub-90-day windows. */
export function dayMonthTicks(days: ContributionDay[]): { label: string; x: number }[] {
  if (days.length === 0) return [];
  const span = Math.max(1, days.length - 1);
  const ticks: { label: string; x: number }[] = [];
  let lastMonth = -1;
  days.forEach((d, i) => {
    const month = Number(d.date.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;
    ticks.push({ label: MONTHS[month], x: i / span });
  });
  return thin(ticks);
}

/**
 * A year of labels won't fit the axis: keep every other one, but always keep
 * the last so the axis ends on the month the window ends in.
 */
function thin(ticks: { label: string; x: number }[]): { label: string; x: number }[] {
  if (ticks.length <= 7) return ticks;
  const last = ticks.length - 1;
  return ticks.filter((_, i) => i % 2 === 0 || i === last);
}

/**
 * Pull `{ date, count }` out of the calendar markup. Each day cell carries the
 * date and an id; the exact count lives in the screen-reader tool-tip that
 * points back at that id ("6 contributions on August 17th."). Cells with no
 * contributions say "No contributions on …", which parses to 0.
 */
export function parseContributions(html: string): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*\sfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*(\d[\d,]*)\s+contribution/.exec(m[2]);
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }

  const days: { date: string; count: number }[] = [];
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"/g)) {
    days.push({ date: m[1], count: counts.get(m[2]) ?? 0 });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

export { DAY_MS };
