import type { Bucket, DateRange } from "./bucket";
import { bucketKey, bucketsIn, filterRange } from "./bucket";
import type { ComparisonWindows, Delta } from "./compare";
import { comparisonWindows, delta, periodDays } from "./compare";
import { addDays, daysBetween, daysInclusive, minDate } from "./dates";
import type { Interval, IsoDate, Transaction } from "./types";

/**
 * Every number the dashboard shows, derived here and nowhere else.
 *
 * `buildDashboard` is the single entry point: one pure call in, one plain object
 * out. Components never compute — they format. That is what lets the same
 * components render in the Tauri app and on a server-rendered marketing page,
 * and what makes the whole analysis layer snapshot-testable without a DOM.
 */

/**
 * How a row contributes to SPEND.
 *
 * A refund reduces what you spent in its category. Income is not negative spend
 * — it never belonged to a spending category in the first place, so it scores
 * zero here and shows up only in cash flow.
 */
export function spendOf(tx: Transaction): number {
  if (tx.kind === "expense") return tx.amount;
  if (tx.kind === "refund") return -tx.amount;
  return 0;
}

/** How a row contributes to NET CASH FLOW: money out is negative. */
export function cashOf(tx: Transaction): number {
  return tx.kind === "expense" ? -tx.amount : tx.amount;
}

export interface Totals {
  spend: number;
  refunds: number;
  income: number;
  /** Income and refunds minus expenses. Negative in any normal month. */
  net: number;
  count: number;
}

export function totals(txs: readonly Transaction[]): Totals {
  let spend = 0;
  let refunds = 0;
  let income = 0;
  for (const t of txs) {
    spend += spendOf(t);
    if (t.kind === "refund") refunds += t.amount;
    if (t.kind === "income") income += t.amount;
  }
  // `spend` is already net of refunds, so cash flow is just income less spend.
  return { spend, refunds, income, net: income - spend, count: txs.length };
}

export interface Slice {
  key: string;
  label: string;
  value: number;
  /** Fraction of positive spend. Zero for a slice that nets out negative. */
  share: number;
  count: number;
}

/**
 * Group and rank by spend. The denominator is the sum of the POSITIVE slices, so
 * shares always sum to exactly 1 across them; a category that nets negative
 * (more refunded than spent) gets a share of 0 rather than a nonsense negative
 * wedge that a chart would have to draw backwards.
 */
function group(
  txs: readonly Transaction[],
  keyOf: (t: Transaction) => string | null,
  fallback: string,
): Slice[] {
  const acc = new Map<string, { value: number; count: number }>();
  for (const t of txs) {
    const raw = keyOf(t);
    const key = raw === null || raw.trim() === "" ? fallback : raw;
    const cur = acc.get(key) ?? { value: 0, count: 0 };
    cur.value += spendOf(t);
    cur.count += 1;
    acc.set(key, cur);
  }

  const denom = [...acc.values()].reduce((s, v) => s + Math.max(0, v.value), 0);
  return [...acc.entries()]
    .map(([key, v]) => ({
      key,
      label: key,
      value: v.value,
      share: denom > 0 && v.value > 0 ? v.value / denom : 0,
      count: v.count,
    }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

export function byCategory(txs: readonly Transaction[]): Slice[] {
  return group(txs, (t) => t.category, "uncategorised");
}

export function byType(txs: readonly Transaction[]): Slice[] {
  return group(txs, (t) => t.type, "one-time");
}

export function byPaymentMethod(txs: readonly Transaction[]): Slice[] {
  return group(txs, (t) => t.paymentMethod, "not recorded");
}

export function byAccount(txs: readonly Transaction[]): Slice[] {
  return group(txs, (t) => t.account, "not recorded");
}

export function needVsWant(txs: readonly Transaction[]): {
  need: Slice;
  want: Slice;
  unknown: Slice;
} {
  const slices = group(txs, (t) => t.needWant, "unsorted");
  const pick = (key: string): Slice =>
    slices.find((s) => s.key === key) ?? { key, label: key, value: 0, share: 0, count: 0 };
  return { need: pick("need"), want: pick("want"), unknown: pick("unsorted") };
}

export interface SeriesPoint extends Bucket {
  value: number;
  count: number;
}

/** Dense series for the trend chart — empty buckets included, at value 0. */
export function byBucket(
  txs: readonly Transaction[],
  range: DateRange,
  weekStart: 0 | 1,
): SeriesPoint[] {
  const acc = new Map<string, { value: number; count: number }>();
  for (const t of filterRange(txs, range)) {
    const key = bucketKey(t.date, range.grain, weekStart);
    const cur = acc.get(key) ?? { value: 0, count: 0 };
    cur.value += spendOf(t);
    cur.count += 1;
    acc.set(key, cur);
  }
  return bucketsIn(range, weekStart).map((b) => ({
    ...b,
    value: acc.get(b.key)?.value ?? 0,
    count: acc.get(b.key)?.count ?? 0,
  }));
}

/** Spend per calendar day across a window. Dense; zero-spend days are present. */
export function dailyTotals(txs: readonly Transaction[], start: IsoDate, days: number): number[] {
  const acc = new Map<IsoDate, number>();
  for (const t of txs) acc.set(t.date, (acc.get(t.date) ?? 0) + spendOf(t));
  return Array.from({ length: Math.max(0, days) }, (_, i) => acc.get(addDays(start, i)) ?? 0);
}

/** Running total by elapsed-day index — the burn chart's y-values. */
export function cumulative(daily: readonly number[]): number[] {
  let running = 0;
  return daily.map((v) => (running += v));
}

export interface NoSpendStats {
  /** Days in the window, up to today, with nothing recorded against them. */
  days: number;
  /** Days actually examined — a future date is not a no-spend day. */
  outOf: number;
  longestRun: number;
  longestRunStart: IsoDate | null;
  longestRunEnd: IsoDate | null;
}

/**
 * The one metric that goes UP when the user does well. Only days that have
 * actually happened are counted: the rest of the month is not a winning streak.
 */
export function noSpendStats(
  txs: readonly Transaction[],
  start: IsoDate,
  elapsedDays: number,
): NoSpendStats {
  const daily = dailyTotals(txs, start, elapsedDays);
  let days = 0;
  let run = 0;
  let longestRun = 0;
  let longestEndIndex = -1;

  daily.forEach((v, i) => {
    if (v === 0) {
      days += 1;
      run += 1;
      if (run > longestRun) {
        longestRun = run;
        longestEndIndex = i;
      }
    } else {
      run = 0;
    }
  });

  const longestRunEnd = longestEndIndex >= 0 ? addDays(start, longestEndIndex) : null;
  return {
    days,
    outOf: Math.max(0, elapsedDays),
    longestRun,
    longestRunStart: longestRunEnd ? addDays(longestRunEnd, -(longestRun - 1)) : null,
    longestRunEnd,
  };
}

/** Charges per year, by cadence. */
export const ANNUAL_FACTOR: Record<Interval, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/** Nominal days between charges, for the "is it still live?" heuristic. */
const INTERVAL_DAYS: Record<Interval, number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 30.44,
  quarterly: 91.31,
  yearly: 365.25,
};

export interface SubscriptionLine {
  key: string;
  label: string;
  /** The most recent charge, which is what a renewal will most likely cost. */
  amount: number;
  interval: Interval;
  monthlyEquivalent: number;
  annualised: number;
  lastCharged: IsoDate;
  nextDue: IsoDate;
  active: boolean;
  count: number;
}

export interface SubscriptionSummary {
  lines: SubscriptionLine[];
  activeCount: number;
  monthlyCommitment: number;
  annualCommitment: number;
}

/** Next charge after `now`, rolled forward from the last one actually seen. */
export function nextDue(lastCharged: IsoDate, interval: Interval, now: IsoDate): IsoDate {
  const step = INTERVAL_DAYS[interval];
  let due = lastCharged;
  // Bounded: even a weekly sub last seen a decade ago settles well inside this.
  for (let i = 0; due <= now && i < 1000; i++) {
    due = addDays(lastCharged, Math.round(step * (i + 1)));
  }
  return due;
}

/**
 * What the user is committed to, annualised.
 *
 * Rows are folded by category + note + amount, because a subscription is the
 * same subscription each month and the workbook has no id column to prove it.
 *
 * `active` is a documented heuristic, not a fact: a line counts as live if its
 * last charge is within `activeWithinFactor` intervals of today. A monthly sub
 * paid on the 1st and viewed on the 28th of the next month is still live; one
 * unpaid for 46 days is not. Upgrade path if it misfires: an appended
 * "cancelled on" column, per schema rule 2.
 */
export function subscriptions(
  txs: readonly Transaction[],
  now: IsoDate,
  opts: { activeWithinFactor?: number } = {},
): SubscriptionSummary {
  const factor = opts.activeWithinFactor ?? 1.5;
  const acc = new Map<string, { amount: number; interval: Interval; last: IsoDate; count: number; label: string }>();

  for (const t of txs) {
    if (t.type !== "subscription" || t.kind !== "expense") continue;
    const interval = t.interval ?? "monthly";
    const label = t.note.trim() || t.category;
    const key = `${t.category.toLowerCase()}|${t.note.trim().toLowerCase()}|${t.amount}`;
    const cur = acc.get(key);
    if (!cur) {
      acc.set(key, { amount: t.amount, interval, last: t.date, count: 1, label });
    } else {
      cur.count += 1;
      if (t.date > cur.last) {
        cur.last = t.date;
        cur.amount = t.amount;
        cur.interval = interval;
      }
    }
  }

  const lines: SubscriptionLine[] = [...acc.entries()]
    .map(([key, v]) => {
      const annualised = v.amount * ANNUAL_FACTOR[v.interval];
      return {
        key,
        label: v.label,
        amount: v.amount,
        interval: v.interval,
        monthlyEquivalent: annualised / 12,
        annualised,
        lastCharged: v.last,
        nextDue: nextDue(v.last, v.interval, now),
        active: daysBetween(v.last, now) <= INTERVAL_DAYS[v.interval] * factor,
        count: v.count,
      };
    })
    .sort((a, b) => b.annualised - a.annualised || a.label.localeCompare(b.label));

  const live = lines.filter((l) => l.active);
  return {
    lines,
    activeCount: live.length,
    monthlyCommitment: live.reduce((s, l) => s + l.monthlyEquivalent, 0),
    annualCommitment: live.reduce((s, l) => s + l.annualised, 0),
  };
}

export function biggest(txs: readonly Transaction[], n: number): Transaction[] {
  return [...txs]
    .filter((t) => t.kind === "expense")
    .sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date))
    .slice(0, n);
}

export function mostRecent(txs: readonly Transaction[], n: number): Transaction[] {
  return [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, n);
}

export interface DashboardModel {
  range: DateRange;
  windows: ComparisonWindows;
  currency: string;
  /** True when the range holds nothing — drives every empty state at once. */
  empty: boolean;

  totals: Totals;
  spendDelta: Delta;
  /** Spend per day ELAPSED, not per calendar day: a half-month must not look half as bad. */
  perDay: number;
  /** Where the period lands if the current pace holds. `null` once it is over. */
  projected: number | null;

  series: SeriesPoint[];
  categories: Slice[];
  types: Slice[];
  methods: Slice[];
  accounts: Slice[];
  needWant: ReturnType<typeof needVsWant>;
  subs: SubscriptionSummary;
  noSpend: NoSpendStats;

  /** Heatmap cells: the whole range, dense, with future days marked. */
  daily: { date: IsoDate; value: number; future: boolean }[];

  /** Burn chart. Both series are indexed by elapsed-day offset from day one. */
  burn: {
    current: number[];
    previous: number[];
    elapsed: number;
    periodDays: number;
    previousPeriodDays: number;
    previousTotal: number | null;
  };

  biggest: Transaction[];
  recent: Transaction[];
}

export function buildDashboard(
  all: readonly Transaction[],
  range: DateRange,
  opts: { now: IsoDate; weekStart: 0 | 1; currency: string },
): DashboardModel {
  const { now, weekStart, currency } = opts;
  const windows = comparisonWindows(range, now, weekStart);

  // Everything below the headline is computed over the ELAPSED window, so the
  // comparison and the widgets always describe the same stretch of time.
  const current = filterRange(all, windows.current);
  const previous = windows.previous ? filterRange(all, windows.previous) : null;

  const t = totals(current);
  const prevSpend = previous ? totals(previous).spend : null;
  const spendDelta = delta(t.spend, prevSpend, windows);

  const fullDays = periodDays(range);
  const elapsed = windows.elapsedDays;
  const perDay = elapsed > 0 ? t.spend / elapsed : 0;

  const currentDaily = dailyTotals(current, range.start, elapsed);

  // The ghost line draws the previous period's WHOLE tail, which means reading a
  // wider window than the delta compares. `previous` above is clipped to the
  // elapsed comparison; re-filter over the full previous period here, or the
  // tail comes back as a run of zeros.
  const prevDays = windows.previous ? previousFullDays(windows, fullDays) : 0;
  const prevFullRange = windows.previous
    ? { ...windows.previous, end: addDays(windows.previous.start, prevDays - 1) }
    : null;
  const prevFullRows = prevFullRange ? filterRange(all, prevFullRange) : [];
  const previousDaily = prevFullRange
    ? dailyTotals(prevFullRows, prevFullRange.start, prevDays)
    : [];

  const heatEnd = minDate(range.end, now);
  const heatDays = Math.max(0, daysInclusive(range.start, range.end));
  const dailyAll = dailyTotals(filterRange(all, range), range.start, heatDays);

  return {
    range,
    windows,
    currency,
    empty: current.length === 0,

    totals: t,
    spendDelta,
    perDay,
    projected: windows.partial && elapsed > 0 ? perDay * fullDays : null,

    series: byBucket(all, range, weekStart),
    categories: byCategory(current),
    types: byType(current),
    methods: byPaymentMethod(current),
    accounts: byAccount(current),
    needWant: needVsWant(current),
    // Subscriptions look at EVERY row, not just this range: a yearly renewal
    // seen once in March is still a commitment when you are looking at
    // September, and scoping it to the range would hide it eleven months a year.
    subs: subscriptions(all, now),
    noSpend: noSpendStats(current, range.start, elapsed),

    daily: dailyAll.map((value, i) => {
      const date = addDays(range.start, i);
      return { date, value, future: date > heatEnd };
    }),

    burn: {
      current: cumulative(currentDaily),
      previous: cumulative(previousDaily),
      elapsed,
      periodDays: fullDays,
      previousPeriodDays: previousDaily.length,
      // Where the previous period FINISHED — the label at the end of the ghost.
      // The headline delta stays strictly elapsed-to-elapsed; this is the extra
      // fact, not a replacement for it.
      previousTotal: prevFullRange ? totals(prevFullRows).spend : null,
    },

    biggest: biggest(current, 5),
    recent: mostRecent(current, 8),
  };
}

/**
 * How many days of the previous period the ghost line may draw.
 *
 * CAPPED at the current period's length, never stretched to it. A 28-day
 * February against a 31-day March draws 28 points and stops short — which is
 * true, and which the chart labels. Stretching it to 31 would invent three days
 * of spending that did not happen.
 */
function previousFullDays(windows: ComparisonWindows, currentPeriodDays: number): number {
  if (!windows.previous) return 0;
  return Math.min(fullPeriodOf(windows.previous), currentPeriodDays);
}

function fullPeriodOf(range: DateRange): number {
  switch (range.preset) {
    case "month": {
      const [y, m] = range.start.split("-").map(Number);
      return new Date(Date.UTC(y, m, 0)).getUTCDate();
    }
    case "week":
      return 7;
    case "day":
      return 1;
    case "year":
      return daysInclusive(range.start, `${range.start.slice(0, 4)}-12-31`);
    default:
      return daysInclusive(range.start, range.end);
  }
}
