/**
 * The metrics, ported from the measured prototype. They are used by the tests
 * and by the UI's guard hints — not exposed as chrome in v1.
 *
 * The disagreement metric earned its place in the prototype: it caught two real
 * bugs that produced plausible-looking output (a dither amplitude in absolute
 * units instead of the palette's own spacing, and rows flipped on upload and
 * readback — 57% disagreement with no error raised anywhere).
 */

import { luma, oklab } from "./colour";
import type { Palette } from "./types";

/** Fraction of adjacent cell pairs that share a palette entry: how much of the
 *  frame is flat rather than textured.
 *
 * This is the metric that tells 1-bit art apart from a halftone screen. Real 1-bit
 * art is mostly solid black and solid white with dither confined to transitions, so
 * neighbouring cells usually match and it scores high. A constant-amplitude dither
 * applied everywhere covers the whole frame in texture, so almost nothing matches
 * and it lands near 0.5. */
export function flatness(indices: Uint8Array | Int32Array, cols: number, rows: number): number {
  let same = 0;
  let total = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x + 1 < cols) {
        total++;
        if (indices[i] === indices[i + 1]) same++;
      }
      if (y + 1 < rows) {
        total++;
        if (indices[i] === indices[i + cols]) same++;
      }
    }
  }
  return total ? same / total : 0;
}

/**
 * Fraction of clearly-chromatic cells whose warm/cool ordering the palette inverted.
 *
 * Mean squared error cannot see this. A blue floor rendered as dark navy scores well on
 * luminance error while looking obviously wrong — on the portrait that prompted it, one
 * entry absorbed the backdrop, the blazer AND the floor at once. This measures the thing
 * that actually reads as broken.
 */
export function hueFlipRate(
  cells: Uint8Array,
  indices: Uint8Array | Int32Array,
  palette: Palette,
  n: number,
): number {
  let considered = 0;
  let flipped = 0;
  for (let i = 0; i < n; i++) {
    const r = cells[i * 3];
    const b = cells[i * 3 + 2];
    if (Math.abs(r - b) < 30) continue; // near-neutral: no meaningful hue
    considered++;
    const p = palette[indices[i]];
    if ((r - b) * (p[0] - p[2]) < 0) flipped++;
  }
  return considered ? flipped / considered : 0;
}

/**
 * Every output colour must be a member of the active palette. Cheap, and it is the
 * assertion that actually catches quantiser regressions. Returns the count of
 * out-of-range indices — zero is the invariant.
 */
export function assertPaletteMembership(indices: Uint8Array | Int32Array, palette: Palette): number {
  let bad = 0;
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] < 0 || indices[i] >= palette.length) bad++;
  }
  return bad;
}

/**
 * Mean squared Oklab error of the quantised grid against the source grid — the
 * quality column that stops a speed-only verdict.
 */
export function oklabError(
  cells: Uint8Array,
  indices: Uint8Array | Int32Array,
  palette: Palette,
  n: number,
): number {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = oklab(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]);
    const p = palette[indices[i]];
    const b = oklab(p[0], p[1], p[2]);
    const dl = a[0] - b[0];
    const da = a[1] - b[1];
    const db = a[2] - b[2];
    sum += dl * dl + da * da + db * db;
  }
  return sum / n;
}

/** Fraction of indices that differ between two runs — 0 is the determinism invariant. */
export function disagreement(a: Uint8Array | Int32Array, b: Uint8Array | Int32Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return a.length ? d / a.length : 0;
}

/**
 * p5–p95 of luminance. A coarse check that contrast survived quantisation: if this
 * collapses towards zero, the image has been squeezed into a narrow band of the ramp.
 */
export function toneSpread(cells: Uint8Array, n: number): number {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = luma(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]);
  const s = Float32Array.from(v).sort();
  const at = (q: number) => s[Math.max(0, Math.min(n - 1, Math.round(q * (n - 1))))];
  return (at(0.95) - at(0.05)) / 255;
}

/**
 * Edge selectivity: mean |dL| across the strongest decile of SOURCE gradients, divided
 * by mean |dL| across every adjacent pair in the OUTPUT.
 *
 * This is the number that can see flatness, which mean squared error cannot. A uniform
 * dither field inflates the denominator everywhere while contributing nothing at the real
 * boundary, so it scores near 1. A result that keeps its contrast where the source had an
 * edge and leaves flat regions flat scores well above 1. Roughly: "how much of the
 * output's contrast is in the right places".
 */
export function edgeSelectivity(
  cells: Uint8Array,
  indices: Uint8Array | Int32Array,
  palette: Palette,
  cols: number,
  rows: number,
): number {
  const n = cols * rows;
  const srcL = new Float32Array(n);
  for (let i = 0; i < n; i++) srcL[i] = luma(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]) / 255;

  const palL = palette.map((p) => oklab(p[0], p[1], p[2])[0]);
  const pairs: Array<[number, number]> = [];
  let sumAll = 0;
  let countAll = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x + 1 < cols) {
        const j = i + 1;
        const d = Math.abs(srcL[i] - srcL[j]);
        const o = Math.abs(palL[indices[i]] - palL[indices[j]]);
        pairs.push([d, o]);
        sumAll += o;
        countAll++;
      }
      if (y + 1 < rows) {
        const j = i + cols;
        const d = Math.abs(srcL[i] - srcL[j]);
        const o = Math.abs(palL[indices[i]] - palL[indices[j]]);
        pairs.push([d, o]);
        sumAll += o;
        countAll++;
      }
    }
  }
  if (!countAll) return 0;

  pairs.sort((a, b) => b[0] - a[0]);
  const topN = Math.max(1, Math.round(pairs.length * 0.1));
  let sumTop = 0;
  for (let i = 0; i < topN; i++) sumTop += pairs[i][1];

  const meanAll = sumAll / countAll;
  if (meanAll < 1e-9) return 0;
  return sumTop / topN / meanAll;
}
