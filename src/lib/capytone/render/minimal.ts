/**
 * Minimal layout — the modern voice.
 *
 * Differentiates from editorial by composition and type voice: a calm
 * mid-tone field edged top and bottom by accent bars, the mood set in bold
 * sans (not serif) as dark type on the mid field, mono metadata row up top,
 * and swatches as a slim bottom strip with hex-role labels. Where editorial
 * is a poster, minimal is an album cover.
 */

import { getFontStacks } from "../fonts";
import { hexToRgba } from "../rand";
import { applyGrain, makeGrainTile } from "../grain";
import type { CardFormat, MoodPalette } from "../types";
import {
  drawTracked,
  drawWatermark,
  fitFontSize,
  grainSeedFor,
  monoFont,
  prepareCanvas,
  pu,
  wrapToFitLines,
  type RenderArgs,
} from "./parts";

export function renderMinimal({ canvas, palette, format, dpr }: RenderArgs): void {
  // Thread the backing-store multiplier through: drawing maths stays at the
  // format's logical size, the bitmap scales (the dpr-aware render fix).
  const { ctx, w, h } = prepareCanvas(canvas, format, dpr);
  const fonts = getFontStacks();
  const m = pu(w, 64);
  const innerW = w - m * 2;

  // ── Ground: calm mid field, accent edges ──────────────────────────────────
  ctx.fillStyle = palette.mid;
  ctx.fillRect(0, 0, w, h);
  const edge = pu(w, 14);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, w, edge);
  ctx.fillRect(0, h - edge, w, edge);

  // ── Top row: wordmark left, mood slug right ──────────────────────────────
  ctx.textBaseline = "alphabetic";
  monoFont(ctx, w, 16);
  ctx.fillStyle = hexToRgba(palette.ink, 0.72);
  const baselineTop = m + pu(w, 22);
  drawTracked(ctx, "CAPYTONE", m, baselineTop, pu(w, 4.2), "left");
  drawTracked(ctx, `MOOD · ${palette.seed}`, w - m, baselineTop, pu(w, 4.2), "right");

  // ── Hero: bold sans mood as dark type on the mid field ───────────────────
  // Vertical corridor between the top row and the swatch strip governs the
  // type — a fixed-percentage anchor let big two-line heroes paint straight
  // over the metadata row.
  const words = palette.mood.trim().split(/\s+/).filter(Boolean);
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b));
  const maxSize = format === "wide" ? pu(w, 150) : pu(w, 168);
  const heroFor = (size: number) => `700 ${size}px ${fonts.sans}`;
  // Width pass: longest word guarantees every wrapped line fits.
  const fitted = fitFontSize(ctx, longest, heroFor, maxSize, innerW);
  const { size: widthSize } = wrapToFitLines(ctx, words, heroFor, fitted, 24, innerW, 2);

  // Height pass: hard corridor [below top row, above swatch strip].
  const LH = 1.12; // bold sans wants a touch more leading than the serif
  const corridorTop = m + pu(w, 54);
  const stripY = h - m - pu(w, 96);
  const corridorBottom = stripY - pu(w, 34);
  const corridor = Math.max(pu(w, 120), corridorBottom - corridorTop);
  // Assume the worst case (two lines) so wrapping never surprises the budget.
  const heightCap = corridor / (2 * LH);

  const heroSize = Math.max(24, Math.min(widthSize, maxSize, heightCap));
  ctx.font = heroFor(heroSize);
  const { lines } = wrapToFitLines(ctx, words, heroFor, heroSize, 24, innerW, 2);

  ctx.fillStyle = palette.bg;
  ctx.textAlign = "left";
  const lineHeight = heroSize * LH;
  const blockHeight = lineHeight * (lines.length - 1) + heroSize;
  let y = corridorTop + (corridor - blockHeight) / 2 + heroSize * 0.82;
  for (const line of lines) {
    ctx.fillText(line, m, y);
    y += lineHeight;
  }

  // ── Swatch strip: slim bar with role labels ──────────────────────────────
  // (stripY is defined once, in the hero-corridor computation above)
  const roles = [palette.bg, palette.accent, palette.surface, palette.ink];
  const labels = ["FIELD", "ACCENT", "SURFACE", "INK"];
  const segW = innerW / roles.length;
  roles.forEach((color, i) => {
    const x = m + i * segW;
    ctx.fillStyle = color;
    ctx.fillRect(x, stripY, i === roles.length - 1 ? segW : segW - 1, pu(w, 56));
    monoFont(ctx, w, 13.5);
    ctx.fillStyle = hexToRgba(palette.ink, 0.78);
    ctx.fillText(labels[i], x, stripY + pu(w, 82));
  });

  // ── Watermark ────────────────────────────────────────────────────────────
  drawWatermark(ctx, w, h, m - pu(w, 22), palette);

  // ── Grain last ───────────────────────────────────────────────────────────
  applyGrain(ctx, w, h, makeGrainTile(grainSeedFor(palette)), palette.grain);
}
