/**
 * The proof scan — jsQR over the rendered canvas, in-tab.
 *
 * This is the tool's ground truth: no styled-code claims, just what this exact
 * pixel data decodes to.
 *
 * Upright first, inverted second — never `attemptBoth`. A light-on-dark code
 * decodes fine here but is a real-world *scanner* difference, not a size one:
 * plenty of scanners only try the upright pass and simply refuse it. Folding
 * both into one boolean would let the tool certify a code half the phones in
 * the world cannot read, so the inverted case comes back labelled.
 *
 * The second pass inverts the pixels by hand rather than asking jsQR for it:
 * in jsqr@1.4.0 `inversionAttempts: "onlyInvert"` scans a buffer the binarizer
 * only fills for "attemptBoth"/"invertFirst", so it throws
 * `Cannot read properties of undefined (reading 'height')` every time. Passing
 * the same option on both calls also sidesteps that release's other quirk —
 * it mutates its shared defaults object with whatever the last caller passed.
 */

import jsQR from "jsqr";

export type VerifyResult =
  | { ok: true; data: string; inverted: boolean }
  | { ok: false };

/** Decode one upright pass over raw RGBA. Pure — the tests drive this directly. */
function decodeUpright(pixels: Uint8ClampedArray, width: number, height: number): string | null {
  return jsQR(pixels, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

function invertRgb(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const flipped = new Uint8ClampedArray(pixels);
  for (let at = 0; at < flipped.length; at += 4) {
    flipped[at] = 255 - flipped[at];
    flipped[at + 1] = 255 - flipped[at + 1];
    flipped[at + 2] = 255 - flipped[at + 2];
  }
  return flipped;
}

/** The whole proof, over raw pixels — no DOM, so node can run it. */
export function verifyPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): VerifyResult {
  if (width === 0 || height === 0) return { ok: false };
  const upright = decodeUpright(pixels, width, height);
  if (upright) return { ok: true, data: upright, inverted: false };
  const flipped = decodeUpright(invertRgb(pixels), width, height);
  if (flipped) return { ok: true, data: flipped, inverted: true };
  return { ok: false };
}

export function verifyCanvas(canvas: HTMLCanvasElement): VerifyResult {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return { ok: false };
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return verifyPixels(image.data, canvas.width, canvas.height);
}
