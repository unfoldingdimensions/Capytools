/**
 * Card renderer entry point.
 *
 * Renders a palette into a canvas at full export resolution (1200×630 /
 * 1080×1080 logical). Callers pass a `dpr` to scale the backing store —
 * the preview uses the real devicePixelRatio, exports 2 — while the drawing
 * maths stays in logical coordinates.
 */

import type { CardFormat, MoodPalette } from "../types";
import { ensureFontsReady } from "../fonts";
import { renderEditorial } from "./editorial";
import { renderMinimal } from "./minimal";
import { prepareCanvas, type RenderArgs } from "./parts";

export type LayoutName = "editorial" | "minimal";

/**
 * Draw a card. Awaits webfonts so Fraunces/Jakarta/Albert Sans are guaranteed
 * loaded before any glyph hits pixels — canvas silently falls back otherwise,
 * which is how blurry-font disasters happen.
 */
export async function renderCard(
  canvas: HTMLCanvasElement,
  palette: MoodPalette,
  layout: LayoutName,
  format: CardFormat,
  dpr = 1,
): Promise<void> {
  await ensureFontsReady();
  const args: RenderArgs = { canvas, palette, format, dpr };
  // Size first so the element has real dimensions before drawing begins.
  prepareCanvas(canvas, format, dpr);
  if (layout === "editorial") renderEditorial(args);
  else renderMinimal(args);
}

export const LAYOUTS: { id: LayoutName; label: string }[] = [
  { id: "editorial", label: "Editorial" },
  { id: "minimal", label: "Minimal" },
];
