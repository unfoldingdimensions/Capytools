/** Build an SVG sparkline path (line + area) and the peak-node coords. */
export function buildSparkline(data: number[], width = 100, height = 30) {
  if (data.length === 0) {
    return { linePath: "", areaPath: "", endX: width, endY: height, zero: true };
  }
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 3) - 1.5;
    return [x, y] as const;
  });
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [endX, endY] = pts[pts.length - 1];
  return { linePath: line, areaPath: area, endX, endY, zero: data.every((v) => v === 0) };
}

/**
 * Data-URI SVG sparkline, usable as a CSS `background-image`. This is the ONLY
 * form that renders identically in the browser (for the PNG export) AND inside
 * Satori (for the dynamic OG image), since Satori cannot parse <svg><path>.
 */
export function sparklineDataUri(data: number[], water: string, clay: string): string | null {
  const { linePath, areaPath, endX, endY, zero } = buildSparkline(data, 100, 30);
  if (zero) return null;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30" viewBox="0 0 100 30" preserveAspectRatio="none">` +
    `<path d="${areaPath}" fill="${water}" fill-opacity="0.08"/>` +
    `<path d="${linePath}" fill="none" stroke="${water}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${endX}" cy="${endY}" r="2.4" fill="${clay}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Data-URI line-art capybara mark, usable as a CSS background-image (Satori-safe). */
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
