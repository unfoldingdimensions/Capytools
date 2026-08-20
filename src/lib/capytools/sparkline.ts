
/** Round a point to 2 decimals for compact SVG output. */
const r2 = (n: number) => Math.round(n * 100) / 100;

type Pt = [number, number];

/**
 * Single source of truth for sparkline ink, shared by the live preview SVG and
 * the static data-URI used by the PNG export + OG image — so the card the user
 * previews is the card they download.
 */
export const SPARK = {
  stroke: 2.6,
  core: 4,
  halo: 7,
  haloOpacity: 0.18,
  /** Dotted guide drawn at the peak's level, so the dot has a readable value. */
  guideDash: "2 6",
  guideWidth: 1.4,
  guideOpacity: 0.5,
} as const;

/**
 * GitHub's public events feed only retains a couple of weeks, so a fixed 90-day
 * series is mostly leading zeros — which draws as a long dead-flat run. Trim it
 * to the days that actually carry data (keeping one zero as a lead-in anchor so
 * the first bar rises from the baseline instead of starting mid-air).
 */
export function trimLeadingZeros(data: number[]): { data: number[]; days: number } {
  const first = data.findIndex((v) => v > 0);
  if (first <= 0) return { data, days: data.length }; // all zeros, or already starts hot
  const sliced = data.slice(first - 1);
  return { data: sliced, days: sliced.length };
}

/**
 * Sparkline geometry: smooth line and the peak-node coords.
 * `width`/`height` MUST be the true render size in px — both consumers draw the
 * viewBox 1:1, so a mismatched ratio would stretch the stroke and squash the
 * peak dot into an ellipse.
 */
export function buildSparkline(data: number[], width = 300, height = 80) {
  const empty = { linePath: "", peakX: width, peakY: height, zero: true };
  if (data.length === 0) return empty;
  const max = Math.max(1, ...data);
  const padTop = Math.max(10, height * 0.14); // headroom for the pulsing dot's ping ring
  const padBottom = Math.max(8, height * 0.1);
  const padX = SPARK.halo; // keeps an end-of-series peak marker fully in frame
  const baselineY = height - padBottom;
  const clampY = (y: number) => Math.min(baselineY, Math.max(padTop, y));
  const pts: Pt[] = data.map((v, i) => {
    const x = data.length === 1 ? padX : padX + (i / (data.length - 1)) * (width - 2 * padX);
    const y = baselineY - (v / max) * (baselineY - padTop);
    return [x, y];
  });

  // Catmull-Rom → cubic Bézier smoothing: no visible segment joins. Control
  // points are clamped to the plot band so a spike after a flat run can't bow
  // the curve below the zero baseline.
  let line = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6);
    line += ` C${r2(c1x)},${r2(c1y)} ${r2(c2x)},${r2(c2y)} ${r2(p2[0])},${r2(p2[1])}`;
  }
  let peakIndex = 0;
  let peakVal = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > peakVal) {
      peakVal = data[i];
      peakIndex = i;
    }
  }
  const [peakX, peakY] = pts[peakIndex] ?? pts[pts.length - 1];
  return { linePath: line, peakX, peakY, zero: data.every((v) => v === 0) };
}

/**
 * Data-URI SVG sparkline for the static PNG export + dynamic OG image (Satori
 * cannot parse inline <svg>, so this stays an <img> source). Thin + smooth.
 */
export function sparklineDataUri(
  data: number[],
  water: string,
  clay: string,
  width = 300,
  height = 80,
  guide = false,
): string | null {
  const { linePath, peakX, peakY, zero } = buildSparkline(data, width, height);
  if (zero) return null;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    // Guide first, so the curve and dot sit on top of it.
    (guide
      ? `<path d="M0,${r2(peakY)} H${r2(width)}" stroke="${clay}" stroke-width="${SPARK.guideWidth}" stroke-dasharray="${SPARK.guideDash}" stroke-linecap="round" opacity="${SPARK.guideOpacity}"/>`
      : "") +
    `<path d="${linePath}" fill="none" stroke="${water}" stroke-width="${SPARK.stroke}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${r2(peakX)}" cy="${r2(peakY)}" r="${SPARK.halo}" fill="${clay}" fill-opacity="${SPARK.haloOpacity}"/>` +
    `<circle cx="${r2(peakX)}" cy="${r2(peakY)}" r="${SPARK.core}" fill="${clay}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface MonthTick {
  label: string;
  /** Fractional horizontal position (0..1) of the month's first day within the window. */
  x: number;
}

/**
 * Month tick marks across a rolling N-day window ending at `now`. Used to label
 * the sparkline timeline (e.g. MAY · JUN · JUL with the last day of the window
 * as the right edge). `windowDays` must match the span actually plotted.
 */
export function activityMonthTicks(now: Date = new Date(), windowDays = 90): MonthTick[] {
  const start = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const ticks: MonthTick[] = [];
  const startD = new Date(start);
  const seen = new Set<string>();
  const endD = new Date(now.getTime());
  let y = startD.getUTCFullYear();
  let m = startD.getUTCMonth();
  const endY = endD.getUTCFullYear();
  const endM = endD.getUTCMonth();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const push = (label: string, x: number) => {
    if (seen.has(label)) return;
    seen.add(label);
    ticks.push({ label, x: Math.min(1, Math.max(0, x)) });
  };

  push(monthNames[startD.getUTCMonth()], 0);

  while (y < endY || (y === endY && m <= endM)) {
    const monthStart = Date.UTC(y, m, 1);
    if (monthStart >= start && monthStart <= now.getTime()) {
      push(monthNames[m], (monthStart - start) / (windowDays * 24 * 60 * 60 * 1000));
    }
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return ticks;
}

/** Data-URI line-art capybara mark, usable as an <img> (Satori-safe). */
export function capyMarkDataUri(stroke: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48" fill="none">` +
    `<path d="M15 25 C15 13 22 7 32 7 C42 7 49 13 49 25 C49 34 42 40 32 40 C24 40 15 34 15 25 Z" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M23 20 h7" stroke="${stroke}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M34 20 h7" stroke="${stroke}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M22 8.5 Q24 3 28 5" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M42 8.5 Q40 3 36 5" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M18 41 q5 3 10 0 M36 41 q5 3 10 0" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
