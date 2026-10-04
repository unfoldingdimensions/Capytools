import { canvasIsUsable } from "@/lib/capystrip/clean";

import { CPU_NOTE_GPU_REFUSED, gpuFailureFallback, modelFits, type BackendDecision } from "./backend";
import { bgFilename, clampQuality, decideCompose, encodeCut } from "./compose";
import { loadManifest, loadModel, loadOrtBinary } from "./loader";
import { MODELS } from "./models";
import { applyMatte, attachPeople, cleanMatte, decontaminateEdges, featherMatte, fuseMattes, matteFromModelOutput, resizeMatte } from "./postprocess";
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

/**
 * The detailed model's GPU path failed (device shader limits, op coverage).
 * It has no CPU fallback — the 1024² fp16 graph OOMs the wasm heap (R2,
 * docs/plans/capybg.md §11.1) — so the page hides the option and re-cuts
 * with the people model. The reason is always stated; try/hide is not
 * try/silence.
 */
export class DetailedModelUnavailableError extends Error {
  constructor() {
    super("your GPU couldn't run the detailed model");
    this.name = "DetailedModelUnavailableError";
  }
}

/** The visitor pressed stop. Not an error to explain — a choice to respect. */
export class CutCancelledError extends Error {
  constructor() {
    super("the cut was stopped");
    this.name = "CutCancelledError";
  }
}

// ——— the worker, one per tab, one message in flight at a time ———

/**
 * Watchdogs. A WebGPU run can fail by never settling — a device-limit error
 * that ORT does not surface leaves session.run() pending forever (seen on
 * Chrome/Windows with BiRefNet, review 2026-10-04). Nothing in a worker can
 * cancel a pending GPU run, so a silent exchange terminates the worker and
 * takes the normal GPU-failure path. Generous on purpose: the slowest healthy
 * steps measured were ~20 s to create the detailed session and ~6 s for a
 * first CPU cut.
 */
export const LOAD_TIMEOUT_MS = 90_000;
export const RUN_TIMEOUT_MS = 60_000;

interface EngineState {
  worker: Worker;
  tail: Promise<unknown>;
  probe?: Promise<BackendDecision>;
  /** Which backend each model actually loaded on (after any fallback). */
  loaded: Partial<Record<ModelId, Backend>>;
  /** In-flight load per model — three rapid drops must not triple-load. */
  loading: Partial<Record<ModelId, Promise<Backend>>>;
  /** Every exchange still waiting on this worker — rejected if it is torn down. */
  pending: Set<(error: Error) => void>;
}

let engine: EngineState | null = null;

function getEngine(): EngineState {
  if (engine) return engine;
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  engine = { worker, tail: Promise.resolve(), loaded: {}, loading: {}, pending: new Set() };
  return engine;
}

/** Tear the worker down (a hung GPU run, or the visitor's stop) and fail every
 *  exchange still waiting on it. The next call builds a fresh worker; models
 *  reload from Cache Storage, not the network. */
function resetEngine(reason: Error): void {
  const current = engine;
  if (!current) return;
  engine = null;
  current.worker.terminate();
  for (const reject of current.pending) reject(reason);
  current.pending.clear();
}

/** Stop the cut in flight. Safe to call when nothing is running. */
export function cancelCut(): void {
  resetEngine(new CutCancelledError());
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

function send(
  request: WithoutId<WorkerRequest>,
  transfer?: Transferable[],
  timeoutMs?: number,
): Promise<WorkerResponse> {
  const eng = getEngine();
  const { worker } = eng;
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
    const onTeardown = (error: Error) => {
      cleanup();
      reject(error);
    };
    function cleanup() {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      eng.pending.delete(onTeardown);
    }
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    eng.pending.add(onTeardown);
  });
  // True single flight: the message is posted only when the previous exchange
  // has settled, so the worker never holds two runs of one session at once —
  // that is the deadlock, not just a politeness rule.
  const delivery = eng.tail.then(() => {
    if (engine !== eng) throw new EngineError("the inference worker was restarted", true);
    worker.postMessage({ ...request, id } as WorkerRequest, transfer ?? []);
    if (!timeoutMs) return exchange;
    // The clock starts when the message is actually posted, not when queued.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watchdog = new Promise<never>(() => {
      timer = setTimeout(() => {
        resetEngine(new EngineError("the GPU stopped answering", true));
      }, timeoutMs);
    });
    return Promise.race([exchange, watchdog]).finally(() => clearTimeout(timer));
  });
  eng.tail = delivery.catch(() => undefined);
  return delivery;
}

/** Ask the worker where this tab's inference would run. Safe to call early —
 *  it loads no model and fetches nothing. */
export function probeBackend(): Promise<BackendDecision> {
  const eng = getEngine();
  eng.probe ??= send({ type: "probe" }).then((response) => {
    if (response.type !== "backend") throw new CutFailedError("unexpected worker reply");
    return { backend: response.backend, note: response.note, gpu: response.gpu };
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
    LOAD_TIMEOUT_MS,
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
    // A model this GPU cannot run never downloads: a WebGPU-only model with
    // no usable GPU would OOM the wasm heap (R2), and one whose shaders exceed
    // the adapter's storage-buffer limit hangs (review, 2026-10-04). The page
    // hides the option.
    if (!modelFits(spec, { backend: requested, gpu: decision.gpu })) throw new DetailedModelUnavailableError();

    if (eng.loaded[model] === requested) return requested;
    try {
      await loadOnBackend(model, requested, onProgress);
      return requested;
    } catch (error) {
      if (requested !== "webgpu" || !(error instanceof EngineError) || !error.fallback) throw error;
      if (gpuFailureFallback(model) === "people") throw new DetailedModelUnavailableError();
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
    // Soft edges keep the backdrop's colour (a purple fringe in hair); swap in
    // each edge pixel's estimated foreground colour before the alpha goes on.
    decontaminateEdges(image.data, matte, canvas.width, canvas.height);
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

// ——— one model, one tensor, one run (with the GPU fallback policy) ———

/** The source drawn at the model's input size, as its float32 tensor. */
function modelTensor(source: HTMLCanvasElement, model: ModelId, size: { width: number; height: number }): Float32Array {
  const modelCanvas = document.createElement("canvas");
  modelCanvas.width = size.width;
  modelCanvas.height = size.height;
  const modelCtx = modelCanvas.getContext("2d", { willReadFrequently: true });
  if (!modelCtx) throw new CutFailedError("this browser wouldn't give the tool a canvas to work on");
  modelCtx.imageSmoothingEnabled = true;
  modelCtx.imageSmoothingQuality = "high";
  modelCtx.drawImage(source, 0, 0, size.width, size.height);
  return toModelTensor(modelCtx.getImageData(0, 0, size.width, size.height).data, MODELS[model]);
}

async function runModel(
  model: ModelId,
  tensor: Float32Array,
  size: { width: number; height: number },
  onProgress: ((progress: Progress) => void) | undefined,
  notes: string[],
): Promise<{ matte: Float32Array; ms: number; backend: Backend }> {
  let backend = await ensureModel(model, onProgress, notes);
  onProgress?.({ phase: "cut", message: `cutting${backend === "webgpu" ? " on your GPU" : " on your CPU"}` });
  for (;;) {
    // A fresh copy every attempt: the previous attempt transferred (and
    // detached) its buffer on the way to the worker.
    const input = tensor.slice();
    try {
      const response = await send(
        { type: "run", model, input: input.buffer as ArrayBuffer, width: size.width, height: size.height },
        [input.buffer as ArrayBuffer],
        RUN_TIMEOUT_MS,
      );
      if (response.type !== "matte") throw new CutFailedError("unexpected worker reply");
      return { matte: response.data, ms: response.ms, backend };
    } catch (error) {
      // A GPU run that dies mid-flight gets exactly one fallback, decided
      // by the model: the people models drop to the CPU, the detailed model
      // hands the whole cut back to the page (it re-runs on the people
      // model and hides the option — never the wasm heap it would OOM).
      if (!(error instanceof EngineError) || !error.fallback || backend !== "webgpu") throw error;
      if (gpuFailureFallback(model) === "people") throw new DetailedModelUnavailableError();
      notes.push(CPU_NOTE_GPU_REFUSED);
      backend = "wasm";
      await loadOnBackend(model, "wasm", onProgress);
    }
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
    const tensor = modelTensor(canvas, opts.model, size);
    const cut = await runModel(opts.model, tensor, size, onProgress, notes);
    const backendUsed = cut.backend;
    let modelMs = cut.ms;
    let matte = matteFromModelOutput(cut.matte, spec.sigmoid);

    if (opts.group && opts.model === "modnet") {
      // Group mode: the helper decides who is in the photo; MODNet keeps the edges.
      const helperSpec = MODELS.u2human;
      const helperSize = modelInputSize(helperSpec, canvas.width, canvas.height);
      const helper = await runModel("u2human", modelTensor(canvas, "u2human", helperSize), helperSize, onProgress, notes);
      const helperMatte = resizeMatte(
        matteFromModelOutput(helper.matte, helperSpec.sigmoid),
        helperSize.width,
        helperSize.height,
        size.width,
        size.height,
      );
      matte = fuseMattes(matte, helperMatte, size.width, size.height);
      modelMs += helper.ms;
    }

    if (opts.model === "isnet") {
      // ISNet drops some people parts MODNet keeps (dark trousers): add back
      // MODNet's pieces attached to ISNet's subject, in ISNet's 1024² space.
      const peopleSize = modelInputSize(MODELS.modnet, canvas.width, canvas.height);
      const people = await runModel("modnet", modelTensor(canvas, "modnet", peopleSize), peopleSize, onProgress, notes);
      const peopleMatte = resizeMatte(
        matteFromModelOutput(people.matte, MODELS.modnet.sigmoid),
        peopleSize.width,
        peopleSize.height,
        size.width,
        size.height,
      );
      matte = attachPeople(matte, peopleMatte, size.width, size.height);
      modelMs += people.ms;
    }

    // Clear the model's unsure haze and drop stray specks (remove.bg parity).
    matte = cleanMatte(matte, size.width, size.height);

    lastCut = {
      file,
      matte,
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
