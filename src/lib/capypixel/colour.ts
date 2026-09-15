/**
 * The colour core, ported from the measured prototype
 * (capypixel/c1-pixel-quantizer/core.js — local, untracked).
 *
 * Palette matching happens in Oklab, not RGB. sRGB distance is not perceptual
 * distance: it overspends palette entries in the greens and starves the blues.
 *
 * Cells are stored as a flat Uint8Array (3 bytes per cell), never as arrays of
 * objects. At a 1000-cell-wide grid that is ~3M bytes and the difference
 * between a smooth slider and a stuttering one.
 */

import type { RGB } from "./types";

/**
 * 256-entry transfer table. The naive form of this function is
 *     c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4)
 * and that Math.pow turned out to be the single most expensive thing in the whole
 * pipeline — three calls per cell, more than the entire palette search it feeds.
 * Baking it into a table is exact for 8-bit input, so it costs no quality at all,
 * and it moves the bottleneck back to where the engines can actually compete.
 */
export const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** sRGB byte → linear light. Fractional values arrive from error diffusion. */
export function lin(c: number): number {
  c = c < 0 ? 0 : c > 255 ? 255 : c;
  const i = c | 0;
  const f = c - i;
  if (f < 1e-6 || i >= 255) return LIN[i];
  return LIN[i] + (LIN[i + 1] - LIN[i]) * f;
}

/**
 * Inverse of the above, needed by the tone passes: they work on linear light and
 * have to come back to sRGB. Math.pow is acceptable here because it runs once per
 * cell in a pre-pass, not inside the per-palette-entry inner loop. Like the
 * prototype, this returns a float — assignment into a Uint8Array truncates, and
 * the port keeps that truncation.
 */
export function srgbFromLinear(c: number): number {
  if (c <= 0) return 0;
  if (c >= 1) return 255;
  return (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255;
}

/** sRGB bytes → Oklab [L, a, b]. Forward transform only — k-means recovers
 *  palette colours by averaging the sRGB members of each cluster, which dodges
 *  writing an inverse transform that would need its own test. */
export function oklab(r: number, g: number, b: number): [number, number, number] {
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Guards against a silently wrong matrix: white must be L=1, black L=0, and red
 * lands on the published [0.628, 0.225, 0.126]. Cheap, and it is the one place a
 * typo produces plausible-looking-but-wrong output rather than a crash.
 */
export function checkOklab(): boolean {
  const w = oklab(255, 255, 255);
  const k = oklab(0, 0, 0);
  const r = oklab(255, 0, 0);
  const near = (a: number, b: number, t: number) => Math.abs(a - b) <= t;
  return (
    near(w[0], 1, 0.002) &&
    near(k[0], 0, 0.002) &&
    near(r[0], 0.628, 0.006) &&
    near(r[1], 0.225, 0.006) &&
    near(r[2], 0.126, 0.006)
  );
}

/** "#rrggbb" → bytes. */
export function hex(h: string): RGB {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

/** Rec.709 luma on sRGB bytes. */
export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
