import { dayOfWeek, monthLabel, startOfWeek } from "../dates";
import type { IsoDate } from "../types";

/**
 * The calendar heatmap. The empty cell is the content.
 *
 * THREE STATES, and the distinction between the last two is the whole chart:
 *
 *   future / outside the data -> not drawn at all      ("not applicable")
 *   a known zero-spend day    -> muted fill + border   ("we know: nothing")
 *   spend                     -> sage at ramp opacity
 *
 * Painting a zero day as pale sage would make restraint look like a rounding
 * error. A day that did not happen yet must not be counted as a quiet one.
 */

export const HEAT = {
  cell: 11,
  gap: 3,
  rx: 2.5,
  padL: 26,
  padT: 16,
  minCell: 9,
  maxCols: 53,
} as const;

const PITCH = HEAT.cell + HEAT.gap;

export interface HeatDay {
  date: IsoDate;
  value: number;
  future: boolean;
  /**
   * Whether the day is inside the SELECTED range. A short range widens this
   * chart to a rolling half-year so it has a rhythm to show at all, and the
   * surrounding weeks are drawn back rather than hidden.
   */
  inRange?: boolean;
}

export interface HeatCell extends HeatDay {
  x: number;
  y: number;
  /** 0 = a known no-spend day; 1-4 = spend bands. Future days are not emitted. */
  level: number;
}

export interface MonthTick {
  label: string;
  x: number;
}

export interface HeatmapGeometry {
  cells: HeatCell[];
  months: MonthTick[];
  width: number;
  height: number;
  columns: number;
  /** How many bands the ramp actually uses — 1 to 4, driven by the data. */
  bands: number;
}

/**
 * Quantile thresholds over the NON-ZERO days.
 *
 * A linear scale is useless here: one £900 day puts every other day in the
 * bottom band and the year reads as empty with a single dot. Duplicates are
 * removed because three identical £10 days would otherwise produce three equal
 * thresholds and sort every one of them into the top band.
 */
export function quantileThresholds(values: readonly number[]): number[] {
  const nz = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (nz.length === 0) return [];
  const at = (p: number) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))];
  return [...new Set([at(0.25), at(0.5), at(0.75)])];
}

export function levelFor(value: number, thresholds: readonly number[]): number {
  if (value <= 0) return 0;
  return 1 + thresholds.filter((t) => value > t).length;
}

export function buildHeatmap(days: readonly HeatDay[], weekStart: 0 | 1): HeatmapGeometry {
  if (days.length === 0) {
    return { cells: [], months: [], width: 0, height: 0, columns: 0, bands: 0 };
  }

  const thresholds = quantileThresholds(days.filter((d) => !d.future).map((d) => d.value));
  const origin = startOfWeek(days[0].date, weekStart);

  const cells: HeatCell[] = [];
  const months: MonthTick[] = [];
  let lastMonthCol = -99;
  let lastMonth = "";
  let columns = 0;

  for (const day of days) {
    // Whole weeks elapsed since the first column began.
    const col = Math.floor(
      (Date.parse(`${day.date}T12:00:00Z`) - Date.parse(`${origin}T12:00:00Z`)) / (7 * 86_400_000),
    );
    const row = (((dayOfWeek(day.date) - weekStart) % 7) + 7) % 7;
    columns = Math.max(columns, col + 1);

    const month = monthLabel(day.date);
    // Skip a label that would collide with the previous one.
    if (month !== lastMonth && col - lastMonthCol >= 3) {
      months.push({ label: month, x: HEAT.padL + col * PITCH });
      lastMonthCol = col;
      lastMonth = month;
    } else if (month !== lastMonth) {
      lastMonth = month;
    }

    if (day.future) continue;

    cells.push({
      ...day,
      x: HEAT.padL + col * PITCH,
      y: HEAT.padT + row * PITCH,
      level: levelFor(day.value, thresholds),
    });
  }

  return {
    cells,
    months,
    width: HEAT.padL + columns * PITCH - HEAT.gap,
    height: HEAT.padT + 7 * PITCH - HEAT.gap,
    columns,
    bands: thresholds.length + 1,
  };
}

/** Fill opacity per band, spread to use the range the data actually needs. */
export function rampOpacity(level: number, bands: number): number {
  if (level <= 0) return 0;
  const ramps: Record<number, number[]> = {
    1: [0.55],
    2: [0.4, 0.85],
    3: [0.32, 0.6, 0.92],
    4: [0.28, 0.48, 0.72, 1],
  };
  const ramp = ramps[Math.min(4, Math.max(1, bands))] ?? ramps[4];
  return ramp[Math.min(ramp.length - 1, level - 1)];
}
