import type { Slice } from "../aggregate";

/**
 * The category ribbon: one stacked bar of share, then ranked rows beneath it.
 *
 * Not a pie. A pie with five or more slices is a lookup table drawn badly — you
 * cannot compare two wedges that are not adjacent — and the ranked rows below
 * already ARE the lookup table, with exact numbers.
 */

export const RIBBON = {
  height: 14,
  radius: 7,
  /** No segment narrower than this, so a 0.3% category is still visible. */
  minSeg: 1,
  /** Beyond this many, the tail folds into one "everything else" segment. */
  maxNamed: 5,
} as const;

export const OTHER_KEY = "__other__";

export interface RibbonSegment {
  key: string;
  label: string;
  x: number;
  width: number;
  value: number;
  share: number;
  /** 0-4, mapping to --chart-1..5. The fold-in segment is -1. */
  tone: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildRibbon(slices: readonly Slice[], width: number): RibbonSegment[] {
  const positive = slices.filter((s) => s.value > 0);
  if (positive.length === 0 || width <= 0) return [];

  const named = positive.slice(0, RIBBON.maxNamed);
  const rest = positive.slice(RIBBON.maxNamed);
  const folded =
    rest.length > 0
      ? [
          {
            key: OTHER_KEY,
            label: `${rest.length} more`,
            value: rest.reduce((s, x) => s + x.value, 0),
            share: rest.reduce((s, x) => s + x.share, 0),
            count: rest.reduce((s, x) => s + x.count, 0),
          },
        ]
      : [];

  const all = [...named, ...folded];
  const segments: RibbonSegment[] = [];
  let x = 0;

  all.forEach((slice, i) => {
    const last = i === all.length - 1;
    // The last segment takes whatever is left rather than its own rounded
    // width, so accumulated rounding error can never leave a hairline of card
    // showing at the right edge.
    const w = last ? width - x : Math.max(RIBBON.minSeg, slice.share * width);
    segments.push({
      key: slice.key,
      label: slice.label,
      x: r2(x),
      width: r2(Math.max(0, w)),
      value: slice.value,
      share: slice.share,
      tone: slice.key === OTHER_KEY ? -1 : i,
    });
    x += w;
  });

  return segments;
}
