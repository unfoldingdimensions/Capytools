import {
  fontString,
  resolveFamilyList,
} from "./fonts";
import { logoBox, markBox, textFontSize, tilePositions } from "./geometry";
import type { StampSpec, TextMark } from "./types";

/**
 * THE one drawing function. The preview calls it on a display-sized canvas,
 * the export on a full-size one — there is no second renderer, which is what
 * makes "the preview is the export" a fact rather than a promise. Everything
 * inside is proportional to ctx.canvas, so the two agree by construction.
 *
 * Browser-only: guard() keeps a server import from constructing canvases.
 */

export class StampRenderError extends Error {
  constructor() {
    super("capystamp/render is browser-only");
    this.name = "StampRenderError";
  }
}

function guard(): void {
  if (typeof document === "undefined") throw new StampRenderError();
}

/** Does this engine take `ctx.letterSpacing`? (Firefox historically didn't.) */
function supportsLetterSpacing(ctx: CanvasRenderingContext2D): boolean {
  return typeof (ctx as { letterSpacing?: unknown }).letterSpacing === "string";
}

/** Relative luminance of #rrggbb, 0–1. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** A light mark gets a dark halo and the reverse — legibility either way. */
export function haloInk(colour: string): string {
  try {
    return luminance(colour) > 0.55 ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";
  } catch {
    return "rgba(0, 0, 0, 0.65)";
  }
}

/**
 * Whole-string width under the SAME letter-spacing method drawText uses —
 * measure and draw must agree or the halo and the box drift apart.
 */
export function measureTextWidth(ctx: CanvasRenderingContext2D, spec: TextMark, fontPx: number): number {
  if (supportsLetterSpacing(ctx)) {
    ctx.letterSpacing = `${spec.letterSpacing}em`;
    const width = ctx.measureText(spec.text).width;
    ctx.letterSpacing = "0em";
    return width;
  }
  let width = 0;
  for (const glyph of spec.text) {
    width += ctx.measureText(glyph).width + spec.letterSpacing * fontPx;
  }
  // The trailing gap is spacing BETWEEN glyphs, not after the last.
  return Math.max(0, width - spec.letterSpacing * fontPx);
}

/** Draw the text (or logo) once, centred on the current transform origin. */
function drawOne(
  ctx: CanvasRenderingContext2D,
  spec: StampSpec,
  vars: Partial<Record<string, string>>,
): void {
  if (spec.kind === "logo") return; // logos draw in drawStamp (needs the image)
  const fontPx = textFontSize(ctx.canvas.width, ctx.canvas.height, spec);
  const family = resolveFamilyList(spec.font, vars);
  ctx.font = fontString(spec.weight, fontPx, family);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const width = measureTextWidth(ctx, spec, fontPx);
  const spacingPx = spec.letterSpacing * fontPx;
  const x = -width / 2;

  if (spec.halo === "outline") {
    ctx.lineWidth = Math.max(1, fontPx * 0.08);
    ctx.strokeStyle = haloInk(spec.colour);
    ctx.lineJoin = "round";
    if (supportsLetterSpacing(ctx)) {
      ctx.letterSpacing = `${spec.letterSpacing}em`;
      ctx.strokeText(spec.text, x, 0);
    } else {
      let cursor = x;
      for (const glyph of spec.text) {
        ctx.strokeText(glyph, cursor, 0);
        cursor += ctx.measureText(glyph).width + spacingPx;
      }
    }
  }

  ctx.fillStyle = spec.colour;
  if (supportsLetterSpacing(ctx)) {
    ctx.letterSpacing = `${spec.letterSpacing}em`;
    ctx.fillText(spec.text, x, 0);
    ctx.letterSpacing = "0em";
  } else {
    let cursor = x;
    for (const glyph of spec.text) {
      ctx.fillText(glyph, cursor, 0);
      cursor += ctx.measureText(glyph).width + spacingPx;
    }
  }
}

/**
 * Draw the source image to fill the canvas exactly, then the mark(s) at the
 * positions geometry.ts computes for THIS canvas's size. `vars` carries the
 * next/font CSS-variable values read at runtime (fonts.ts); `logoAspect` is
 * the logo's naturalWidth/naturalHeight.
 */
export function drawStamp(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  spec: StampSpec,
  logo?: HTMLImageElement | null,
  opts?: { vars?: Partial<Record<string, string>>; logoAspect?: number },
): void {
  guard();
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.drawImage(source, 0, 0, w, h);

  const vars = opts?.vars ?? {};
  ctx.globalAlpha = spec.opacity;
  if (spec.kind === "text" && spec.halo === "shadow") {
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = spec.size * Math.min(w, h) * 0.18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  const box = (() => {
    if (spec.kind !== "text") return logoBox(w, h, spec, opts?.logoAspect ?? 1);
    const fontPx = textFontSize(w, h, spec);
    ctx.font = fontString(spec.weight, fontPx, resolveFamilyList(spec.font, vars));
    return { width: measureTextWidth(ctx, spec, fontPx), height: fontPx };
  })();

  // Both placement paths resolve to mark CENTRES, so the draw loop is one shape.
  const centres =
    spec.tiling === "none"
      ? (() => {
          const placed = markBox(w, h, spec, box);
          return [{ x: placed.x + box.width / 2, y: placed.y + box.height / 2 }];
        })()
      : tilePositions(w, h, box, spec.tiling, spec.gap);

  for (const centre of centres) {
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate((spec.rotation * Math.PI) / 180);
    if (spec.kind === "logo" && logo) {
      ctx.drawImage(logo, -box.width / 2, -box.height / 2, box.width, box.height);
    } else if (spec.kind === "text") {
      drawOne(ctx, spec, vars);
    }
    ctx.restore();
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
