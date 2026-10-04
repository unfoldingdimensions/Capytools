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
import { decideBackend, type GpuCapabilities } from "./backend";
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
      options?: {
        executionProviders: readonly (string | { name: string; preferredLayout?: "NCHW" | "NHWC" })[];
        graphOptimizationLevel?: string;
      },
    ): Promise<OrtSessionLike>;
  };
  Tensor: {
    new (type: "float32", data: Float32Array, dims: readonly number[]): OrtTensorLike;
  };
}

// ——— the wire protocol (client.ts mirrors these types) ———
// Every request carries an id and every response echoes it. A worker answers
// messages one at a time, but the main thread may have several asks in
// flight; without the id, the first response resolves the wrong waiter (a
// real bug three rapid drops exposed).

export interface ProbeRequest {
  type: "probe";
  id: number;
}

export interface LoadRequest {
  type: "load";
  id: number;
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
  id: number;
  model: ModelId;
  /** float32 NCHW 1×3×height×width (transferable, neutered on send). */
  input: ArrayBuffer;
  width: number;
  height: number;
}

export interface ReleaseRequest {
  type: "release";
  id: number;
}

export type WorkerRequest = ProbeRequest | LoadRequest | RunRequest | ReleaseRequest;

export type WorkerResponse =
  | { type: "backend"; id: number; backend: Backend; note?: string; gpu?: GpuCapabilities }
  | { type: "ready"; id: number; model: ModelId; backend: Backend }
  | { type: "matte"; id: number; data: Float32Array; width: number; height: number; ms: number }
  | { type: "error"; id: number; message: string; /** Retry the load on the CPU path. */ fallback?: boolean };

interface LoadedSession {
  session: OrtSessionLike;
  ort: OrtModule;
}

const sessions = new Map<ModelId, LoadedSession>();
/** Runs are serialized per session: a second concurrent session.run() on the
 *  same WebGPU session deadlocks the encoder and never answers (observed,
 *  not guessed — two rapid drops hung the worker silently). */
const runQueues = new Map<ModelId, Promise<unknown>>();

function post(response: WorkerResponse, transfer?: Transferable[]): void {
  (self as unknown as { postMessage(message: WorkerResponse, transfer?: Transferable[]): void }).postMessage(
    response,
    transfer,
  );
}

/** Backend probe: the same truth table as decideBackend, evaluated where the
 *  inference will actually run. */
interface AdapterLike {
  limits: { maxStorageBuffersPerShaderStage: number };
  info?: { isFallbackAdapter?: boolean };
  isFallbackAdapter?: boolean;
}

async function probe(id: number): Promise<WorkerResponse> {
  const hasWebGPU = "gpu" in navigator;
  let adapter: AdapterLike | null = null;
  if (hasWebGPU) {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<AdapterLike | null> } }).gpu;
      adapter = gpu ? await gpu.requestAdapter() : null;
    } catch {
      adapter = null;
    }
  }
  const decision = decideBackend(hasWebGPU, Boolean(adapter));
  // The limits travel with the decision: a model gate (modelFits) needs them
  // to refuse BEFORE a download, not after a run that never settles.
  const gpu: GpuCapabilities | undefined = adapter
    ? {
        maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage,
        isFallbackAdapter: Boolean(adapter.info?.isFallbackAdapter ?? adapter.isFallbackAdapter),
      }
    : undefined;
  return { type: "backend", id, ...decision, ...(gpu ? { gpu } : {}) };
}

async function load(request: LoadRequest): Promise<void> {
  // Two literal dynamic imports, not a conditional specifier: the bundler
  // must see both chunks statically (Turbopack refuses ternary specifiers).
  // Each backend bundle carries its own `env`, so the runtime settings below
  // always land on the module that is about to create the session.
  const ortModule =
    request.backend === "webgpu"
      ? ((await import("onnxruntime-web/webgpu")) as unknown as OrtModule)
      : ((await import("onnxruntime-web/wasm")) as unknown as OrtModule);

  // Single-threaded on purpose: multi-threading needs SharedArrayBuffer,
  // which needs COOP+COEP, which this site deliberately does not set.
  ortModule.env.wasm.numThreads = 1;
  ortModule.env.wasm.wasmBinary = request.ortBinary;
  ortModule.env.wasm.wasmPaths = `/capybg/ort/${request.ortVersion}/`;

  try {
    const session = await ortModule.InferenceSession.create(request.modelBytes, {
      // NCHW on WebGPU: the EP's default NHWC layout transform corrupts
      // MODNet's matte (measured 2026-10-04: torso alpha 0.8 instead of 1.0,
      // backdrop kept), while NCHW matches the CPU EP and Python exactly.
      executionProviders: [request.backend === "webgpu" ? { name: "webgpu", preferredLayout: "NCHW" } : request.backend],
      graphOptimizationLevel: "all",
    });
    // Release the session this replaces — duplicate loads used to leak one.
    const previous = sessions.get(request.model);
    if (previous) void previous.session.release();
    sessions.set(request.model, { session, ort: ortModule });
    post({ type: "ready", id: request.id, model: request.model, backend: request.backend });
  } catch (error) {
    // Only a GPU failure is worth a CPU retry; a CPU failure is final.
    post({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
      fallback: request.backend === "webgpu",
    });
  }
}

async function run(request: RunRequest): Promise<void> {
  const loaded = sessions.get(request.model);
  const spec = MODELS[request.model];
  if (!loaded) {
    post({ type: "error", id: request.id, message: "the model is not loaded yet" });
    return;
  }
  const previous = runQueues.get(request.model) ?? Promise.resolve();
  const task = previous.then(() => doRun(request, loaded, spec));
  runQueues.set(request.model, task.catch(() => undefined));
  await task;
}

async function doRun(
  request: RunRequest,
  loaded: LoadedSession,
  spec: (typeof MODELS)[ModelId],
): Promise<void> {
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
    post({ type: "matte", id: request.id, data, width, height, ms: performance.now() - started }, [data.buffer]);
  } catch (error) {
    // A run-time GPU error (op coverage, device limits) is retryable on CPU.
    post({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
      fallback: true,
    });
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "probe") {
    probe(request.id).then(post, (error: unknown) =>
      post({ type: "error", id: request.id, message: error instanceof Error ? error.message : String(error) }),
    );
  } else if (request.type === "load") {
    load(request).catch((error: unknown) =>
      post({ type: "error", id: request.id, message: error instanceof Error ? error.message : String(error) }),
    );
  } else if (request.type === "run") {
    run(request).catch((error: unknown) =>
      post({ type: "error", id: request.id, message: error instanceof Error ? error.message : String(error) }),
    );
  } else {
    for (const { session } of sessions.values()) void session.release();
    sessions.clear();
  }
};
