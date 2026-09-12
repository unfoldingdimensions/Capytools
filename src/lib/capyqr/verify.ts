/**
 * The proof scan — jsQR over the rendered canvas, in-tab.
 *
 * This is the tool's ground truth: no styled-code claims, just what this
 * exact pixel data decodes to. `attemptBoth` doubles the work so inverted
 * codes (light modules on dark) decode too — irrelevant at export sizes.
 */

import jsQR from "jsqr";

export type VerifyResult = { ok: true; data: string } | { ok: false };

export function verifyCanvas(canvas: HTMLCanvasElement): VerifyResult {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return { ok: false };
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const found = jsQR(image.data, canvas.width, canvas.height, {
    inversionAttempts: "attemptBoth",
  });
  if (!found?.data) return { ok: false };
  return { ok: true, data: found.data };
}
