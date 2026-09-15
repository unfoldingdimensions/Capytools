/**
 * Shared card-drawing parts — the family grammar expressed once, on canvas.
 *
 * Every metric is written in DESIGN UNITS: 1/1000 of the card width, converted
 * through `pu()` ("per mille units"). A value of 86 means "86/1000 of the card
 * width", which keeps proportions identical between the 1200-wide and
 * 1080-wide formats without conditional soup.
 */

import { getFontStacks } from "../fonts";
import { hashString, hexToRgba, makeRng } from "../rand";
import type { CardFormat, MoodPalette } from "../types";
import { CARD_FORMATS } from "../types";

/** Convert a per-mille design unit to pixels for this card width. */
export function pu(width: number, units: number): number {
  return (units / 1000) * width;
}

export interface RenderArgs {
  canvas: HTMLCanvasElement;
  palette: MoodPalette;
  format: CardFormat;
  /** Backing-store multiplier. Drawing always uses logical coordinates. */
  dpr?: number;
}

/** Size the backing store and return the 2d context (throws if unavailable). */
export function prepareCanvas(canvas: HTMLCanvasElement, format: CardFormat, dpr = 1) {
  const { w, h } = CARD_FORMATS[format];
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  if (dpr !== 1) ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

/** Fill the card's ground field. */
export function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, palette: MoodPalette): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);
}

/** Width of `text` drawn with manual letter-tracking (canvas has none built in). */
export function trackedWidth(ctx: CanvasRenderingContext2D, text: string, track: number): number {
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + track;
  return total - track;
}

/**
 * Draw uppercase, letter-spaced mono text — the family eyebrow voice.
 * `align` anchors the run's left or right edge at x. Returns the run width.
 */
export function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baselineY: number,
  track: number,
  align: "left" | "right" = "left",
): number {
  const upper = text.toUpperCase();
  const startX = align === "right" ? x - trackedWidth(ctx, upper, track) : x;
  let cursor = startX;
  for (const ch of upper) {
    ctx.fillText(ch, cursor, baselineY);
    cursor += ctx.measureText(ch).width + track;
  }
  return trackedWidth(ctx, upper, track);
}

/** Configure the mono eyebrow voice (size in design units). */
export function monoFont(ctx: CanvasRenderingContext2D, width: number, units: number, weight = 500): void {
  ctx.font = `${weight} ${pu(width, units)}px ${getFontStacks().mono}`;
}

/** Hairline rule — the banding device every family card uses. */
export function drawHairline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  width: number,
  palette: MoodPalette,
  alpha = 0.28,
): void {
  const thickness = Math.max(1, pu(width, 2));
  ctx.fillStyle = hexToRgba(palette.ink, alpha);
  ctx.fillRect(x1, y, x2 - x1, thickness);
}

/**
 * The top eyebrow row: wordmark left, context right, over a hairline.
 * Returns the hairline's y so layouts can compose below it.
 */
export function drawEyebrowRow(
  ctx: CanvasRenderingContext2D,
  w: number,
  margin: number,
  top: number,
  palette: MoodPalette,
  rightText: string,
): number {
  monoFont(ctx, w, 17);
  ctx.fillStyle = hexToRgba(palette.ink, 0.62);
  ctx.textBaseline = "alphabetic";
  const baseline = top + pu(w, 16);
  const track = pu(w, 4.4);
  drawTracked(ctx, "CAPYTONE", margin, baseline, track, "left");
  drawTracked(ctx, rightText.toUpperCase(), w - margin, baseline, track, "right");
  const ruleY = top + pu(w, 36);
  drawHairline(ctx, margin, w - margin, ruleY, w, palette);
  return ruleY;
}

/**
 * Capybara head strokes in viewBox coordinates (64×48), shared with the DOM
 * mark. Source of truth: `src/components/mascot/CapyMark.tsx` — this inline
 * copy exists because canvas Path2D cannot consume the React component. Keep
 * the two in sync if the mascot ever changes.
 */
const CAPY_PATHS: Array<{ d: string; width: number }> = [
  { d: "M15 25 C15 13 22 7 32 7 C42 7 49 13 49 25 C49 34 42 40 32 40 C24 40 15 34 15 25 Z", width: 3 },
  { d: "M23 20 h7", width: 2.6 },
  { d: "M34 20 h7", width: 2.6 },
  { d: "M22 8.5 Q24 3 28 5", width: 3 },
  { d: "M42 8.5 Q40 3 36 5", width: 3 },
];

const RIPPLE_PATH = "M18 41 q5 3 10 0 M36 41 q5 3 10 0";

/**
 * Bottom-right watermark: tiny capybara mark + tracked mono attribution.
 * Drawn with Path2D so the artwork carries the brand without any image asset.
 * Returns the left edge of the whole lockup (useful for collision checks).
 */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  margin: number,
  palette: MoodPalette,
): number {
  const size = pu(w, 15);
  const track = size * 0.24;
  const label = "MADE WITH CAPYTOOLS";

  ctx.save();
  monoFont(ctx, w, 15);
  const labelW = trackedWidth(ctx, label, track);

  // Mark sized relative to the mono voice, aspect-locked to the 64×48 box.
  const markH = size * 1.45;
  const markW = markH * (64 / 48);
  const markGap = size * 0.9;
  const total = markW + markGap + labelW;

  const baseline = h - margin;
  const x = w - margin - total;

  // Mark: bottom-aligned to sit on the same optical line as the text.
  const k = markH / 48;
  ctx.translate(x, baseline - markH);
  ctx.scale(k, k);
  ctx.strokeStyle = hexToRgba(palette.ink, 0.5);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of CAPY_PATHS) ctx.stroke(new Path2D(p.d));
  ctx.globalAlpha = 0.5;
  ctx.stroke(new Path2D(RIPPLE_PATH));
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  monoFont(ctx, w, 15);
  const tx = x + markW + markGap;
  ctx.fillStyle = hexToRgba(palette.ink, 0.55);
  drawTracked(ctx, label, tx, baseline, track, "left");

  return x;
}

/**
 * Seeded swatch fractions — how much of the bar each role takes.
 * Deterministic per (slug, seed); minimum share keeps every swatch legible.
 */
export function swatchFractions(slug: string, seed: string, count: number): number[] {
  const rng = makeRng("swatch", slug, seed);
  const raw = Array.from({ length: count }, () => 0.5 + rng());
  const MIN = 0.12;
  // Clamp to the floor, renormalise the rest.
  let sum = raw.reduce((a, b) => a + b, 0);
  const floored = raw.map((v) => Math.max(v / sum, MIN));
  sum = floored.reduce((a, b) => a + b, 0);
  return floored.map((v) => v / sum);
}

/**
 * Largest font size (px) at which `text` fits `maxWidth`, searched binary-style.
 * Caller sets weight/family via `fontFor`; we only vary the pixel size.
 */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFor: (sizePx: number) => string,
  maxSize: number,
  maxWidth: number,
): number {
  let lo = 8;
  let hi = maxSize;
  ctx.font = fontFor(hi);
  if (ctx.measureText(text).width <= maxWidth) return hi;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = fontFor(mid);
    if (ctx.measureText(text).width <= maxWidth) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Greedy wrap that SHRINKS the type until the phrase fits in ≤ maxLines.
 * Never drops words (a naive break-at-maxLines loses the tail), never
 * returns fewer lines than the words allow. Shared by every layout hero.
 */
export function wrapToFitLines(
  ctx: CanvasRenderingContext2D,
  words: string[],
  fontFor: (sizePx: number) => string,
  startSize: number,
  minSize: number,
  maxWidth: number,
  maxLines: number,
): { size: number; lines: string[] } {
  let size = startSize;
  for (;;) {
    ctx.font = fontFor(size);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    if (lines.length <= maxLines || size <= minSize) return { size, lines };
    size -= 2;
  }
}

/** Greedy word-wrap against a measured width. Never returns an empty array. */
export function wrapWords(
  ctx: CanvasRenderingContext2D,
  words: string[],
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  return lines;
}

/** The grain seed for a card — derived, never random. */
export function grainSeedFor(palette: MoodPalette): number {
  return hashString(`${palette.slug}\u0000${palette.seed}`);
}
