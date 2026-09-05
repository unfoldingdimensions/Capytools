/**
 * Cumulative burn: this period against the comparable slice of the last one.
 *
 * STEPPED, not smoothed. A cumulative series IS a step function — flat on a day
 * with no spend, a jump on a day with some. Catmull-Rom would round every jump
 * into a slope and make five quiet days look like a slow drip.
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

/** Step path: travel along the previous level, then jump. */
function stepPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M${r2(points[0].x)},${r2(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${r2(points[i].x)},${r2(points[i - 1].y)} L${r2(points[i].x)},${r2(points[i].y)}`;
  }
  return d;
}

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
    currentPath: stepPath(currentPoints),
    previousSolidPath: stepPath(solid),
    previousTailPath: tail.length > 1 ? stepPath(tail) : "",
    end: currentPoints.length ? currentPoints[currentPoints.length - 1] : null,
    ghostEnd: previousPoints.length ? previousPoints[previousPoints.length - 1] : null,
    todayX: partial && elapsed > 0 ? r2(at(elapsed - 1, 0).x) : null,
    max,
  };
}
