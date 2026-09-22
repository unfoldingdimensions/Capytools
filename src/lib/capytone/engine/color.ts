/**
 * Color math — everything flows through culori in Oklch. Hand-rolled
 * conversions and RGB lerp are banned: they produce mud, and mud is the one
 * thing this product must never ship.
 */

import { converter, formatHex, oklch, parse } from "culori";

const toOklch = converter("oklch");
const toRgb = converter("rgb");

export interface Oklch {
  l: number; // 0..1 perceived lightness
  c: number; // chroma
  h: number; // hue, degrees
}

/** Tag a plain {l,c,h} with the mode field culori's types require. */
function asCulori(color: Oklch) {
  return oklch({ ...color, mode: "oklch" });
}

/** Parse any CSS color into Oklch. Returns null for unparseable input. */
export function toOklchOrNull(color: string): Oklch | null {
  const parsed = parse(color);
  if (!parsed) return null;
  const o = toOklch(parsed);
  if (!o) return null;
  return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
}

/** Oklch → nearest sRGB hex (gamut-clamped by culori). */
export function toHex(color: Oklch): string {
  return formatHex(asCulori(color)) ?? "#000000";
}

/**
 * Reduce chroma until the color fits inside sRGB. Culori's converters return
 * RAW unclamped channels — an object is returned even when wildly out of
 * gamut, so gamut membership must be tested by bounds, never by truthiness.
 * (Truthiness let neon colors through to formatHex, whose crude channel clamp
 * shifted their hue — dark olives turned orange-brown.)
 */
export function clampToGamut(color: Oklch): Oklch {
  const inSrgb = (c: number, h: number): boolean => {
    const p = toRgb(asCulori({ l, c, h }));
    if (!p) return false;
    const ch = [p.r, p.g, p.b];
    return ch.every((v) => v >= 0 && v <= 1);
  };
  const { l, c, h } = color;
  if (inSrgb(c, h)) return { l, c, h };
  let low = 0;
  let high = c;
  for (let i = 0; i < 20 && high - low > 0.0005; i++) {
    const mid = (low + high) / 2;
    if (inSrgb(mid, h)) low = mid;
    else high = mid;
  }
  // Back off a hair from the found edge: the search can land a fraction
  // OUTSIDE true gamut, and formatHex's channel clamp would then nudge the
  // measured chroma back UP past caps (seen as 0.1505 vs the 0.15 cap).
  return { l, c: Math.max(0, low - 0.002), h };
}

/** WCAG relative contrast ratio between two hex strings (≥1, ≤21). */
export function contrastRatio(a: string, b: string): number {
  const lum = (color: string): number => {
    const p = toRgb(parse(color));
    if (!p) return 0;
    const chan = [p.r, p.g, p.b].map((v) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Shortest signed difference between two hues, degrees (-180..180). */
export function hueDistance(a: number, b: number): number {
  const raw = ((((b - a) % 360) + 360) % 360); // 0..<360
  return raw > 180 ? raw - 360 : raw;
}

/** Mean circular hue of a set, degrees. Empty set → 0. */
export function meanHue(hues: number[]): number {
  if (!hues.length) return 0;
  const rad = hues.map((deg) => (deg * Math.PI) / 180);
  const x = rad.reduce((sum, r) => sum + Math.cos(r), 0);
  const y = rad.reduce((sum, r) => sum + Math.sin(r), 0);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Lift or sink L until ink-vs-bg clears `target` contrast. Moves the smaller
 * side first (dark bg stays dark; light ink stays light). Bounded walk so a
 * pathological pair converges instead of oscillating.
 */
export function ensureContrast(ink: Oklch, bg: Oklch, target: number): { ink: Oklch; bg: Oklch; ratio: number } {
  let i = { ...ink };
  let g = { ...bg };
  const inkIsLight = i.l >= g.l;
  let ratio = contrastRatio(toHex(i), toHex(g));
  if (ratio >= target) return { ink: i, bg: g, ratio };

  for (let step = 0; step < 60 && ratio < target; step++) {
    if (inkIsLight) {
      i = { ...i, l: Math.min(0.985, i.l + 0.01) };
      // Ceiling reached? Start darkening the ground instead.
      if (i.l >= 0.985) g = { ...g, l: Math.max(0.02, g.l - 0.01) };
    } else {
      i = { ...i, l: Math.max(0.015, i.l - 0.01) };
      if (i.l <= 0.015) g = { ...g, l: Math.min(0.98, g.l + 0.01) };
    }
    ratio = contrastRatio(toHex(i), toHex(g));
  }
  return { ink: i, bg: g, ratio };
}
