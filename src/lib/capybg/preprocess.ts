/**
 * The model-facing half of preprocessing, pure so node can table-test it.
 * The browser half (decode → resize → getImageData) lives in client.ts;
 * everything here takes pixels that are ALREADY at the model's input size.
 *
 * Contracts are from each model's card (docs/plans/capybg.md §3.1):
 * - MODNet: shortest edge 512, both sides rounded to a multiple of 32,
 *   aspect kept; ×1/255 then (x − 0.5)/0.5.
 * - BiRefNet: stretched to 1024×1024 (aspect restored on the way back);
 *   ×1/255 then ImageNet mean/std. Input tensor is float32 — the "fp16" in
 *   the file name is weights-only (verified, plan §11.1).
 * Both: interleaved RGBA in, planar NCHW float32 out.
 */

import type { ModelSpec } from "./models";

export interface ModelSize {
  width: number;
  height: number;
}

/** The canvas size a source image must be drawn at for this model. */
export function modelInputSize(spec: ModelSpec, srcW: number, srcH: number): ModelSize {
  const input = spec.input;
  if (input.kind === "fixed") {
    return { width: input.size, height: input.size };
  }
  const scale = input.edge / Math.min(srcW, srcH);
  const roundTo = (n: number) => Math.max(input.multiple, Math.round(n / input.multiple) * input.multiple);
  return { width: roundTo(srcW * scale), height: roundTo(srcH * scale) };
}

/** RGBA at the model's input size → one Float32Array holding 1×3×H×W. */
export function toModelTensor(rgba: Uint8Array | Uint8ClampedArray, spec: ModelSpec): Float32Array {
  const pixels = rgba.length >> 2;
  const tensor = new Float32Array(pixels * 3);
  const [mr, mg, mb] = spec.mean;
  const [sr, sg, sb] = spec.std;
  for (let i = 0; i < pixels; i++) {
    const j = i << 2;
    tensor[i] = (rgba[j] / 255 - mr) / sr;
    tensor[pixels + i] = (rgba[j + 1] / 255 - mg) / sg;
    tensor[pixels * 2 + i] = (rgba[j + 2] / 255 - mb) / sb;
  }
  return tensor;
}
