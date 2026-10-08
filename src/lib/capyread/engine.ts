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
import { blocksToParagraphs, rotateCanvas } from "./raster";
import {
  ROTATION_ACCEPT_CONFIDENCE,
  attemptScore,
  betterRead,
  deskewCandidate,
  estimateSkewDegrees,
  needsRotation,
  pickBestAttempt,
  readableRatio,
  wantsDeskew,
} from "./orient";
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
  if (loading) throw new Error("The reader is still starting — give it a second.");
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
          onProgress({ stage: "engine", message: "Waking the reader…", progress: message.progress });
        } else if (message.status === "loading language traineddata") {
          onProgress({ stage: "language", message: "Fetching the language file — once.", progress: null });
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
  if (loading) throw new Error("Stop the current run before clearing the saved language.");
  // The idle worker from the last run holds the store open; let it go first.
  await disposeEngine();
  const request = indexedDB.deleteDatabase("keyval-store");
  await new Promise<void>((resolve) => {
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    // "blocked" is not "done": wait for success, but never hang the button.
    request.onblocked = () => setTimeout(resolve, 3000);
  });
}

/**
 * Read one canvas — with orientation and skew recovered from the reads
 * themselves.
 *
 * First pass at 0°. A page at its proper orientation reads with high
 * confidence; the same page sideways reads at almost nothing, so a poor
 * first read is the orientation signal: the other three quarter-turns are
 * tried until one clears the bar (no osd.traineddata download — our own
 * confidence is the detector, and the copy says which turn won). Then the
 * confident words' baselines estimate the fine skew, and a page honestly
 * crooked gets one straightened re-read. Straight pages pay for none of
 * this: one pass, as before.
 */
export async function recognisePage(
  canvas: HTMLCanvasElement,
  choice: EngineChoice,
  pageIndex: number,
  pageCount: number,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrPageResult> {
  const started = performance.now();
  const pageLabel = pageCount > 1 ? `page ${pageIndex} of ${pageCount}` : "the page";

  const readTurned = async (
    source: HTMLCanvasElement,
    rotation: 0 | 90 | 180 | 270,
    message: string,
  ) => {
    const worker = await getEngine(choice, onProgress);
    onProgress?.({ stage: "reading", message, progress: pageCount > 0 ? (pageIndex - 1) / pageCount : null });
    const { data } = await worker.recognize(source, {}, { blocks: true, text: false });
    const paragraphs: RawParagraph[] = blocksToParagraphs(data.blocks);
    const blocks: OcrPageResult["blocks"] = [];
    let unreadable = 0;
    for (const paragraph of paragraphs) {
      const assembled = assembleParagraph(paragraph);
      if (!assembled) continue;
      blocks.push(assembled.block);
      unreadable += assembled.unreadable;
    }
    const confidence = pageConfidence(blocks);
    return {
      paragraphs,
      blocks,
      unreadable,
      confidence,
      rotation,
      attempt: {
        rotation,
        confidence,
        words: paragraphs.reduce((sum, p) => sum + p.reduce((n, line) => n + line.words.length, 0), 0),
        unreadable,
      },
    };
  };

  type Turn = Awaited<ReturnType<typeof readTurned>>;

  // Ratio first, confidence as tiebreak — see attemptScore (orient.ts).
  const choose = (a: Turn, b: Turn): Turn => {
    const score = (t: Turn) => attemptScore(t.attempt);
    return score(b) > score(a) ? b : a;
  };

  let best = await readTurned(
    canvas,
    0,
    pageCount > 1 ? `Reading page ${pageIndex} of ${pageCount}…` : "Reading the page…",
  );

  if (needsRotation(best.attempt)) {
    const first = best;
    const turns: Turn[] = [];
    for (const angle of [90, 270, 180] as const) {
      // A read that keeps most of its words is the page's true orientation —
      // tesseract's mean confidence alone cannot be trusted here (upside-down
      // print hallucinates plausibly at 70+).
      if (readableRatio(best.attempt) >= 0.8 && (best.confidence ?? -1) >= ROTATION_ACCEPT_CONFIDENCE) break;
      const turn = await readTurned(
        rotateCanvas(canvas, angle),
        angle,
        `Nothing read yet — trying ${pageLabel} turned ${angle}°…`,
      );
      turns.push(turn);
      best = choose(best, turn);
    }
    // The final word goes to the guarded pick: a turn must keep real words
    // and clear the confidence bar, or the page's own orientation stands —
    // a one-word hallucination at 90° must not beat a rough upright read.
    const picked = pickBestAttempt(first.attempt, turns.map((turn) => turn.attempt));
    best = [first, ...turns].find((turn) => turn.attempt === picked) ?? first;
  }

  let deskew: number | null = null;
  // Deskew is a repair: only a degraded read (low confidence or marked
  // words) is worth straightening and reading again.
  if (wantsDeskew(best.confidence, best.unreadable)) {
    const skew = estimateSkewDegrees(best.paragraphs);
    const correction = deskewCandidate(skew);
    if (correction !== null) {
      // A positive skew means the page was turned clockwise; straighten it.
      const straightened = await readTurned(
        rotateCanvas(rotateCanvas(canvas, best.rotation), -correction),
        best.rotation,
        `Straightening ${Math.abs(correction)}° and reading again…`,
      );
      if (betterRead(best.attempt, straightened.attempt)) {
        best = straightened;
        deskew = correction;
      }
    }
  }

  return {
    page: pageIndex,
    blocks: best.blocks,
    text: paragraphsToText(best.blocks),
    confidence: best.confidence,
    ms: Math.round(performance.now() - started),
    unreadable: best.unreadable,
    rotation: best.rotation,
    deskew,
  };
}
