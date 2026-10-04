/**
 * The one CapyBg model registry.
 *
 * Everything that pins a model to a byte lives here: the Hugging Face repo,
 * revision and file, its SHA-256 and exact size, its I/O names and its
 * preprocessing contract. `scripts/fetch-capybg-assets.ts` imports these
 * constants at build time to download, verify and shard the binaries; the
 * browser loader (loader.ts) and the worker (worker.ts) read them at runtime.
 * One registry, so a pin can never drift between the build that fetched the
 * bytes and the page that fetches them again.
 *
 * Licences are make-or-break (plan §3.1): both models here are
 * commercially permissive upstream. RMBG-1.4/2.0, @imgly/background-removal
 * and the ISNet-ONNX repack are banned and must never join this table —
 * tests/capybg.test.ts guards the licence field against exactly that.
 *
 * BiRefNet_lite is the opt-in "any subject" model, offered on the WebGPU
 * backend only (plan §3.4). R2 (§11.1 of docs/plans/capybg.md) found it does
 * not currently run on Chrome/Windows; whether the opt-in tier ships is with
 * the owner — the registry keeps the verified pin until that decision.
 */

import type { Backend, ModelId } from "./types";

/**
 * The model's input contract.
 * - `shortest-edge`: scale so the SHORT side is `edge`, round both sides up to
 *   a multiple of `multiple`, aspect kept (MODNet).
 * - `fixed`: stretch to a square `size` and restore the aspect on the way
 *   back (BiRefNet).
 */
export type InputRule =
  | { kind: "shortest-edge"; edge: number; multiple: number }
  | { kind: "fixed"; size: number };

export interface ModelSpec {
  id: ModelId;
  /** The choice pill's label. Sizes are rendered from `bytes`, not re-typed. */
  label: string;
  /** Upstream licence — must stay permissive (guarded by tests). */
  licence: string;
  /** Hugging Face repo + pinned revision + file path within the repo. */
  repo: string;
  revision: string;
  path: string;
  /** A non-Hugging Face source (a GitHub release asset). `revision` then pins
   *  the commit the release tag points at; the SHA-256 pins the bytes. */
  url?: string;
  /** The pinned file's SHA-256 (a Hugging Face LFS X-Linked-ETag). */
  sha256: string;
  /** The pinned file's exact byte length; the build fails on mismatch. */
  bytes: number;
  /** The ONNX graph's input/output tensor names. */
  inputName: string;
  outputName: string;
  input: InputRule;
  /** Per-channel mean/std applied after ×1/255, in RGB order. */
  mean: [number, number, number];
  std: [number, number, number];
  /** BiRefNet emits logits (apply sigmoid); MODNet emits a matte in [0, 1]. */
  sigmoid: boolean;
  /** Backends this model may run on. BiRefNet is WebGPU-only (plan §3.4). */
  backends: readonly Backend[];
  /**
   * The smallest `maxStorageBuffersPerShaderStage` a WebGPU adapter must report
   * for this model to run. Measured, not guessed: BiRefNet_lite's graph needs a
   * shader with 17 storage buffers, and Chrome on Windows/D3D reports 16 — the
   * run then never settles (review, 2026-10-04). Checked BEFORE the download,
   * so nobody pulls 109 MB for a model their GPU cannot run.
   */
  minStorageBuffersPerShaderStage?: number;
}

export const MODELS: Readonly<Record<ModelId, ModelSpec>> = {
  modnet: {
    id: "modnet",
    label: "People — fast",
    licence: "Apache-2.0",
    repo: "Xenova/modnet",
    revision: "fa2fa546052fba4c08921230a26cc69a333fca12",
    // fp16, not the int8 `model_quantized.onnx` v1 shipped: on real photos the
    // int8 matte kept whole slabs of dark backdrop and dropped people in dark
    // clothes, while fp16 tracks fp32 (measured 2026-10-04, same pipeline).
    // Input stays float32 — the fp16 is weights-only.
    path: "onnx/model_fp16.onnx",
    sha256: "25f165da9bfd30830a575f1f0490f1acd995975cb349bc02f3d79332e1fe5cf6",
    bytes: 12984781,
    inputName: "input",
    outputName: "output",
    input: { kind: "shortest-edge", edge: 512, multiple: 32 },
    mean: [0.5, 0.5, 0.5],
    std: [0.5, 0.5, 0.5],
    sigmoid: false,
    backends: ["webgpu", "wasm"],
  },
  birefnet: {
    id: "birefnet",
    label: "Any subject — detailed",
    licence: "MIT",
    repo: "onnx-community/BiRefNet_lite-ONNX",
    revision: "de15b22ba131738a16dff04aab8bdf8dc32e3ac1",
    path: "onnx/model_fp16.onnx",
    sha256: "d39b897ceb16ae654c1731f3dba0cf9b368d9cae74b5a57459b455cc8bfec402",
    bytes: 114538221,
    inputName: "input_image",
    outputName: "output_image",
    input: { kind: "fixed", size: 1024 },
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    sigmoid: true,
    backends: ["webgpu"],
    minStorageBuffersPerShaderStage: 17,
  },
  // Group mode's helper (owner decision, 2026-10-04). MODNet is a single-
  // portrait model: on a group of four it lost a woman in a black saree against
  // a black backdrop, and no resolution fixed it. U²-Net human seg kept all four
  // (and the couple), but at 320² its edges are soft — so it decides WHO is in
  // the photo and MODNet still draws the edges (fuseMattes). Full fp32 from
  // rembg's release: the 4.4 MB "U-2-Net-Human-Seg" repack lost both women.
  // Runs on a 16-storage-buffer adapter (136 ms warm) and on the CPU (~4.7 s).
  u2human: {
    id: "u2human",
    label: "Group helper",
    // The U²-Net weights are Apache-2.0 (xuebinqin/U-2-Net); rembg, which
    // publishes this ONNX export, is MIT.
    licence: "Apache-2.0",
    repo: "danielgatis/rembg",
    revision: "7fb6683169d588f653281d53c3c258838194c950",
    path: "u2net_human_seg.onnx",
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx",
    sha256: "01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c",
    bytes: 175997641,
    inputName: "input.1",
    outputName: "1959",
    input: { kind: "fixed", size: 320 },
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    sigmoid: false,
    backends: ["webgpu", "wasm"],
  },
  // The detailed model for GPUs BiRefNet doesn't fit (owner decision,
  // 2026-10-04). Chrome on Windows/D3D reports 16 storage buffers and BiRefNet
  // needs 17; on the CPU it hits std::bad_alloc. ISNet general-use (DIS,
  // Apache-2.0; rembg's release export, NOT the AGPL-labelled onnx-community
  // repack banned above) runs there in ~0.36 s warm. On the owner's mother's
  // hanging pallu it scored 0.99 / 0.89 where MODNet scored 0.90 / 0.82
  // (BiRefNet 1.0 / 0.97). Output is already a [0, 1] mask.
  isnet: {
    id: "isnet",
    label: "Any subject — detailed",
    licence: "Apache-2.0",
    repo: "danielgatis/rembg",
    revision: "7fb6683169d588f653281d53c3c258838194c950",
    path: "isnet-general-use.onnx",
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx",
    sha256: "60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a",
    bytes: 178648008,
    inputName: "input_image",
    outputName: "output_image",
    input: { kind: "fixed", size: 1024 },
    mean: [0.5, 0.5, 0.5],
    std: [1, 1, 1],
    sigmoid: false,
    backends: ["webgpu"],
  },
  // Edge refinement for the detailed cut (owner, 2026-10-05: "zoom in on the
  // edges of clothes ... hazy, or some background coming in"). Not a choice on
  // its own: a trimap matting model (MIT, hustvl/ViTMatte) that recomputes
  // alpha in the unsure band from the full-resolution photo. Trained on 512²
  // crops and matting is local, so it runs on 512² tiles over a ≤ 2048 px
  // working image (one 2048 pass needs a 2.77 GB buffer, over WebGPU's 2 GB);
  // 55 ms per tile warm on a 16-buffer AMD adapter. Removed a pink banner
  // smudge at an ear and a light rim on a suit; 512 tiles match a full 2048
  // pass to 0.02–0.03 mean alpha. Input: RGB (mean/std 0.5) + trimap channel.
  vitmatte: {
    id: "vitmatte",
    label: "Edge refiner",
    licence: "MIT",
    repo: "Xenova/vitmatte-small-composition-1k",
    revision: "6bc1297f6140f055a227b6d2cfe8c093281f35d2",
    path: "onnx/model.onnx",
    sha256: "bf28d2e0be2c073286e88d60ad649d7123da2749a2d99133fd1098d5887e0225",
    bytes: 103885865,
    inputName: "pixel_values",
    outputName: "alphas",
    input: { kind: "fixed", size: 512 },
    mean: [0.5, 0.5, 0.5],
    std: [0.5, 0.5, 0.5],
    sigmoid: false,
    backends: ["webgpu"],
  },
};

export const MODEL_IDS: readonly ModelId[] = ["modnet", "birefnet", "u2human", "isnet", "vitmatte"];

/** `https://huggingface.co/<repo>/resolve/<revision>/<path>` — the pin form —
 *  unless the model names its own source. */
export function modelUrl(model: Pick<ModelSpec, "repo" | "revision" | "path" | "url">): string {
  return model.url ?? `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.path}`;
}

/** `92e49898…` → `92e49898` — the content-addressed directory under /capybg/. */
export function sha8(sha256: string): string {
  return sha256.slice(0, 8);
}
