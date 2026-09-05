/**
 * Cumulative burn: this period against the comparable slice of the last one.
 *
 * Smoothed rather than stepped. The stair-step form is the literally accurate
 * one — a cumulative series really is flat then jumps — but across a month of
 * daily buckets it reads as ragged rather than as informative, and the shape a
 * reader wants from this chart is the trend, not the individual jumps. The
 * smoothing is clamped so it can never draw a dip the data does not contain.
 *
 * The x-axis is the FULL period width, not the elapsed part, so the chart does
 * not rescale itself every day and stays readable week to week.
 */

export const BURN = {
  padTop: 22,
  padBottom: 22,
  padL: 6,
  /** Room for the value label riding on the current line's end node. */
  padR: 44,
  ghostDash: "3 5",
  currentWidth: 2.6,
  previousWidth: 2,
  solidGhostOpacity: 0.55,
  tailGhostOpacity: 0.3,
} as const;

export interface BurnGeometry {
  /** Running total of this period, up to today. */
  currentPath: string;
  /** Last period, over the same elapsed days — the like-for-like part. */
  previousSolidPath: string;
  /** Last period beyond today, drawn dashed. Empty when there is no tail. */
  previousTailPath: string;
  end: { x: number; y: number } | null;
  ghostEnd: { x: number; y: number } | null;
  /** Vertical rule marking today, when the period is still running. */
  todayX: number | null;
  max: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Smooth path through the running total.
 *
 * Catmull-Rom control points, with each one CLAMPED to its own segment's y
 * range. A cumulative series only ever goes up or stays flat; unclamped
 * smoothing overshoots on the way into a spike and draws the line dipping
 * below a level it already reached, which is a number the data never had.
 * Clamping per segment makes the curve monotone by construction.
 */
function smoothPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${r2(points[0].x)},${r2(points[0].y)}`;

  let d = `M${r2(points[0].x)},${r2(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6, lo, hi);
    // Clamping both control points into the segment keeps the CURVE inside it,
    // but the two can still land out of order and put a visible waver into an
    // otherwise steady climb. Ordering the second against the first makes the
    // segment monotone rather than merely bounded.
    const c2y = p2.y <= p1.y ? clamp(p2.y - (p3.y - p1.y) / 6, lo, c1y) : clamp(p2.y - (p3.y - p1.y) / 6, c1y, hi);

    d += ` C${r2(p1.x + (p2.x - p1.x) / 3)},${r2(c1y)} ${r2(p2.x - (p2.x - p1.x) / 3)},${r2(c2y)} ${r2(p2.x)},${r2(p2.y)}`;
  }
  return d;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function buildBurn(
  current: readonly number[],
  previous: readonly number[],
  opts: { periodDays: number; elapsed: number; partial: boolean },
  width: number,
  height: number,
): BurnGeometry {
  const { periodDays, elapsed, partial } = opts;
  const plotW = width - BURN.padL - BURN.padR;
  const plotH = height - BURN.padTop - BURN.padBottom;
  const baselineY = height - BURN.padBottom;

  const empty: BurnGeometry = {
    currentPath: "",
    previousSolidPath: "",
    previousTailPath: "",
    end: null,
    ghostEnd: null,
    todayX: null,
    max: 0,
  };
  if (periodDays <= 0 || plotW <= 0 || plotH <= 0) return empty;

  // Shared scale. Two independent scales would draw two different totals as the
  // same height, which is the one thing this chart must never do.
  const max = Math.max(
    current.length ? current[current.length - 1] : 0,
    previous.length ? previous[previous.length - 1] : 0,
  );
  if (max <= 0) return { ...empty, todayX: null };
  const headroom = max * 1.08;

  const denom = Math.max(1, periodDays - 1);
  const at = (i: number, v: number) => ({
    x: BURN.padL + (i / denom) * plotW,
    y: baselineY - (v / headroom) * plotH,
  });

  const currentPoints = current.map((v, i) => at(i, v));
  const previousPoints = previous.map((v, i) => at(i, v));

  // The delta compares elapsed against elapsed; the ghost is allowed to finish
  // its month, because "where last month actually landed" is the next thing
  // anyone asks. Solid to today, dashed beyond it — both facts, no lie.
  const cut = Math.min(previousPoints.length, Math.max(1, elapsed));
  const solid = previousPoints.slice(0, cut);
  const tail = previousPoints.slice(Math.max(0, cut - 1));

  return {
    currentPath: smoothPath(currentPoints),
    previousSolidPath: smoothPath(solid),
    previousTailPath: tail.length > 1 ? smoothPath(tail) : "",
    end: currentPoints.length ? currentPoints[currentPoints.length - 1] : null,
    ghostEnd: previousPoints.length ? previousPoints[previousPoints.length - 1] : null,
    todayX: partial && elapsed > 0 ? r2(at(elapsed - 1, 0).x) : null,
    max,
  };
}
