import type { SeriesPoint } from "../aggregate";

/**
 * Spend over time, as BARS — not as a smoothed line.
 *
 * `buildSparkline` in `src/lib/capytools/sparkline.ts` smooths with Catmull-Rom
 * because it is decoration: nobody reads a value off a CapyWrapped card. This
 * chart is read. Smoothing between two daily totals draws money on days it was
 * not spent, and the curve bows below zero on the day after a spike.
 *
 * Smooth what is sampled; bar what is bucketed; step what is accumulated.
 */

export const BARS = {
  padTop: 18,
  padBottom: 22,
  padX: 2,
  /** Any non-zero bucket gets at least this, so a £3 day survives beside a £900 one. */
  minBarH: 2,
  maxRx: 3,
  gapRatio: 0.22,
  maxTicks: 5,
} as const;

export interface Bar extends SeriesPoint {
  x: number;
  y: number;
  width: number;
  height: number;
  isPeak: boolean;
}

export interface BarsGeometry {
  bars: Bar[];
  baselineY: number;
  peak: Bar | null;
  ticks: { x: number; label: string }[];
  max: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function buildBars(
  points: readonly SeriesPoint[],
  width: number,
  height: number,
): BarsGeometry {
  const baselineY = height - BARS.padBottom;
  if (points.length === 0 || width <= 0) {
    return { bars: [], baselineY, peak: null, ticks: [], max: 0 };
  }

  const max = Math.max(0, ...points.map((p) => p.value));
  const plot = baselineY - BARS.padTop;
  const slot = (width - 2 * BARS.padX) / points.length;
  // A year of daily bars in a half-width card leaves almost no room; collapse
  // the gap rather than letting bars vanish.
  const gap = slot * BARS.gapRatio < 1 || slot - slot * BARS.gapRatio < 1.5
    ? Math.min(0.5, slot / 4)
    : clamp(slot * BARS.gapRatio, 1, 6);
  const barW = Math.max(0.5, slot - gap);

  let peakIndex = -1;
  points.forEach((p, i) => {
    if (p.value > 0 && (peakIndex < 0 || p.value > points[peakIndex].value)) peakIndex = i;
  });

  const bars: Bar[] = points.map((p, i) => {
    const h = p.value <= 0 ? 0 : Math.max(BARS.minBarH, max > 0 ? (p.value / max) * plot : 0);
    return {
      ...p,
      x: r2(BARS.padX + i * slot + gap / 2),
      y: r2(baselineY - h),
      width: r2(barW),
      height: r2(h),
      isPeak: i === peakIndex,
    };
  });

  // Always label the last bucket even when the stride would skip it: a chart
  // whose axis stops early looks like a chart whose data stops early.
  const stride = Math.max(1, Math.ceil(points.length / BARS.maxTicks));
  const tickIndexes = new Set<number>();
  for (let i = 0; i < points.length; i += stride) tickIndexes.add(i);
  tickIndexes.add(points.length - 1);

  const ticks = [...tickIndexes]
    .sort((a, b) => a - b)
    .map((i) => ({ x: r2(bars[i].x + bars[i].width / 2), label: points[i].label }));

  return { bars, baselineY, peak: peakIndex >= 0 ? bars[peakIndex] : null, ticks, max };
}
