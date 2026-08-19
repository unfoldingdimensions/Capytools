/** Round a point to 2 decimals for compact SVG output. */
const r2 = (n: number) => Math.round(n * 100) / 100;

type Pt = [number, number];

/** Sparkline geometry: smooth line, area, and the peak-node coords. */
export function buildSparkline(data: number[], width = 300, height = 80) {
  const empty = { linePath: "", areaPath: "", endX: width, endY: height, zero: true };
  if (data.length === 0) return empty;
  const max = Math.max(1, ...data);
  const pad = Math.max(6, height * 0.12);
  const pts: Pt[] = data.map((v, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * width;
    const y = height - pad - (v / max) * (height - pad * 2);
    return [x, y];
  });

  // Catmull-Rom → cubic Bézier smoothing: no visible segment joins.
  let line = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    line += ` C${r2(c1x)},${r2(c1y)} ${r2(c2x)},${r2(c2y)} ${r2(p2[0])},${r2(p2[1])}`;
  }
  const area = `${line} L${r2(width)},${r2(height)} L0,${r2(height)} Z`;
  const [endX, endY] = pts[pts.length - 1];
  return { linePath: line, areaPath: area, endX, endY, zero: data.every((v) => v === 0) };
}

/**
 * Data-URI SVG sparkline for the static PNG export + dynamic OG image (Satori
 * cannot parse inline <svg>, so this stays an <img> source). Thin + smooth.
 */
export function sparklineDataUri(data: number[], water: string, clay: string): string | null {
  const { linePath, areaPath, endX, endY, zero } = buildSparkline(data, 300, 80);
  if (zero) return null;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">` +
    `<path d="${areaPath}" fill="${water}" fill-opacity="0.10"/>` +
    `<path d="${linePath}" fill="none" stroke="${water}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${r2(endX)}" cy="${r2(endY)}" r="10" fill="${clay}" fill-opacity="0.14"/>` +
    `<circle cx="${r2(endX)}" cy="${r2(endY)}" r="5" fill="${clay}"/></svg>`;
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
 * as the right edge).
 */
export function activityMonthTicks(now: Date = new Date(), windowDays = 90): MonthTick[] {
  const start = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const ticks: MonthTick[] = [];
  const cur = new Date(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth(), 1);
  const nowMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
  while (cur.getTime() <= nowMonth.getTime()) {
    const x = Math.min(1, Math.max(0, (cur.getTime() - start) / (windowDays * 24 * 60 * 60 * 1000)));
    ticks.push({
      label: cur.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      x,
    });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
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
