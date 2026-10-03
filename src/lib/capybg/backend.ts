/**
 * Which backend runs the model — decided once, stated honestly, never
 * guessed twice. Pure, so the truth table is table-tested from node.
 *
 * The worker probes `navigator.gpu` and an adapter itself (workers can do
 * both); whatever it decides, the page repeats verbatim. When the GPU path
 * fails later — mid-load or mid-run — the fallback also goes through here,
 * so the UI's line always matches what actually executed.
 */

import type { Backend } from "./types";

export interface BackendDecision {
  backend: Backend;
  /** The honest one-liner for the CPU fallbacks; absent on WebGPU. */
  note?: string;
}

/** Shown when the browser has no WebGPU at all. */
export const CPU_NOTE_NO_WEBGPU =
  "this browser has no GPU support, so the cut runs on your CPU (WebAssembly) — it works, just slower.";

/** Shown when WebGPU exists but no adapter answers (old drivers, blocklists). */
export const CPU_NOTE_NO_ADAPTER =
  "WebGPU is here but no GPU answered, so the cut runs on your CPU (WebAssembly) — it works, just slower.";

/** Shown when the GPU path was chosen but the model refused to start on it. */
export const CPU_NOTE_GPU_REFUSED =
  "your GPU couldn't run this model, so it ran on your CPU (WebAssembly) instead.";

export function decideBackend(hasWebGPU: boolean, adapterOk: boolean): BackendDecision {
  if (hasWebGPU && adapterOk) return { backend: "webgpu" };
  if (hasWebGPU) return { backend: "wasm", note: CPU_NOTE_NO_ADAPTER };
  return { backend: "wasm", note: CPU_NOTE_NO_WEBGPU };
}
