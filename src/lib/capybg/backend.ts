/**
 * Which backend runs the model â€” decided once, stated honestly, never
 * guessed twice. Pure, so the truth table is table-tested from node.
 *
 * The worker probes `navigator.gpu` and an adapter itself (workers can do
 * both); whatever it decides, the page repeats verbatim. When the GPU path
 * fails later â€” mid-load or mid-run â€” the fallback also goes through here,
 * so the UI's line always matches what actually executed.
 */

import type { ModelSpec } from "./models";
import type { Backend, ModelId } from "./types";

/** What the worker's adapter reports â€” only the fields a model gate reads. */
export interface GpuCapabilities {
  maxStorageBuffersPerShaderStage: number;
  isFallbackAdapter: boolean;
}

export interface BackendDecision {
  backend: Backend;
  /** The honest one-liner for the CPU fallbacks; absent on WebGPU. */
  note?: string;
  /** The adapter's limits, when a WebGPU adapter answered. */
  gpu?: GpuCapabilities;
}

/** Shown when the browser has no WebGPU at all. */
export const CPU_NOTE_NO_WEBGPU =
  "This browser has no GPU support, so the cut runs on your CPU (WebAssembly) â€” it works, just slower.";

/** Shown when WebGPU exists but no adapter answers (old drivers, blocklists). */
export const CPU_NOTE_NO_ADAPTER =
  "WebGPU is here but no GPU answered, so the cut runs on your CPU (WebAssembly) â€” it works, just slower.";

/** Shown when the GPU path was chosen but the model refused to start on it. */
export const CPU_NOTE_GPU_REFUSED =
  "Your GPU couldn't run this model, so it ran on your CPU (WebAssembly) instead.";

/** Shown when the DETAILED model's GPU path fails: it has no CPU path (the
 *  1024Â² fp16 graph OOMs the wasm heap â€” R2, docs/plans/capybg.md Â§11.1), so
 *  the option hides itself and the cut re-runs on the people model. The
 *  owner chose this try/hide policy; the note is what keeps it honest. */
export const DETAILED_REFUSED_NOTE =
  "Your GPU couldn't run the detailed model, so this cut used the people model instead. The detailed option is hidden for the rest of this visit.";

/** Shown in place of the detailed pill when the GPU exists but is too small
 *  for it â€” said up front, so the visitor never downloads it to find out. */
export const DETAILED_UNFIT_NOTE =
  "The detailed model needs more from the GPU than this browser offers, so only the people model is offered here.";

/**
 * Can this model run on this tab's backend? Pure; table-tested.
 * A model with no GPU requirement fits whenever its backend list allows the
 * decided backend. A model with one needs a real (non-fallback) adapter that
 * reports at least the measured storage-buffer count.
 */
export function modelFits(
  spec: Pick<ModelSpec, "backends" | "minStorageBuffersPerShaderStage">,
  decision: Pick<BackendDecision, "backend" | "gpu">,
): boolean {
  if (!spec.backends.includes(decision.backend)) return false;
  const need = spec.minStorageBuffersPerShaderStage;
  if (need === undefined || decision.backend !== "webgpu") return true;
  const gpu = decision.gpu;
  return Boolean(gpu && !gpu.isFallbackAdapter && gpu.maxStorageBuffersPerShaderStage >= need);
}

export function decideBackend(hasWebGPU: boolean, adapterOk: boolean): BackendDecision {
  if (hasWebGPU && adapterOk) return { backend: "webgpu" };
  if (hasWebGPU) return { backend: "wasm", note: CPU_NOTE_NO_ADAPTER };
  return { backend: "wasm", note: CPU_NOTE_NO_WEBGPU };
}

/** The policy when a model's GPU run fails, decided once and table-tested:
 *  - the people model falls back to the CPU;
 *  - the detailed model falls back to the PEOPLE model on the same GPU
 *    (never to the wasm heap it would OOM), and the UI hides the option.
 *  "people" means: throw the typed `DetailedModelUnavailableError` and let
 *  the page re-cut with modnet â€” the tensor differs per model, so the
 *  re-run is a fresh pipeline, not an inner retry. */
export function gpuFailureFallback(model: ModelId): "cpu" | "people" {
  return model === "birefnet" || model === "isnet" || model === "vitmatte" ? "people" : "cpu";
}
