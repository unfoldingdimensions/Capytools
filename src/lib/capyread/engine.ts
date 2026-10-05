/**
 * The tesseract session, in one place.
 *
 * Everything the engine needs to stay house-trained lives here:
 *
 * - SAME-ORIGIN ONLY — `workerPath`, `corePath` and `langPath` all point at
 *   `/ocr/…`, files the asset script put on our own origin. tesseract's
 *   defaults pull the worker, the wasm core and the language data from a
 *   public CDN; any one of them would turn "nothing leaves this tab" into a
 *   lie (plan §3.1).
 * - LAZY — `import("tesseract.js")` happens on the first run, never on page
 *   load; the boundaries test holds engine imports to exactly this file.
 * - ONE WORKER AT A TIME — switching language or quality terminates the old
 *   worker and builds a fresh one; `disposeEngine` runs on unmount.
 * - THE MODEL IS CACHED, AND THE COPY SAYS SO — `cacheMethod: "write"` keeps
 *   the traineddata in IndexedDB so a second run starts instantly. That is
 *   the language file, never a document; the words card states it.
 *
 * The tesseract.js types are NOT imported — even `import type` would pin the
 * package's presence at compile time in a second file. The two local shapes
 * below are what the engine actually touches.
 */

import { cacheKey, langPath, type LangSpec } from "./langs";
import type { OcrPageResult, OcrProgress, Quality, RawParagraph } from "./types";
import { blocksToParagraphs } from "./raster";
import { assembleParagraph, pageConfidence, paragraphsToText } from "./clean";

interface TesseractLoggerMessage {
  status: string;
  progress: number;
}

interface TesseractWorker {
  recognize(
    image: Blob | HTMLCanvasElement,
    options?: Record<string, unknown>,
    output?: { blocks?: boolean; text?: boolean },
  ): Promise<{ data: { blocks: import("./raster").RawBlocks["data"]["blocks"] } }>;
  terminate(): Promise<unknown>;
}

type TesseractModule = {
  createWorker(
    lang: string,
    oem: number,
    options: {
      workerPath: string;
      corePath: string;
      langPath: string;
      cachePath: string;
      cacheMethod: string;
      gzip: boolean;
      logger: (message: TesseractLoggerMessage) => void;
    },
  ): Promise<TesseractWorker>;
  OEM: { LSTM_ONLY: number };
};

export interface EngineChoice {
  lang: LangSpec;
  quality: Quality;
}

let engine: { key: string; worker: TesseractWorker } | null = null;

/** `true` between getEngine and its settle — a second run must wait rather
 *  than stack a second worker on the same IndexedDB cache. */
let loading = false;

export function engineBusy(): boolean {
  return loading || engine !== null;
}

export async function getEngine(
  choice: EngineChoice,
  onProgress?: (progress: OcrProgress) => void,
): Promise<TesseractWorker> {
  const key = cacheKey(choice.lang.id, choice.quality);
  if (engine && engine.key === key) return engine.worker;
  if (loading) throw new Error("the reader is still starting — give it a second.");
  loading = true;
  await disposeEngine();
  try {
    // The one lazy engine import in the tool (boundaries-guarded).
    const { createWorker, OEM } = (await import("tesseract.js")) as unknown as TesseractModule;
    const worker = await createWorker(choice.lang.id, OEM.LSTM_ONLY, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core/",
      langPath: langPath(choice.quality),
      // Fast and standard are both "eng" to tesseract — the cachePath is
      // what keeps the two models from evicting each other.
      cachePath: key,
      cacheMethod: "write",
      gzip: true,
      logger: (message) => {
        if (!onProgress) return;
        if (message.status === "loading tesseract core" || message.status === "initializing tesseract") {
          onProgress({ stage: "engine", message: "waking the reader…", progress: message.progress });
        } else if (message.status === "loading language traineddata") {
          onProgress({ stage: "language", message: "fetching the language file — once.", progress: null });
        }
      },
    });
    engine = { key, worker };
    return worker;
  } finally {
    loading = false;
  }
}

/** Terminate the worker, whatever stage it reached. The language model stays
 *  in IndexedDB — that is the disclosed cache, not engine state. */
export async function disposeEngine(): Promise<void> {
  if (!engine) return;
  const worker = engine.worker;
  engine = null;
  try {
    await worker.terminate();
  } catch {
    // A worker mid-job can refuse; it is going away either way.
  }
}

/**
 * Delete the cached language models from this browser (the idb-keyval store
 * tesseract.js owns). Only while no engine is live — call after
 * `disposeEngine`. Best-effort: a browser that refuses still gets "done",
 * because nothing user-facing depended on the delete.
 */
export async function clearLanguageCache(): Promise<void> {
  if (engine) throw new Error("stop the current run before clearing the saved language.");
  const request = indexedDB.deleteDatabase("keyval-store");
  await new Promise<void>((resolve) => {
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/**
 * Read one canvas. Returns the page's cleaned paragraphs, its mean
 * confidence and the plain text — everything the words card shows.
 */
export async function recognisePage(
  canvas: HTMLCanvasElement,
  choice: EngineChoice,
  pageIndex: number,
  pageCount: number,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrPageResult> {
  const worker = await getEngine(choice, onProgress);
  const started = performance.now();
  onProgress?.({
    stage: "reading",
    message:
      pageCount > 1 ? `reading page ${pageIndex} of ${pageCount}…` : "reading the page…",
    progress: pageCount > 0 ? (pageIndex - 1) / pageCount : null,
  });
  const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
  const paragraphs: RawParagraph[] = blocksToParagraphs(data.blocks);
  const blocks: OcrPageResult["blocks"] = [];
  let unreadable = 0;
  for (const paragraph of paragraphs) {
    const assembled = assembleParagraph(paragraph);
    if (!assembled) continue;
    blocks.push(assembled.block);
    unreadable += assembled.unreadable;
  }
  return {
    page: pageIndex,
    blocks,
    text: paragraphsToText(blocks),
    confidence: pageConfidence(blocks),
    ms: Math.round(performance.now() - started),
    unreadable,
  };
}
