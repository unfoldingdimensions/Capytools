/**
 * The signature grain — layered noise that kills gradient banding and makes
 * fields read as printed art instead of flat CSS fills.
 *
 * Rendered once per card as a small offscreen tile of seeded value noise,
 * then stamped across the card at low alpha with `overlay` compositing
 * (mid-grey ≈ neutral, deviations push local contrast — film-grain behaviour).
 *
 * The tile is DETERMINISTIC: same seed ⇒ same noise, forever. This is why the
 * grain lives in the renderer instead of a CSS/SVG filter — feTurbulence is
 * spec'd but not byte-stable across browsers, and determinism is the product.
 */

import { makeRng } from "./rand";

export function makeGrainTile(seed: number, size = 160): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const g = tile.getContext("2d");
  if (!g) return tile;

  const rng = makeRng("grain", String(seed));
  const image = g.createImageData(size, size);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    // Mid-grey centred noise; overlay blending turns deviation into texture.
    const v = 108 + Math.floor(rng() * 40); // 108..147
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return tile;
}

/** Stamp the grain across the whole card. `strength` is the palette's 0..1. */
export function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tile: HTMLCanvasElement,
  strength: number,
): void {
  if (strength <= 0) return;
  const previousOperation = ctx.globalCompositeOperation;
  const previousAlpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = strength * 0.28;
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = previousOperation;
  ctx.globalAlpha = previousAlpha;
}
