/**
 * The one entry point the UI calls. Pure and deterministic: same input, same
 * indices, every time — no Math.random anywhere in the pipeline.
 *
 * The order of operations is the prototype's, because its measured verdicts
 * assume it: pre-passes (levels → saturate → tone bands → tone curve) →
 * palette (fixed or derived, bins applied to derivation only) → the outline
 * entry appended BEFORE mapping so every run searches the same palette → map
 * with dither → the outline applied AFTER mapping as a shared post-pass.
 */

import { oklab } from "./colour";
import { FIXED_PALETTES, colourBins, kmeansPalette, medianCut, nearest } from "./palette";
import { bracketTable, ditherBias, floydSteinberg } from "./dither";
import { labOf, levelsFn, saturate, tonalCurve, toneBands } from "./prepass";
import { appendOutline, outline } from "./outline";
import { flatness, hueFlipRate, oklabError } from "./metrics";
import type { Metrics, Palette, QuantParams, QuantResult } from "./types";

export function quantizeImage(
  cells: Uint8Array,
  cols: number,
  rows: number,
  p: QuantParams,
): QuantResult {
  const n = cols * rows;

  // --- pre-passes, in the prototype's order -------------------------------
  const stretch = p.levels ? levelsFn(cells, n, 0.02, 0.98) : null;
  const passed = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    let r = cells[i * 3];
    let g = cells[i * 3 + 1];
    let b = cells[i * 3 + 2];
    if (stretch) {
      const t = stretch(r, g, b);
      r = t[0];
      g = t[1];
      b = t[2];
    }
    if (p.saturation !== 1) {
      const t = saturate(r, g, b, p.saturation);
      r = t[0];
      g = t[1];
      b = t[2];
    }
    passed[i * 3] = r < 0 ? 0 : r > 255 ? 255 : r;
    passed[i * 3 + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    passed[i * 3 + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  // Tone bands are a stylistic transform — the picture really does get banded —
  // so they apply before palette derivation and before mapping. Same for the
  // tone curve, which always runs (it is a no-op at 0/1/1 only up to float dust).
  const banded = p.bands ? toneBands(passed, n, p.bands) : passed;
  const shaped = tonalCurve(banded, n, p.black, p.white, p.gamma);

  // --- palette -------------------------------------------------------------
  let palette: Palette;
  if (p.palette === "fixed") {
    palette = FIXED_PALETTES[p.fixedPalette];
  } else {
    // Binning is a derivation aid only: it changes what the palette is built
    // from, never the rendered image.
    const derive = p.bins ? colourBins(shaped, n, p.bins) : shaped;
    palette =
      p.palette === "kmeans"
        ? kmeansPalette(derive, labOf(derive, n), n, p.colors, 6)
        : medianCut(derive, n, p.colors);
  }

  // The outline entry is appended BEFORE mapping so every search sees the same
  // palette, and the outline itself is applied AFTER mapping as a shared
  // post-pass.
  let outlineIndex = -1;
  if (p.outline) {
    const o = appendOutline(palette);
    palette = o.palette;
    outlineIndex = o.index;
  }

  // --- map with dither -------------------------------------------------------
  const plab = palette.map((c) => oklab(c[0], c[1], c[2]));
  let mapped: Int32Array;
  if (p.dither === "floyd") {
    mapped = floydSteinberg(shaped, palette, cols, rows, p.amount);
  } else {
    const lab = labOf(shaped, n);
    const br = bracketTable(plab);
    mapped = new Int32Array(n);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const L = lab[k * 3];
        const bias = p.dither === "bayer" ? ditherBias(L, br, i, j, p.amount, p.band) : 0;
        mapped[k] = nearest(L, lab[k * 3 + 1], lab[k * 3 + 2], plab, bias);
      }
    }
  }

  if (outlineIndex >= 0) {
    mapped = outline(shaped, mapped, cols, rows, {
      index: outlineIndex,
      threshold: p.outlineThreshold,
      thickness: p.outlineThickness,
    });
  }

  // --- metrics (against the prepared grid, as the prototype measures it) ----
  const indices = Uint8Array.from(mapped);
  const metrics: Metrics = {
    flatness: flatness(indices, cols, rows),
    hueFlipRate: hueFlipRate(shaped, indices, palette, n),
    oklabError: oklabError(shaped, indices, palette, n),
    largestShare: largestPaletteShare(indices, palette.length),
  };
  return { indices, palette, metrics };
}

/** Share of cells held by the most-used palette entry — the starvation signal. */
export function largestPaletteShare(indices: Uint8Array, paletteSize: number): number {
  if (!indices.length) return 0;
  const counts = new Int32Array(paletteSize);
  for (let i = 0; i < indices.length; i++) counts[indices[i]]++;
  let max = 0;
  for (let c = 0; c < paletteSize; c++) if (counts[c] > max) max = counts[c];
  return max / indices.length;
}
