import type { OutputOptions, ItemStatus, StampResult } from "./types";
import { stampOne, StampError, REASONS } from "./stamp";

/**
 * The capped, sequential batch. One image is decoded, drawn and encoded at a
 * time, the run yields between files so the tab keeps breathing, and one bad
 * file never aborts the run — it fails with a reason while the rest finish.
 *
 * FREE_BATCH_LIMIT is the one constant behind the "up to 20" copy: the UI
 * imports it for its sentences, this module enforces it on the queue, and a
 * boundary test pins both to the same name.
 */

export const FREE_BATCH_LIMIT = 20;

export interface BatchHooks {
  /** Per-file progress: queued files are announced "stamping", then done/failed. */
  onItem?: (index: number, status: ItemStatus, payload?: { result?: StampResult; reason?: string }) => void;
  /** Checked before each file; true stops after the current file, keeping results. */
  shouldStop?: () => boolean;
  /** The session logo and the resolved font variables — every file draws the same design. */
  logo?: HTMLImageElement | null;
  vars?: Record<string, string>;
  /** Injectable for tests — the real stampOne touches canvas and decode. */
  stampOneImpl?: typeof stampOne;
  /** Between files; defaults to scheduler.yield when present, else setTimeout 0. */
  yieldBetween?: () => Promise<void>;
}

export interface BatchOutcome {
  results: StampResult[];
  failures: Array<{ name: string; reason: string }>;
  /** Files actually queued — never more than FREE_BATCH_LIMIT. */
  queued: number;
  /** Files beyond the cap, in drop order after the first FREE_BATCH_LIMIT. */
  overflow: number;
  cancelled: boolean;
}

const defaultYield = (): Promise<void> => {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * Walk the queue in order. `hooks.logo` and `hooks.vars` ride along to
 * stampOne so every file in the run draws the same design with the same face.
 */
export async function runBatch(
  files: File[],
  spec: Parameters<typeof stampOne>[1],
  output: OutputOptions,
  hooks: BatchHooks = {},
): Promise<BatchOutcome> {
  const doStamp = hooks.stampOneImpl ?? stampOne;
  const yieldBetween = hooks.yieldBetween ?? defaultYield;
  const taken = new Set<string>();

  const queue = files.slice(0, FREE_BATCH_LIMIT);
  const outcome: BatchOutcome = {
    results: [],
    failures: [],
    queued: queue.length,
    overflow: Math.max(0, files.length - queue.length),
    cancelled: false,
  };

  for (let i = 0; i < queue.length; i++) {
    if (hooks.shouldStop?.()) {
      outcome.cancelled = true;
      return outcome;
    }
    const file = queue[i];
    hooks.onItem?.(i, "stamping");
    try {
      const result = await doStamp(file, spec, output, hooks.logo ?? undefined, {
        taken,
        vars: hooks.vars,
      });
      outcome.results.push(result);
      hooks.onItem?.(i, "done", { result });
    } catch (error: unknown) {
      const reason =
        error instanceof StampError
          ? error.reason
          : error instanceof Error && error.message === "The browser could not decode this file"
            ? REASONS.decode
            : REASONS.unknown;
      outcome.failures.push({ name: file.name, reason });
      hooks.onItem?.(i, "failed", { reason });
    }
    await yieldBetween();
  }

  return outcome;
}
