import { canvasIsUsable } from "@/lib/capystrip/clean";

import { CPU_NOTE_GPU_REFUSED, type BackendDecision } from "./backend";
import { bgFilename, clampQuality, decideCompose, encodeCut } from "./compose";
import { loadManifest, loadModel, loadOrtBinary } from "./loader";
import { MODELS } from "./models";
import { applyMatte, featherMatte, matteFromModelOutput, resizeMatte } from "./postprocess";
import { modelInputSize, toModelTensor } from "./preprocess";
import type { Backend, BgOptions, BgResult, ModelId, Progress } from "./types";
import type { WorkerRequest, WorkerResponse } from "./worker";

/**
 * The main-thread half of the engine: decode → preprocess → (worker)
 * inference → matte → compose → encode. Pure per file, zero UI coupling —
 * batch later is a loop over `removeBackground` (plan §5.1).
 *
 * The visitor's photo never leaves this module's canvases: the worker gets
 * the preprocessed float32 tensor and nothing else, and nothing here ever
 * fetches beyond /capybg/ (loader.ts's only diet; boundary-tested).
 *
 * Memory hygiene (plan §5.7): one image at a time, object URLs revoked in
 * finally, decoded bitmaps closed, and exactly one matte kept for recompose
 * — changing the backdrop or format must not re-run the model, so the
 * processed model-sized matte (a few MB at most) waits in `lastCut`.
 */

// ——— errors with plain words and a way forward ———

export class UnsupportedImageError extends Error {
  constructor() {
    super("this browser can't open that file — if it's a HEIC, export it as JPEG first and try again");
    this.name = "UnsupportedImageError";
  }
}

export class CutFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CutFailedError";
  }
}

// ——— the worker, one per tab, one message in flight at a time ———

interface EngineState {
  worker: Worker;
  tail: Promise<unknown>;
  probe?: Promise<BackendDecision>;
  /** Which backend each model actually loaded on (after any fallback). */
  loaded: Partial<Record<ModelId, Backend>>;
  /** In-flight load per model — three rapid drops must not triple-load. */
  loading: Partial<Record<ModelId, Promise<Backend>>>;
}

let engine: EngineState | null = null;

function getEngine(): EngineState {
  if (engine) return engine;
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  engine = { worker, tail: Promise.resolve(), loaded: {}, loading: {} };
  return engine;
}

class EngineError extends Error {
  readonly fallback: boolean;
  constructor(message: string, fallback: boolean) {
    super(message);
    this.name = "EngineError";
    this.fallback = fallback;
  }
}

let nextMessageId = 1;

/** Omit across the union — plain Omit collapses it to the shared members. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

function send(request: WithoutId<WorkerRequest>, transfer?: Transferable[]): Promise<WorkerResponse> {
  const { worker } = getEngine();
  const id = nextMessageId++;
  // Responses echo the request id: a worker answers one message at a time,
  // but several asks can be in flight, and without the id the first answer
  // used to resolve every waiter (three rapid drops found this).
  const exchange = new Promise<WorkerResponse>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (!response || response.id !== id) return;
      cleanup();
      if (response.type === "error") reject(new EngineError(response.message, response.fallback ?? false));
      else resolve(response);
    };
    const onError = () => {
      cleanup();
      reject(new EngineError("the inference worker crashed", false));
    };
    function cleanup() {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    }
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
  });
  // True single flight: the message is posted only when the previous exchange
  // has settled, so the worker never holds two runs of one session at once —
  // that is the deadlock, not just a politeness rule.
  const { tail } = getEngine();
  const delivery = tail.then(() => {
    worker.postMessage({ ...request, id } as WorkerRequest, transfer ?? []);
    return exchange;
  });
  getEngine().tail = delivery.catch(() => undefined);
  return delivery;
}

/** Ask the worker where this tab's inference would run. Safe to call early —
 *  it loads no model and fetches nothing. */
export function probeBackend(): Promise<BackendDecision> {
  const eng = getEngine();
  eng.probe ??= send({ type: "probe" }).then((response) => {
    if (response.type !== "backend") throw new CutFailedError("unexpected worker reply");
    return { backend: response.backend, note: response.note };
  });
  return eng.probe;
}

/** The ORT binary each backend needs, by manifest key. */
function ortBinaryFor(backend: Backend): string {
  return backend === "webgpu" ? "ort-wasm-simd-threaded.asyncify.wasm" : "ort-wasm-simd-threaded.wasm";
}

async function loadOnBackend(
  model: ModelId,
  backend: Backend,
  onProgress?: (progress: Progress) => void,
): Promise<void> {
  const eng = getEngine();
  const spec = MODELS[model];
  const manifest = await loadManifest();
  const label = spec.label.toLowerCase();

  const modelBytes = await loadModel(model, ({ received, total }) =>
    onProgress?.({ phase: "download", received, total, message: `downloading the ${label} model` }),
  );
  const ortBinary = await loadOrtBinary(ortBinaryFor(backend), ({ received, total }) =>
    onProgress?.({ phase: "download", received, total, message: "downloading the runtime" }),
  );

  onProgress?.({ phase: "load", message: "warming up the model" });
  const response = await send(
    { type: "load", model, backend, modelBytes: modelBytes.buffer as ArrayBuffer, ortBinary: ortBinary.buffer as ArrayBuffer, ortVersion: manifest.ort.version },
    [modelBytes.buffer as ArrayBuffer, ortBinary.buffer as ArrayBuffer],
  );
  if (response.type !== "ready") throw new CutFailedError("the model could not start");
  eng.loaded[model] = backend;
}

/** Load a model, falling back to the CPU path when the GPU refuses it.
 *  Memoized per model: three rapid drops must not triple-create sessions. */
function ensureModel(
  model: ModelId,
  onProgress?: (progress: Progress) => void,
  notes?: string[],
): Promise<Backend> {
  const eng = getEngine();
  const existing = eng.loading[model];
  if (existing) return existing;
  const task = (async () => {
    const decision = await probeBackend();
    const spec = MODELS[model];
    const requested = spec.backends.includes(decision.backend) ? decision.backend : "wasm";
    if (decision.note && notes) notes.push(decision.note);

    if (eng.loaded[model] === requested) return requested;
    try {
      await loadOnBackend(model, requested, onProgress);
      return requested;
    } catch (error) {
      if (requested !== "webgpu" || !(error instanceof EngineError) || !error.fallback) throw error;
      if (notes) notes.push(CPU_NOTE_GPU_REFUSED);
      await loadOnBackend(model, "wasm", onProgress);
      return "wasm";
    }
  })();
  eng.loading[model] = task;
  // A failed load must not poison the memo — the next cut tries again.
  task.catch(() => undefined).then(() => {
    if (eng.loading[model] === task) delete eng.loading[model];
  });
  return task;
}

// ——— decode and the source canvas ———

const DECODE_TIMEOUT_MS = 15_000;

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      if (bitmap.width >= 1 && bitmap.height >= 1) {
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
      }
      bitmap.close();
    } catch {
      /* HEIC and friends land here — try the <img> road before giving up */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      const loaded = new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("decode failed"));
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const ceiling = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error("decode timed out")), DECODE_TIMEOUT_MS);
      });
      Promise.race([img.decode(), loaded, ceiling]).then(
        () => resolve(),
        (error: unknown) => reject(error),
      ).finally(() => clearTimeout(timer));
    });
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (width < 1 || height < 1) throw new Error("empty");
    return { source: img, width, height, close: () => URL.revokeObjectURL(url) };
  } catch {
    throw new UnsupportedImageError();
  }
}

function guardBrowser(): void {
  if (typeof document === "undefined") throw new CutFailedError("capybg runs in a browser tab only");
}

/** Draw the source at w×h, probing the canvas instead of guessing a cap; an
 *  unusable full-size canvas halves until it works, with a note. */
function drawSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; notes: string[] } {
  const notes: string[] = [];
  let w = width;
  let h = height;
  let ctx: CanvasRenderingContext2D | null = null;
  let canvas: HTMLCanvasElement | null = null;
  for (;;) {
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new CutFailedError("this browser wouldn't give the tool a canvas to work on");
    if (canvasIsUsable(ctx, w, h)) break;
    if (w === 1 || h === 1) throw new CutFailedError("this browser can't cut a photo this size");
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
  }
  if (w !== width || h !== height) {
    notes.push(`this photo is bigger than the browser can hold at full size, so the cut came out at ${w}×${h}`);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return { canvas, ctx, notes };
}

// ——— the single matte slot: backdrop/format changes never re-run the model ———

interface CutState {
  file: Blob;
  /** The processed matte at MODEL size — a few MB at most. */
  matte: Float32Array;
  matteWidth: number;
  matteHeight: number;
  srcWidth: number;
  srcHeight: number;
  backend: Backend;
  modelMs: number;
  baseNotes: string[];
}

let lastCut: CutState | null = null;

/** Forget the cached matte (the previous image's business is done). */
export function clearCut(): void {
  lastCut = null;
}

async function composeFrom(
  state: Pick<CutState, "file" | "matte" | "matteWidth" | "matteHeight" | "srcWidth" | "srcHeight" | "backend" | "modelMs" | "baseNotes">,
  opts: BgOptions,
  bytesBefore: number,
): Promise<BgResult> {
  const decoded = await decode(state.file);
  try {
    const { canvas, ctx } = drawSource(decoded.source, state.srcWidth, state.srcHeight);
    const matte = featherMatte(
      resizeMatte(state.matte, state.matteWidth, state.matteHeight, canvas.width, canvas.height),
      canvas.width,
      canvas.height,
      Math.min(3, Math.max(0, opts.feather ?? 1)),
    );
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyMatte(image.data, matte);
    ctx.putImageData(image, 0, 0);

    const decision = decideCompose(opts.backdrop, opts.format);
    const blob = await encodeCut(canvas, decision, clampQuality(opts.quality));
    return {
      blob,
      mimeType: blob.type,
      width: canvas.width,
      height: canvas.height,
      bytesBefore,
      bytesAfter: blob.size,
      backend: state.backend,
      modelMs: state.modelMs,
      notes: [...state.baseNotes, ...(decision.note ? [decision.note] : [])],
    };
  } finally {
    decoded.close();
  }
}

// ——— the seam ———

export async function removeBackground(
  file: Blob,
  opts: BgOptions,
  onProgress?: (progress: Progress) => void,
): Promise<BgResult> {
  guardBrowser();
  const spec = MODELS[opts.model];
  const notes: string[] = [];

  const decoded = await decode(file);
  try {
    const { canvas, notes: sizeNotes } = drawSource(decoded.source, decoded.width, decoded.height);
    notes.push(...sizeNotes);

    const size = modelInputSize(spec, canvas.width, canvas.height);
    const modelCanvas = document.createElement("canvas");
    modelCanvas.width = size.width;
    modelCanvas.height = size.height;
    const modelCtx = modelCanvas.getContext("2d", { willReadFrequently: true });
    if (!modelCtx) throw new CutFailedError("this browser wouldn't give the tool a canvas to work on");
    modelCtx.imageSmoothingEnabled = true;
    modelCtx.imageSmoothingQuality = "high";
    modelCtx.drawImage(canvas, 0, 0, size.width, size.height);
    const tensor = toModelTensor(modelCtx.getImageData(0, 0, size.width, size.height).data, spec);

    const backend = await ensureModel(opts.model, onProgress, notes);
    onProgress?.({ phase: "cut", message: `cutting${backend === "webgpu" ? " on your GPU" : " on your CPU"}` });

    let backendUsed = backend;
    let matte: Float32Array;
    let modelMs: number;
    for (;;) {
      // A fresh copy every attempt: the previous attempt transferred (and
      // detached) its buffer on the way to the worker.
      const input = tensor.slice();
      try {
        const response = await send(
          { type: "run", model: opts.model, input: input.buffer as ArrayBuffer, width: size.width, height: size.height },
          [input.buffer as ArrayBuffer],
        );
        if (response.type !== "matte") throw new CutFailedError("unexpected worker reply");
        matte = response.data;
        modelMs = response.ms;
        break;
      } catch (error) {
        // A GPU run that dies mid-flight gets exactly one CPU retry, said out loud.
        if (!(error instanceof EngineError) || !error.fallback || backendUsed !== "webgpu") throw error;
        notes.push(CPU_NOTE_GPU_REFUSED);
        backendUsed = "wasm";
        await loadOnBackend(opts.model, "wasm", onProgress);
      }
    }

    const processed = matteFromModelOutput(matte, spec.sigmoid);
    lastCut = {
      file,
      matte: processed,
      matteWidth: size.width,
      matteHeight: size.height,
      srcWidth: canvas.width,
      srcHeight: canvas.height,
      backend: backendUsed,
      modelMs,
      baseNotes: notes,
    };
    return composeFrom(lastCut, opts, file.size);
  } finally {
    decoded.close();
  }
}

/** Recompose the latest cut with new backdrop/format/feather — the model
 *  does not run again. Throws when there is no latest cut. */
export async function recomposeCut(opts: BgOptions): Promise<BgResult> {
  guardBrowser();
  if (!lastCut) throw new CutFailedError("nothing has been cut yet");
  return composeFrom(lastCut, opts, lastCut.file.size);
}

/** The download name for a result (plan §5.6). */
export function nameFor(name: string, opts: Pick<BgOptions, "format">): string {
  return bgFilename(name, opts.format);
}
