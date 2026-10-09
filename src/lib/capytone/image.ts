/**
 * Image mode's pure half: from sampled pixels to a ranked palette, and from a
 * click to an image pixel. No DOM, no network — the browser half (decode,
 * canvas) lives in `components/capytone/ImageMode.tsx`, and
 * `tests/capytone-image-boundaries.test.ts` proves neither half can reach a
 * server module or a request API.
 *
 * `rank.ts` is imported directly, never the `extract` folder's index: that
 * folder also holds Extract mode's server-only code (ssrf, dns, fetch).
 */

import { formatHex, formatRgb, hsl, parse } from "culori";

import { rankCounts, type RankedColour } from "./extract/rank";

/** Photos are shrunk until the longer side is this many px before sampling. */
export const SAMPLE_MAX_SIDE = 400;

/** The picture on screen is drawn from the original at this longer side. */
export const DISPLAY_MAX_SIDE = 1200;

/** Pixels less opaque than this (of 255) are skipped — a PNG's empty corners. */
export const ALPHA_MIN = 128;

/**
 * ΔE00 under which two photo colours are one swatch. Wider than the page
 * palette's 2.5: a photo's sky is a gradient of thousands of exact colours,
 * and twelve swatches of nearly-the-same blue say nothing.
 */
export const IMAGE_CLUSTER_DELTA_E = 10;

/** Fit inside a square of `max` px, keeping the aspect; never upscales. */
export function fitWithin(width: number, height: number, max: number): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return formatHex({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
}

export interface ImagePalette {
  colours: RankedColour[];
  /** Opaque pixels that were sampled — the denominator for each share. */
  sampled: number;
}

/**
 * RGBA bytes → ranked palette. Pixels are binned 16 levels per channel so the
 * clustering sees at most 4096 colours instead of one per pixel; each bin is
 * represented by the mean of its pixels, not its corner, so a swatch is a
 * colour that is really in the picture.
 */
export function paletteFromPixels(data: ArrayLike<number>): ImagePalette {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  let sampled = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < ALPHA_MIN) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bin = bins.get(key);
    if (bin) {
      bin.n += 1;
      bin.r += data[i];
      bin.g += data[i + 1];
      bin.b += data[i + 2];
    } else {
      bins.set(key, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    sampled += 1;
  }
  const counts = new Map<string, { count: number; source: string }>();
  for (const { n, r, g, b } of bins.values()) {
    const hex = rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
    const known = counts.get(hex);
    if (known) known.count += n;
    else counts.set(hex, { count: n, source: "image" });
  }
  return { colours: rankCounts(counts, IMAGE_CLUSTER_DELTA_E), sampled };
}

/**
 * A pointer position → the image pixel under it, however large the picture
 * is drawn. `rect` is the displayed box (getBoundingClientRect); the image is
 * stretched across all of it, so the mapping is a ratio, clamped to the grid.
 */
export function clientToPixel(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  const clamp = (v: number, max: number) => Math.min(max - 1, Math.max(0, Math.floor(v)));
  return {
    x: clamp(((clientX - rect.left) / rect.width) * imageWidth, imageWidth),
    y: clamp(((clientY - rect.top) / rect.height) * imageHeight, imageHeight),
  };
}

/** The same colour in the notations people paste: hex, rgb(), hsl(). */
export function colourFormats(hex: string): { hex: string; rgb: string; hsl: string } {
  const colour = parse(hex);
  if (!colour) return { hex, rgb: hex, hsl: hex };
  const { h = 0, s, l } = hsl(colour);
  return {
    hex,
    rgb: formatRgb(colour),
    hsl: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
  };
}
