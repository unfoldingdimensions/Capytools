/**
 * Figure/ground: synthesise an outline colour and draw it on strong edges,
 * ported from the measured prototype (the portrait preset's separation pass).
 */

import { lin, luma, oklab, srgbFromLinear } from "./colour";
import type { Palette, RGB } from "./types";

/**
 * Synthesise an outline colour and append it to the palette.
 *
 * Appending rather than reusing the darkest existing entry is deliberate: on the
 * portrait that prompted this, the darkest entry is already serving the backdrop,
 * so an outline drawn in it would be invisible exactly where it is needed. Going
 * 30% below the darkest entry in linear light guarantees the outline reads against
 * anything already in the palette, and keeping it a palette member means the
 * "every output colour is in the palette" invariant still holds.
 */
export function appendOutline(palette: Palette): { palette: Palette; index: number; colour: RGB } {
  let dark = palette[0];
  let darkL = Infinity;
  for (const p of palette) {
    const L = oklab(p[0], p[1], p[2])[0];
    if (L < darkL) {
      darkL = L;
      dark = p;
    }
  }
  const colour: RGB = [
    Math.round(srgbFromLinear(lin(dark[0]) * 0.3)),
    Math.round(srgbFromLinear(lin(dark[1]) * 0.3)),
    Math.round(srgbFromLinear(lin(dark[2]) * 0.3)),
  ];
  const copy = palette.slice();
  copy.push(colour);
  return { palette: copy, index: copy.length - 1, colour };
}

export interface OutlineOptions {
  index: number;
  /** Percentile of this image's own gradient magnitudes. Default 0.07. */
  threshold?: number;
  /** Cells. Default 1. */
  thickness?: number;
}

/**
 * Mark cells sitting on a strong luminance edge, then rewrite them to the outline entry.
 *
 * Deliberately a post-pass over the finished index array rather than work inside each
 * engine: if every engine outlined its own output, the disagreement metric would stop
 * measuring the engines and start measuring the outline.
 *
 * The threshold is a percentile of this image's own gradient magnitudes, not an absolute
 * number, so it adapts instead of needing to be retuned per photograph.
 */
export function outline(
  cells: Uint8Array,
  indices: Uint8Array | Int32Array,
  cols: number,
  rows: number,
  opts: OutlineOptions,
): Int32Array {
  const n = cols * rows;
  const pct = opts.threshold === undefined ? 0.07 : opts.threshold;
  const thickness = opts.thickness === undefined ? 1 : opts.thickness;

  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = luma(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]) / 255;

  const mag = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let gx = 0;
      let gy = 0;
      if (x > 0) gx += L[i] - L[i - 1];
      if (x + 1 < cols) gx += L[i + 1] - L[i];
      if (y > 0) gy += L[i] - L[i - cols];
      if (y + 1 < rows) gy += L[i + cols] - L[i];
      mag[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  const sorted = Float32Array.from(mag).sort();
  const cut = sorted[Math.max(0, Math.min(n - 1, Math.round((1 - pct) * (n - 1))))];

  let mark = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    // The 0.02 floor stops a low percentile from outlining pure noise in a flat region.
    if (mag[i] >= cut && mag[i] > 0.02) mark[i] = 1;
  }

  if (thickness > 1) {
    const grown = new Uint8Array(n);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!mark[y * cols + x]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
            grown[yy * cols + xx] = 1;
          }
        }
      }
    }
    mark = grown;
  }

  const out = Int32Array.from(indices);
  for (let i = 0; i < n; i++) if (mark[i]) out[i] = opts.index;
  return out;
}
