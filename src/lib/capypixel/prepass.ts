/**
 * Pre-passes: the transforms applied to the cell grid before any palette work,
 * ported from the measured prototype. Order matters — quantize.ts runs levels →
 * saturate → tone bands → tone curve, and the benchmark's numbers assume it.
 */

import { lin, luma, oklab, srgbFromLinear } from "./colour";

/**
 * Percentile stretch. Returns a function so the same mapping can be applied to
 * the cell grid without recomputing the histogram.
 */
export function levelsFn(
  cells: Uint8Array,
  n: number,
  lo: number,
  hi: number,
): (r: number, g: number, b: number) => [number, number, number] {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = luma(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]);
  const sorted = Float32Array.from(v).sort();
  const pick = (q: number) => {
    const i = Math.round(q * (n - 1));
    return sorted[i < 0 ? 0 : i > n - 1 ? n - 1 : i];
  };
  const a = pick(lo);
  const b = pick(hi);
  const span = Math.max(1e-6, b - a);
  return (r, g, b2) => {
    const l = luma(r, g, b2);
    const t = (l - a) / span;
    const k = t < 0 ? 0 : t > 1 ? 1 : t;
    // Recompose around the stretched luminance, preserving hue/saturation offset.
    const d = l > 1e-6 ? (k * 255) / l : 1;
    return [r * d, g * d, b2 * d];
  };
}

export function saturate(r: number, g: number, b: number, s: number): [number, number, number] {
  const l = luma(r, g, b);
  return [l + (r - l) * s, l + (g - l) * s, l + (b - l) * s];
}

/**
 * Quantise Oklab L into N bands and keep the chroma direction, working in linear light.
 *
 * This is the fix for a palette that spends itself on one big smooth region. A photograph
 * of a lit drape carries hundreds of near-identical warm tones, and median-cut allocates
 * entries by colour volume, so that gradient absorbs nearly the whole palette. Banding the
 * value first collapses those near-duplicates, which frees entries for everything else.
 *
 * Oklab L is approximately cbrt of linear luminance, so scaling L by k means scaling
 * linear light by k³ — doing it in sRGB instead would darken the result.
 */
export function toneBands(cells: Uint8Array, n: number, bands: number): Uint8Array {
  const out = new Uint8Array(n * 3);
  const step = 1 / bands;
  for (let i = 0; i < n; i++) {
    const r = cells[i * 3];
    const g = cells[i * 3 + 1];
    const b = cells[i * 3 + 2];
    const L = oklab(r, g, b)[0];
    const band = Math.min(bands - 1, Math.floor(L / step));
    const q = band * step + step / 2; // band centre, keeps mid-tones stable
    const k = L > 1e-6 ? Math.pow(q / L, 3) : 1;
    out[i * 3] = srgbFromLinear(lin(r) * k);
    out[i * 3 + 1] = srgbFromLinear(lin(g) * k);
    out[i * 3 + 2] = srgbFromLinear(lin(b) * k);
  }
  return out;
}

/**
 * Black point, white point, gamma — applied to Oklab L and rebuilt in linear light, same
 * as toneBands. This is the control that makes low-palette output possible at all: it lets
 * tones collapse toward the extremes so a 2- or 4-entry palette can render large areas
 * SOLID.
 *
 * Auto-levels is the opposite operation and is actively wrong for 1-bit: a linear
 * percentile stretch fills the mid-range, and the mid-range is exactly what a 2-colour
 * palette cannot render without dithering.
 */
export function tonalCurve(
  cells: Uint8Array,
  n: number,
  black: number,
  white: number,
  gamma: number,
): Uint8Array {
  const out = new Uint8Array(n * 3);
  const span = Math.max(1e-6, white - black);
  const invg = 1 / Math.max(0.05, gamma);
  for (let i = 0; i < n; i++) {
    const r = cells[i * 3];
    const g = cells[i * 3 + 1];
    const b = cells[i * 3 + 2];
    const L = oklab(r, g, b)[0];
    let t = (L - black) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const q = Math.pow(t, invg);
    const k = L > 1e-6 ? Math.pow(q / L, 3) : 1;
    out[i * 3] = srgbFromLinear(lin(r) * k);
    out[i * 3 + 1] = srgbFromLinear(lin(g) * k);
    out[i * 3 + 2] = srgbFromLinear(lin(b) * k);
  }
  return out;
}

/** Flat Oklab triples for a cell grid — what derivation and mapping search in. */
export function labOf(cells: Uint8Array, n: number): Float32Array {
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = oklab(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]);
    lab[i * 3] = c[0];
    lab[i * 3 + 1] = c[1];
    lab[i * 3 + 2] = c[2];
  }
  return lab;
}
