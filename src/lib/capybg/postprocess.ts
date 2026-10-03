/**
 * The matte's way back to pixels, pure so node can table-test it.
 *
 * Model output → alpha, in four steps, each its own function:
 * 1. `matteFromModelOutput` — sigmoid for the logit models (BiRefNet), a
 *    plain clamp for the ones that already emit [0, 1] (MODNet).
 * 2. `resizeMatte` — bilinear back up to the source size.
 * 3. `featherMatte` — a small box blur so the edge isn't knife-sharp;
 *    radius 0 is the identity.
 * 4. `applyMatte` — writes channel 3 and NOTHING else.
 */

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Model output → matte values in [0, 1]. */
export function matteFromModelOutput(output: Float32Array, needsSigmoid: boolean): Float32Array {
  const matte = new Float32Array(output.length);
  for (let i = 0; i < output.length; i++) {
    const v = output[i];
    matte[i] = needsSigmoid ? sigmoid(v) : v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return matte;
}

/** Bilinear resize of a single-channel matte, edges clamped. */
export function resizeMatte(matte: Float32Array, w: number, h: number, outW: number, outH: number): Float32Array {
  if (w === outW && h === outH) return matte.slice();
  const out = new Float32Array(outW * outH);
  const xRatio = w / outW;
  const yRatio = h / outH;
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(Math.max((y + 0.5) * yRatio - 0.5, 0), h - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(h - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(Math.max((x + 0.5) * xRatio - 0.5, 0), w - 1);
      const x0 = Math.floor(sx);
      const x1 = Math.min(w - 1, x0 + 1);
      const fx = sx - x0;
      const top = matte[y0 * w + x0] * (1 - fx) + matte[y0 * w + x1] * fx;
      const bottom = matte[y1 * w + x0] * (1 - fx) + matte[y1 * w + x1] * fx;
      out[y * outW + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return out;
}

/**
 * Radius-`radius` box blur, separable. Runs on the MODEL-SIZED matte (the
 * big one is recomposed per render), so even radius 3 is cheap.
 */
export function featherMatte(matte: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return matte.slice();
  const r = Math.min(Math.round(radius), 3);
  const horizontal = new Float32Array(matte.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let d = -r; d <= r; d++) {
        const xx = Math.min(w - 1, Math.max(0, x + d));
        sum += matte[y * w + xx];
        count++;
      }
      horizontal[y * w + x] = sum / count;
    }
  }
  const out = new Float32Array(matte.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let d = -r; d <= r; d++) {
        const yy = Math.min(h - 1, Math.max(0, y + d));
        sum += horizontal[yy * w + x];
        count++;
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

/** Write the matte into the alpha channel; RGB is the photo's business. */
export function applyMatte(rgba: Uint8ClampedArray, matte: Float32Array): void {
  const pixels = rgba.length >> 2;
  if (matte.length < pixels) throw new Error("matte smaller than the image");
  for (let i = 0; i < pixels; i++) {
    rgba[(i << 2) + 3] = Math.round(Math.min(1, Math.max(0, matte[i])) * 255);
  }
}
