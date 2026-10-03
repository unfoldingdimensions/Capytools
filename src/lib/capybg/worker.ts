/**
 * CapyBg's inference worker. A module worker, so `import()` inside it gets
 * code-split by the bundler and a multi-second CPU run never freezes the
 * page. onnxruntime-web is reached ONLY through the dynamic imports below —
 * tests/capybg-boundaries.test.ts fails if any other file so much as
 * mentions the package, and if this file imports it statically.
 *
 * The main thread never sends the photo — only the preprocessed float32
 * tensor — and the worker never fetches anything; the model bytes and the
 * ORT wasm binary arrive in the `load` message, already downloaded and
 * hash-verified by loader.ts.
 */

import { MODELS } from "./models";
import { decideBackend } from "./backend";
import type { Backend, ModelId } from "./types";

// ——— the sliver of onnxruntime-web's shape this worker uses ———
// Structural on purpose: importing the package's types would make this file
// look static-importing to the boundary test for no benefit.

interface OrtTensorLike {
  data: Float32Array;
  dims: readonly number[];
}

interface OrtSessionLike {
  run(feeds: Record<string, OrtTensorLike>): Promise<Record<string, OrtTensorLike>>;
  release(): Promise<void> | void;
}

interface OrtModule {
  env: { wasm: { wasmBinary?: ArrayBuffer; numThreads?: number; wasmPaths?: string } };
  InferenceSession: {
    create(
      source: ArrayBuffer | Uint8Array,
      options?: { executionProviders: readonly string[]; graphOptimizationLevel?: string },
    ): Promise<OrtSessionLike>;
  };
  Tensor: {
    new (type: "float32", data: Float32Array, dims: readonly number[]): OrtTensorLike;
  };
}

// ——— the wire protocol (client.ts mirrors these types) ———

export interface ProbeRequest {
  type: "probe";
}

export interface LoadRequest {
  type: "load";
  model: ModelId;
  backend: Backend;
  /** Verified model bytes (transferable). */
  modelBytes: ArrayBuffer;
  /** Verified ORT wasm binary for THIS backend (transferable). */
  ortBinary: ArrayBuffer;
  /** The installed onnxruntime-web version — wasmPaths stays same-origin. */
  ortVersion: string;
}

export interface RunRequest {
  type: "run";
  model: ModelId;
  /** float32 NCHW 1×3×height×width (transferable, neutered on send). */
  input: ArrayBuffer;
  width: number;
  height: number;
}

export interface ReleaseRequest {
  type: "release";
}

export type WorkerRequest = ProbeRequest | LoadRequest | RunRequest | ReleaseRequest;

export type WorkerResponse =
  | { type: "backend"; backend: Backend; note?: string }
  | { type: "ready"; model: ModelId; backend: Backend }
  | { type: "matte"; data: Float32Array; width: number; height: number; ms: number }
  | { type: "error"; message: string; /** Retry the load on the CPU path. */ fallback?: boolean };

interface LoadedSession {
  session: OrtSessionLike;
  ort: OrtModule;
}

const sessions = new Map<ModelId, LoadedSession>();

function post(response: WorkerResponse, transfer?: Transferable[]): void {
  (self as unknown as { postMessage(message: WorkerResponse, transfer?: Transferable[]): void }).postMessage(
    response,
    transfer,
  );
}

/** Backend probe: the same truth table as decideBackend, evaluated where the
 *  inference will actually run. */
async function probe(): Promise<WorkerResponse> {
  const hasWebGPU = "gpu" in navigator;
  let adapterOk = false;
  if (hasWebGPU) {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
      adapterOk = Boolean(gpu && (await gpu.requestAdapter()));
    } catch {
      adapterOk = false;
    }
  }
  return { type: "backend", ...decideBackend(hasWebGPU, adapterOk) };
}

async function load(request: LoadRequest): Promise<void> {
  // Two literal dynamic imports, not a conditional specifier: the bundler
  // must see both chunks statically (Turbopack refuses ternary specifiers).
  // Each backend bundle carries its own `env`, so the runtime settings below
  // always land on the module that is about to create the session.
  const module =
    request.backend === "webgpu"
      ? ((await import("onnxruntime-web/webgpu")) as unknown as OrtModule)
      : ((await import("onnxruntime-web/wasm")) as unknown as OrtModule);

  // Single-threaded on purpose: multi-threading needs SharedArrayBuffer,
  // which needs COOP+COEP, which this site deliberately does not set.
  module.env.wasm.numThreads = 1;
  module.env.wasm.wasmBinary = request.ortBinary;
  module.env.wasm.wasmPaths = `/capybg/ort/${request.ortVersion}/`;

  try {
    const session = await module.InferenceSession.create(request.modelBytes, {
      executionProviders: [request.backend],
      graphOptimizationLevel: "all",
    });
    sessions.set(request.model, { session, ort: module });
    post({ type: "ready", model: request.model, backend: request.backend });
  } catch (error) {
    // Only a GPU failure is worth a CPU retry; a CPU failure is final.
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      fallback: request.backend === "webgpu",
    });
  }
}

async function run(request: RunRequest): Promise<void> {
  const loaded = sessions.get(request.model);
  const spec = MODELS[request.model];
  if (!loaded) {
    post({ type: "error", message: "the model is not loaded yet" });
    return;
  }
  const { session, ort } = loaded;
  const started = performance.now();
  try {
    const tensor = new ort.Tensor(
      "float32",
      new Float32Array(request.input),
      [1, 3, request.height, request.width],
    );
    const results = await session.run({ [spec.inputName]: tensor });
    const output = results[spec.outputName];
    const data = new Float32Array(output.data as Float32Array);
    const width = output.dims[output.dims.length - 1];
    const height = output.dims[output.dims.length - 2];
    post({ type: "matte", data, width, height, ms: performance.now() - started }, [data.buffer]);
  } catch (error) {
    // A run-time GPU error (op coverage, device limits) is retryable on CPU.
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      fallback: true,
    });
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "probe") {
    probe().then(post, (error: unknown) =>
      post({ type: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  } else if (request.type === "load") {
    load(request).catch((error: unknown) =>
      post({ type: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  } else if (request.type === "run") {
    run(request).catch((error: unknown) =>
      post({ type: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  } else {
    for (const { session } of sessions.values()) void session.release();
    sessions.clear();
  }
};
