/**
 * Dithering, ported from the measured prototype.
 *
 * Ordered dither is chosen over blue noise because it is *deterministic*: the
 * same image and settings must produce byte-identical output or the visual
 * regression stills in the prototype's _shots/ are worthless. Floyd–Steinberg
 * is inherently sequential — each pixel's error feeds the next — which is the
 * honest reason a fragment pass cannot offer it, and why the engine seam in
 * quantize.ts stays CPU-only in v1.
 */

import { oklab } from "./colour";
import { nearest } from "./palette";
import type { Palette } from "./types";

/** 4×4 ordered (Bayer) matrix. */
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** [-0.5, 0.5) at cell (i, j). `& 3` is cheap modulo for the power-of-two tile. */
export function bayer(i: number, j: number): number {
  return BAYER[j & 3][i & 3] / 16 - 0.5;
}

/**
 * The dither bias must be expressed in the palette's own luminance spacing, not in
 * absolute Oklab units. A fixed bias looks fine on a 7-entry ramp and destroys a
 * 16-entry one, because the step between adjacent entries changes by an order of
 * magnitude. Deriving it here means every engine dithers at the same amplitude,
 * which is what makes their outputs comparable at all.
 */
export function lRange(plab: Array<[number, number, number]>): number {
  if (plab.length < 2) return 0.1;
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < plab.length; i++) {
    const L = plab[i][0];
    if (L < mn) mn = L;
    if (L > mx) mx = L;
  }
  return (mx - mn) / (plab.length - 1);
}

export interface BracketTable {
  lo: Float32Array;
  hi: Float32Array;
  sorted: Float32Array;
}

/**
 * 256-entry table of the two palette entries bracketing any tone, so the per-cell
 * dither can be scaled to the LOCAL palette spacing in O(1) rather than scanning
 * the palette.
 */
export function bracketTable(plab: Array<[number, number, number]>): BracketTable {
  const Ls = plab.map((p) => p[0]);
  Ls.sort((a, b) => a - b);
  const lo = new Float32Array(256);
  const hi = new Float32Array(256);
  let k = 0;
  for (let b = 0; b < 256; b++) {
    const L = b / 255;
    while (k < Ls.length - 1 && Ls[k + 1] <= L) k++;
    lo[b] = Ls[k];
    hi[b] = Ls[Math.min(Ls.length - 1, k + 1)];
  }
  return { lo, hi, sorted: Float32Array.from(Ls) };
}

/**
 * Contrast-modulated dither — the difference between 1-bit ART and a halftone screen.
 *
 * The first version of this used a constant amplitude, computed from the palette's
 * *global* luminance range. On a 2-entry palette that range is 1.0, so the amplitude
 * was 1.4 and the bias ±0.7 on an axis spanning only 0→1: every cell that was not
 * exactly pure black or pure white flipped with the Bayer phase. Nothing was ever
 * solid, which is precisely the one thing 1-bit art is made of.
 *
 * Now the bias is scaled to the gap between the two entries actually bracketing this
 * tone, and faded out as the tone approaches one of them. A cell that sits decisively
 * near an entry gets zero bias and snaps solid; only the band around the midpoint
 * dithers. `band` is the fraction of the bracket that dithers, so band=1 is the old
 * screen behaviour and band=0 disables dithering entirely.
 */
export function ditherBias(
  L: number,
  br: BracketTable,
  i: number,
  j: number,
  amount: number,
  band: number,
): number {
  const b = L <= 0 ? 0 : L >= 1 ? 255 : (L * 255) | 0;
  const a = br.lo[b];
  const c = br.hi[b];
  const span = c - a;
  if (span < 1e-6) return 0; // single entry in range: nothing to dither
  const t = (L - a) / span;
  const d = Math.abs(t - 0.5) * 2; // 0 at the bracket centre, 1 at its edges
  if (d >= band) return 0; // decisive: snap solid
  return bayer(i, j) * span * amount * 1.4 * (1 - d / band);
}

/**
 * Floyd–Steinberg. Inherently sequential: each pixel's error feeds the next, so it
 * cannot be expressed as a per-pixel parallel pass — measured, not assumed, in the
 * prototype's bench.
 *
 * `lookup` lets an engine swap in its own nearest-search, so the diffusion schedule
 * stays identical and only the search differs.
 */
export function floydSteinberg(
  cells: Uint8Array,
  palette: Palette,
  cols: number,
  rows: number,
  amount: number,
  lookup?: (L: number, a: number, b: number) => number,
): Int32Array {
  const n = cols * rows;
  const work = Float32Array.from(cells);
  const out = new Int32Array(n);
  const plab = palette.map((p) => oklab(p[0], p[1], p[2]));
  const find =
    lookup ??
    ((L: number, a: number, b: number) => nearest(L, a, b, plab as Array<[number, number, number]>, 0));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const r = work[i * 3];
      const g = work[i * 3 + 1];
      const b = work[i * 3 + 2];
      const c = oklab(r, g, b);
      const idx = find(c[0], c[1], c[2]);
      out[i] = idx;
      const p = palette[idx];
      const er = (r - p[0]) * amount;
      const eg = (g - p[1]) * amount;
      const eb = (b - p[2]) * amount;
      const push = (xx: number, yy: number, f: number) => {
        if (xx < 0 || xx >= cols || yy >= rows) return;
        const j = (yy * cols + xx) * 3;
        work[j] += er * f;
        work[j + 1] += eg * f;
        work[j + 2] += eb * f;
      };
      push(x + 1, y, 7 / 16);
      push(x - 1, y + 1, 3 / 16);
      push(x, y + 1, 5 / 16);
      push(x + 1, y + 1, 1 / 16);
    }
  }
  return out;
}
