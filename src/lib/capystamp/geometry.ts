import type { Anchor, StampSpec, Tiling } from "./types";

/**
 * Where a mark lands on a given image, in that image's pixels — computed from
 * nothing but fractions of the image and the mark. These are the functions the
 * whole tool rests on: the same spec must land proportionally on 4000×3000,
 * 3000×4000 and 1080×1080, and the preview (drawn small) and the export
 * (drawn full) must agree, because both call this one module.
 */

/** Untiled marks sit this far in from their anchored edges — until a drag
 *  moves them past it (an offset on that axis takes over). */
export const SAFE_MARGIN = 0.03;

/** Tiles are bounded: a tiny mark and a zero gap must not request a million
 *  draws. 20 × 20 covers any honest watermark pattern. */
export const MAX_TILES = 400;

export interface Box {
  width: number;
  height: number;
}

export interface PlacedBox extends Box {
  x: number;
  y: number;
}

const anchorColumn = (anchor: Anchor): "l" | "c" | "r" =>
  anchor.endsWith("l") ? "l" : anchor.endsWith("r") ? "r" : "c";
const anchorRow = (anchor: Anchor): "t" | "c" | "b" =>
  anchor.startsWith("t") ? "t" : anchor.startsWith("b") ? "b" : "c";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * The full box origin for an anchor: the safe margin on the edges the anchor
 * touches, then the drag offset added straight onto the origin (positive is
 * always right/down, whichever anchor is active — a drag on that axis takes
 * over from the margin).
 */
export function anchorPoint(
  anchor: Anchor,
  imageW: number,
  imageH: number,
  box: Box,
  offsetX: number,
  offsetY: number,
): PlacedBox {
  const margin = SAFE_MARGIN * Math.min(imageW, imageH);
  const col = anchorColumn(anchor);
  const row = anchorRow(anchor);

  let x: number;
  if (col === "l") x = margin;
  else if (col === "r") x = imageW - box.width - margin;
  else x = (imageW - box.width) / 2;
  x += offsetX * imageW;

  let y: number;
  if (row === "t") y = margin;
  else if (row === "b") y = imageH - box.height - margin;
  else y = (imageH - box.height) / 2;
  y += offsetY * imageH;

  // Never hang off the canvas, however the numbers arrived. A mark larger
  // than the image centres rather than clamping to a negative origin.
  x = box.width >= imageW ? (imageW - box.width) / 2 : clamp(x, 0, imageW - box.width);
  y = box.height >= imageH ? (imageH - box.height) / 2 : clamp(y, 0, imageH - box.height);

  return { x, y, width: box.width, height: box.height };
}

/** The mark's pixel size on this image, from the fraction of its short side. */
export function shortSide(imageW: number, imageH: number): number {
  return Math.min(imageW, imageH);
}

/** Text: the font size in px for this image. */
export function textFontSize(imageW: number, imageH: number, spec: StampSpec): number {
  return Math.max(1, spec.size * shortSide(imageW, imageH));
}

/** Logo: px box keeping the logo's aspect, its LONGER side = size × short side. */
export function logoBox(imageW: number, imageH: number, spec: StampSpec, aspect: number): Box {
  const longer = Math.max(1, spec.size * shortSide(imageW, imageH));
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return safeAspect >= 1
    ? { width: longer, height: longer / safeAspect }
    : { width: longer * safeAspect, height: longer };
}

/**
 * The full placement for an untiled mark: size from `measured` (the caller
 * measures text with the same canvas it draws with), position from the anchor,
 * the safe margin, the drag offset, and the never-off-canvas clamp.
 */
export function markBox(
  imageW: number,
  imageH: number,
  spec: StampSpec,
  measured: Box,
): PlacedBox {
  const box = { width: measured.width, height: measured.height };
  return anchorPoint(spec.anchor, imageW, imageH, box, spec.offset.x, spec.offset.y);
}

/**
 * Mark centres for a tiling, covering the image with the configured gap.
 * Grid: rows × columns across the whole canvas. Diagonal: marks marching
 * corner to corner. Both cap at MAX_TILES by stretching the spacing.
 */
export function tilePositions(
  imageW: number,
  imageH: number,
  box: Box,
  tiling: Tiling,
  gap: number,
): Array<{ x: number; y: number }> {
  if (tiling === "none") return [];
  const gapPx = Math.max(0, gap) * Math.max(box.width, box.height);

  if (tiling === "diagonal") {
    const spacing = Math.hypot(box.width, box.height) + gapPx;
    const count = Math.max(1, Math.min(MAX_TILES, Math.ceil(Math.hypot(imageW, imageH) / spacing)));
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      out.push({ x: t * imageW, y: t * imageH });
    }
    return out;
  }

  const spacingX = Math.max(1, box.width + gapPx);
  const spacingY = Math.max(1, box.height + gapPx);
  let cols = Math.max(1, Math.ceil(imageW / spacingX));
  let rows = Math.max(1, Math.ceil(imageH / spacingY));
  while (cols * rows > MAX_TILES) {
    // Stretch the grid until it fits the cap — the honest answer to a tiny
    // mark at gap 0 is fewer, larger-spaced tiles, not an unbounded loop.
    if (cols >= rows && cols > 1) cols -= 1;
    else if (rows > 1) rows -= 1;
    else break;
  }
  const out: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: ((c + 0.5) * imageW) / cols, y: ((r + 0.5) * imageH) / rows });
    }
  }
  return out;
}
