/**
 * Palettes: the two derivation methods and the built-in ramps, ported from the
 * measured prototype. k-means beats median-cut on error (1.9× lower Oklab error
 * at 16 colours, measured over the benchmark's 110 combinations); the presets
 * keep whichever method their reference runs used.
 */

import { hex } from "./colour";
import type { FixedPaletteId, Palette, RGB } from "./types";

/**
 * Median cut. Splits the box with the widest single channel, which is cheap and
 * good enough; the classic failure is degenerate boxes, so zero-range boxes are
 * never split and the result is deduped. (Without the dedupe this produced two
 * identical #ffffff entries on a test chart and quietly wasted 1/16 of the palette.)
 */
export function medianCut(cells: Uint8Array, n: number, k: number): Palette {
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const boxes: Int32Array[] = [idx];

  const range = (a: Int32Array, ch: number) => {
    let mn = 255;
    let mx = 0;
    for (let i = 0; i < a.length; i++) {
      const v = cells[a[i] * 3 + ch];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    return mx - mn;
  };

  while (boxes.length < k) {
    let bi = -1;
    let best = 0;
    let ch = 0;
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      if (a.length < 2) continue;
      for (let c = 0; c < 3; c++) {
        const r = range(a, c);
        if (r > best) {
          best = r;
          bi = i;
          ch = c;
        }
      }
    }
    if (bi < 0) break; // nothing left worth splitting
    const a = boxes[bi];
    const sorted = Array.from(a).sort((p, q) => cells[p * 3 + ch] - cells[q * 3 + ch]);
    const mid = sorted.length >> 1;
    boxes.splice(bi, 1, Int32Array.from(sorted.slice(0, mid)), Int32Array.from(sorted.slice(mid)));
  }

  const out: Palette = [];
  for (const box of boxes) {
    const a = box;
    if (!a.length) continue;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let j = 0; j < a.length; j++) {
      r += cells[a[j] * 3];
      g += cells[a[j] * 3 + 1];
      b += cells[a[j] * 3 + 2];
    }
    const c: RGB = [
      Math.round(r / a.length),
      Math.round(g / a.length),
      Math.round(b / a.length),
    ];
    let dup = false;
    for (const seen of out) {
      if (seen[0] === c[0] && seen[1] === c[1] && seen[2] === c[2]) {
        dup = true;
        break;
      }
    }
    if (!dup) out.push(c);
  }
  return out;
}

/**
 * k-means in Oklab. Seeded by taking evenly spaced samples along the luminance
 * sort rather than random centroids — a random seed would make every run differ,
 * and the whole point of this project's dithering is reproducible output.
 */
export function kmeans(
  lab: Float32Array,
  n: number,
  k: number,
  iters: number,
): { centroids: Float32Array; assign: Int32Array } {
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  Array.prototype.sort.call(order, (p: number, q: number) => lab[p * 3] - lab[q * 3]);

  const cen = new Float32Array(k * 3);
  for (let c = 0; c < k; c++) {
    const s = order[Math.min(n - 1, Math.floor(((c + 0.5) / k) * n))];
    cen[c * 3] = lab[s * 3];
    cen[c * 3 + 1] = lab[s * 3 + 1];
    cen[c * 3 + 2] = lab[s * 3 + 2];
  }

  const sum = new Float64Array(k * 3);
  const cnt = new Int32Array(k);
  const assign = new Int32Array(n);

  for (let it = 0; it < iters; it++) {
    sum.fill(0);
    cnt.fill(0);
    for (let i = 0; i < n; i++) {
      let bd = Infinity;
      let bc = 0;
      for (let c = 0; c < k; c++) {
        const dl = lab[i * 3] - cen[c * 3];
        const da = lab[i * 3 + 1] - cen[c * 3 + 1];
        const db = lab[i * 3 + 2] - cen[c * 3 + 2];
        const d = dl * dl + da * da + db * db;
        if (d < bd) {
          bd = d;
          bc = c;
        }
      }
      assign[i] = bc;
      sum[bc * 3] += lab[i * 3];
      sum[bc * 3 + 1] += lab[i * 3 + 1];
      sum[bc * 3 + 2] += lab[i * 3 + 2];
      cnt[bc]++;
    }
    for (let c = 0; c < k; c++) {
      if (!cnt[c]) continue;
      cen[c * 3] = sum[c * 3] / cnt[c];
      cen[c * 3 + 1] = sum[c * 3 + 1] / cnt[c];
      cen[c * 3 + 2] = sum[c * 3 + 2] / cnt[c];
    }
  }

  // sRGB recovery happens in kmeansPalette, which has the cells this function
  // deliberately does not take — that keeps the clustering testable on bare lab data.
  return { centroids: cen, assign };
}

/** k-means needs the sRGB cells to build output colours; callers pass them in. */
export function kmeansPalette(
  cells: Uint8Array,
  lab: Float32Array,
  n: number,
  k: number,
  iters: number,
): Palette {
  const r = kmeans(lab, n, k, iters);
  const acc = new Float64Array(k * 3);
  const num = new Int32Array(k);
  for (let i = 0; i < n; i++) {
    const c = r.assign[i];
    acc[c * 3] += cells[i * 3];
    acc[c * 3 + 1] += cells[i * 3 + 1];
    acc[c * 3 + 2] += cells[i * 3 + 2];
    num[c]++;
  }
  const pal: Palette = [];
  for (let c = 0; c < k; c++) {
    if (!num[c]) continue;
    pal.push([
      Math.round(acc[c * 3] / num[c]),
      Math.round(acc[c * 3 + 1] / num[c]),
      Math.round(acc[c * 3 + 2] / num[c]),
    ]);
  }
  return pal;
}

/**
 * The built-in ramps.
 *
 * The whale ramp is dark-weighted on purpose, because it was authored for a
 * silhouette on a near-black backdrop. That is why the whale style must enable
 * auto-levels — mapped straight, a photo collapses into the bottom five entries,
 * and the ramp tops out at L 0.75: it cannot represent white at all (measured,
 * RESULTS.md H5).
 */
export const FIXED_PALETTES: Record<FixedPaletteId, Palette> = {
  "1bit": [
    [0, 0, 0],
    [255, 255, 255],
  ],
  gameboy: [
    [15, 56, 15],
    [48, 98, 48],
    [139, 172, 15],
    [155, 188, 15],
  ],
  whale: ["#0a1327", "#12203f", "#1b2c60", "#25398a", "#3252b4", "#4a78dc", "#87aef4"].map(
    (h) => hex(h) as RGB,
  ),
};

/**
 * Snap each cell to a lattice of `levels` steps per channel, then let derivation
 * run on that. Distinct from tone bands: bands change the picture, this only
 * changes what the palette is derived from.
 *
 * It exists because median-cut scores boxes by channel RANGE, so a smooth gradient
 * holding hundreds of near-identical shades presents an enormous volume and keeps
 * winning splits. On the portrait that prompted it, that gave the gold drape 15 of
 * 16 entries and left one entry to serve the backdrop, the blazer and the blue
 * floor simultaneously. Collapsing near-duplicates to identical bins makes the
 * split decision about distinct colours rather than pixel counts.
 */
export function colourBins(cells: Uint8Array, n: number, levels: number): Uint8Array {
  const out = new Uint8Array(n * 3);
  const step = 256 / levels;
  for (let i = 0; i < n * 3; i++) {
    const v = cells[i];
    const b = Math.min(levels - 1, Math.floor(v / step));
    out[i] = Math.max(0, Math.min(255, Math.round(b * step + step / 2)));
  }
  return out;
}

/**
 * The hot inner loop. `bias` is the dither offset applied to L before matching,
 * which is what turns a flat ramp into a speckled one without adding any colours.
 * Takes scalars, not an array: this runs once per cell per palette entry, and
 * allocating an [L,a,b] triple per cell showed up as real garbage-collection
 * churn at 1000-cell-wide grids.
 */
export function nearest(
  L0: number,
  a0: number,
  b0: number,
  plab: Array<[number, number, number]>,
  bias: number,
): number {
  let bd = Infinity;
  let bc = 0;
  const L = L0 + bias;
  for (let c = 0; c < plab.length; c++) {
    const dl = L - plab[c][0];
    const da = a0 - plab[c][1];
    const db = b0 - plab[c][2];
    const d = dl * dl + da * da + db * db;
    if (d < bd) {
      bd = d;
      bc = c;
    }
  }
  return bc;
}
