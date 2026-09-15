/**
 * The frame geometry — pure math, no DOM, so node tests can hold every
 * shape to its invariants.
 *
 * The one invariant that matters most: the frame never touches the modules.
 * The engine renders the QR (with its own quiet-zone margin) onto a canvas
 * of `qrSize` pixels, and this module places that canvas inside the export
 * stage so every band sits strictly outside it. The ISO quiet zone lives
 * inside the engine canvas; the frame lives outside both.
 *
 * Shapes:
 * - band   — frame color on all four sides, caption inside its band
 * - banner — a single band on the caption side only
 * - card   — like band, but the outer corners are rounded (an even-odd ring)
 * - tab    — a small ribbon on the caption side, the rest keeps the code's
 *            own background
 */

import type { FrameState } from "./types";

export interface FrameBand {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
}

export interface FrameCaption {
  /** Center point; the compose step sets text alignment/baseline. */
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
}

export interface FrameLayout {
  /** The engine canvas's edge — the QR plus its own quiet-zone margin. */
  qrSize: number;
  qrX: number;
  qrY: number;
  bands: FrameBand[];
  /**
   * The card shape's rounded border: an outer rounded rect minus an inner
   * one, filled even-odd. Null for every other shape (they use `bands`).
   */
  ring: {
    outer: { x: number; y: number; w: number; h: number; radius: number };
    inner: { x: number; y: number; w: number; h: number; radius: number };
  } | null;
  caption: FrameCaption | null;
}

export interface FrameLayoutInput {
  size: number;
  moduleCount: number;
  frame: FrameState;
}

const round = (px: number) => Math.round(px);

export function frameLayout(input: FrameLayoutInput): FrameLayout {
  const { size, moduleCount, frame } = input;
  const identity: FrameLayout = {
    qrSize: size,
    qrX: 0,
    qrY: 0,
    bands: [],
    ring: null,
    caption: null,
  };
  if (!frame.on || size <= 0 || moduleCount <= 0) return identity;

  const hasLabel = frame.label.trim().length > 0;
  const top = frame.position === "top";
  let frameColorBands: FrameBand[] = [];
  let ring: FrameLayout["ring"] = null;
  let captionBand: { at: number; height: number; width: number } | null = null;

  // Edges of the region the QR canvas may occupy, inset per shape.
  let insetLeft = 0;
  let insetRight = 0;
  let insetTop = 0;
  let insetBottom = 0;

  if (frame.shape === "band") {
    const side = round(size * 0.08);
    const capSide = hasLabel ? round(size * 0.15) : side;
    const capAt = top ? 0 : size - capSide;
    frameColorBands = [
      { x: 0, y: 0, w: size, h: top ? capSide : side, radius: 0 },
      { x: 0, y: size - (top ? side : capSide), w: size, h: top ? side : capSide, radius: 0 },
      { x: 0, y: top ? capSide : side, w: side, h: size - capSide - side, radius: 0 },
      { x: size - side, y: top ? capSide : side, w: side, h: size - capSide - side, radius: 0 },
    ];
    insetLeft = side;
    insetRight = side;
    insetTop = top ? capSide : side;
    insetBottom = top ? side : capSide;
    if (hasLabel) captionBand = { at: capAt, height: capSide, width: size };
  } else if (frame.shape === "card") {
    const side = round(size * 0.1);
    const capSide = hasLabel ? round(size * 0.16) : side;
    const radius = round(size * 0.06);
    const innerW = size - 2 * side;
    const innerH = size - capSide - side;
    ring = {
      outer: { x: 0, y: 0, w: size, h: size, radius },
      inner: {
        x: side,
        y: top ? capSide : side,
        w: innerW,
        h: innerH,
        radius: Math.max(1, round(radius * 0.5)),
      },
    };
    insetLeft = side;
    insetRight = side;
    insetTop = top ? capSide : side;
    insetBottom = top ? side : capSide;
    if (hasLabel) captionBand = { at: top ? 0 : size - capSide, height: capSide, width: size };
  } else if (frame.shape === "banner") {
    const bandH = round(size * (hasLabel ? 0.16 : 0.08));
    const at = top ? 0 : size - bandH;
    frameColorBands = [{ x: 0, y: at, w: size, h: bandH, radius: 0 }];
    if (top) insetTop = bandH;
    else insetBottom = bandH;
    if (hasLabel) captionBand = { at, height: bandH, width: size };
  } else {
    // tab — a centered ribbon on the caption side.
    const ribbonH = round(size * 0.12);
    const ribbonW = round(size * 0.62);
    const at = top ? 0 : size - ribbonH;
    frameColorBands = [
      { x: round((size - ribbonW) / 2), y: at, w: ribbonW, h: ribbonH, radius: round(ribbonH * 0.3) },
    ];
    if (top) insetTop = ribbonH;
    else insetBottom = ribbonH;
    if (hasLabel) {
      captionBand = { at, height: ribbonH, width: ribbonW };
    }
  }

  const innerW = size - insetLeft - insetRight;
  const innerH = size - insetTop - insetBottom;
  const qrSize = Math.min(innerW, innerH);
  const qrX = insetLeft + round((innerW - qrSize) / 2);
  const qrY = insetTop + round((innerH - qrSize) / 2);

  const caption = hasLabel && captionBand
    ? {
        x: round(size / 2),
        y: captionBand.at + captionBand.height / 2,
        maxWidth: captionBand.width - round(size * 0.06),
        fontSize: Math.min(size * 0.052, captionBand.height * 0.46),
      }
    : null;

  return { qrSize, qrX, qrY, bands: frameColorBands, ring, caption };
}
