/**
 * Editorial layout — the poster voice.
 *
 * Grammar: eyebrow row → giant Fraunces hero (the mood word takes the role
 * Wrapped gives the big numeral) → caption line → full-width swatch band of
 * seeded fractions → quiet footer. Flat field, hairline bands, generous air.
 * Long moods wrap to two stacked lines like real posters; each line is fitted
 * against its own measured width so the block stays optically even.
 */

import { getFontStacks } from "../fonts";
import { hexToRgba } from "../rand";
import { applyGrain, makeGrainTile } from "../grain";
import type { CardFormat } from "../types";
import {
  drawEyebrowRow,
  drawGround,
  drawHairline,
  drawWatermark,
  fitFontSize,
  grainSeedFor,
  monoFont,
  prepareCanvas,
  pu,
  swatchFractions,
  wrapToFitLines,
  type RenderArgs,
} from "./parts";

export function renderEditorial({ canvas, palette, format, dpr }: RenderArgs): void {
  // Thread the backing-store multiplier through: drawing maths stays at the
  // format's logical size, the bitmap scales (the dpr-aware render fix).
  const { ctx, w, h } = prepareCanvas(canvas, format, dpr);
  const fonts = getFontStacks();
  const m = pu(w, 64); // page margin
  const innerW = w - m * 2;

  drawGround(ctx, w, h, palette);

  // ── Eyebrow band ──────────────────────────────────────────────────────────
  const ruleY = drawEyebrowRow(ctx, w, m, m, palette, "mood · no. 001");
  let cursorY = ruleY + pu(w, 10);

  // ── Hero: the mood word(s), sized by width AND a hard vertical budget ────
  const words = palette.mood.trim().split(/\s+/).filter(Boolean);
  const phrase = words.join(" ");
  const maxHeroSize = format === "wide" ? pu(w, 210) : pu(w, 190);
  const heroFor = (size: number) => `300 ${size}px ${fonts.display}`;
  const LH = 1.06;   // hero line-height factor
  // Post-hero trail must clear the descender (~0.25em) plus air — 0.16 put
  // the caption in contact with "gust"-style descenders on big type.
  const TRAIL = 0.34;

  // Fixed furniture below the hero, in px: caption + band rule + swatch band
  // + role labels + the watermark's reserved footer zone.
  const contentTop = ruleY + pu(w, 10);
  const furniture =
    pu(w, 62) +                                                    // caption block
    pu(w, 68) +                                                    // band rule + gaps
    (format === "wide" ? pu(w, 92) : pu(w, 110)) + pu(w, 46) +     // bar + labels
    pu(w, 86);                                                     // watermark zone
  const heroBudget = Math.max(40, h - contentTop - furniture);

  // Candidate A: the whole phrase on one line.
  const singleFit = fitFontSize(ctx, phrase, heroFor, maxHeroSize, innerW);
  const sizeSingle = Math.min(singleFit, heroBudget / (LH + TRAIL));

  // Candidate B: stacked poster lines (shrink-to-fit, never drops words).
  const longestWord = words.reduce((a, b) => (a.length >= b.length ? a : b));
  const wordFit = fitFontSize(ctx, longestWord, heroFor, maxHeroSize, innerW);
  const twoLine = wrapToFitLines(
    ctx,
    words,
    heroFor,
    Math.max(wordFit, singleFit),
    24,
    innerW,
    2,
  );
  const sizeTwo =
    twoLine.lines.length === 2 ? Math.min(twoLine.size, heroBudget / (2 * LH + TRAIL)) : 0;

  // Biggest type wins — posters shout. (Candidate B collapsing to one line
  // can't beat candidate A on width, so it is never chosen.)
  let heroLines: string[];
  let heroSize: number;
  if (sizeSingle >= sizeTwo) {
    heroSize = sizeSingle;
    heroLines = [phrase];
  } else {
    heroSize = sizeTwo;
    ctx.font = heroFor(heroSize);
    heroLines = wrapToFitLines(ctx, words, heroFor, heroSize, 24, innerW, 2).lines;
  }

  ctx.font = heroFor(heroSize);
  ctx.fillStyle = palette.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const lineHeight = heroSize * LH;
  for (const line of heroLines) {
    cursorY += lineHeight;
    ctx.fillText(line, m, cursorY);
  }
  cursorY += heroSize * TRAIL;

  // ── Caption under the hero ────────────────────────────────────────────────
  cursorY += pu(w, 26);
  monoFont(ctx, w, 16.5);
  ctx.fillStyle = hexToRgba(palette.accent, 0.95);
  const caption = `${palette.mood.toUpperCase()} · PALETTE STUDY`;
  ctx.fillText(caption, m, cursorY);
  cursorY += pu(w, 14);

  // ── Hairline above the swatch band ───────────────────────────────────────
  const bandTopGap = format === "wide" ? 26 : 34;
  cursorY += pu(w, bandTopGap);
  drawHairline(ctx, m, w - m, cursorY, w, palette);
  cursorY += pu(w, 30);

  // ── Swatch band: framed full-width bar, every role visible ───────────────
  const swatchColors = [palette.bg, palette.mid, palette.accent, palette.surface, palette.ink];
  const fracs = swatchFractions(palette.slug, palette.seed, swatchColors.length);
  const barH = format === "wide" ? pu(w, 92) : pu(w, 110);

  let x = m;
  swatchColors.forEach((color, i) => {
    const isLast = i === swatchColors.length - 1;
    const segW = innerW * fracs[i];
    ctx.fillStyle = color;
    ctx.fillRect(x, cursorY, isLast ? segW + 1 : segW, barH);
    if (!isLast) {
      ctx.fillStyle = hexToRgba(palette.ink, 0.3);
      ctx.fillRect(x + segW - Math.max(1, pu(w, 1)), cursorY, Math.max(1, pu(w, 2)), barH);
    }
    x += segW;
  });
  // Frame the whole band so the field swatch reads as a deliberate panel.
  ctx.strokeStyle = hexToRgba(palette.ink, 0.35);
  ctx.lineWidth = Math.max(1, pu(w, 2));
  ctx.strokeRect(m, cursorY, innerW, barH);
  cursorY += barH;

  // Role labels under each segment's left edge — shown only when the
  // measured label actually fits inside its segment.
  ctx.textAlign = "left";
  monoFont(ctx, w, 13);
  ctx.fillStyle = hexToRgba(palette.ink, 0.55);
  const roles = ["FIELD", "MID", "ACCENT", "SURFACE", "INK"];
  const labelInset = pu(w, 12);
  x = m;
  roles.forEach((role, i) => {
    const segW = innerW * fracs[i];
    if (ctx.measureText(role).width + labelInset * 2 <= segW) {
      ctx.fillText(role, x + labelInset, cursorY + pu(w, 30));
    }
    x += segW;
  });
  cursorY += pu(w, 46);

  // ── Watermark ────────────────────────────────────────────────────────────
  drawWatermark(ctx, w, h, m - pu(w, 22), palette);

  // ── Grain, last so it textures everything including type edges ───────────
  applyGrain(ctx, w, h, makeGrainTile(grainSeedFor(palette)), palette.grain);
}
