import { DecodeFailedError, decodeImage, encodeCanvas, isWebpFallback, outputRefused } from "@/lib/capyresize/render";
import { drawStamp } from "./render";
import { clampSpec } from "./spec";
import { stampFilename } from "./names";
import type { OutputOptions, StampResult, StampSpec } from "./types";

/**
 * The per-file seam: one File in, one stamped Blob out. The batch is already
 * a loop over this function, which is where any future per-file feature
 * would live. Browser-only — decodeImage guards for us.
 */

/** A failure with the sentence the UI prints, not a stack trace. */
export class StampError extends Error {
  reason: string;
  constructor(reason: string) {
    super(reason);
    this.name = "StampError";
    this.reason = reason;
  }
}

/** The reason strings, in one place so the tests pin the copy. */
export const REASONS = {
  decode:
    "couldn't be read — if it's an HEIC, export it as JPEG and bring that back; otherwise the file may be damaged.",
  refused:
    "is larger than the browser will draw in one canvas — open it in CapyResize first, then stamp the smaller copy.",
  canvas: "couldn't be drawn — the browser refused the canvas at this size.",
  unknown: "failed for an unexpected reason — try it on its own to see the message.",
} as const;

export async function stampOne(
  file: File,
  spec: StampSpec,
  output: OutputOptions,
  logo?: HTMLImageElement | null,
  opts?: { vars?: Record<string, string>; taken?: Set<string> },
): Promise<StampResult> {
  const decoded = await decodeImage(file).catch((error: unknown) => {
    if (error instanceof DecodeFailedError) throw new StampError(REASONS.decode);
    throw error;
  });

  if (outputRefused(decoded.width, decoded.height)) throw new StampError(REASONS.refused);

  const canvas = document.createElement("canvas");
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new StampError(REASONS.canvas);

  const logoAspect = logo && logo.naturalWidth > 0 ? logo.naturalWidth / logo.naturalHeight : undefined;
  drawStamp(ctx, decoded.img, clampSpec(spec), logo, { vars: opts?.vars, logoAspect });

  const blob = await encodeCanvas(canvas, output.format, output.quality).catch(() => {
    throw new StampError(REASONS.canvas);
  });

  const notes: string[] = [];
  if (isWebpFallback(output.format, blob.type)) {
    notes.push("your browser saved PNG — it can't encode WebP.");
  }
  if (decoded.animated) {
    notes.push("animated GIF — the first frame is the one that gets stamped.");
  }

  return {
    name: stampFilename(file.name, output.format, opts?.taken),
    blob,
    mimeType: blob.type,
    width: decoded.width,
    height: decoded.height,
    bytesBefore: file.size,
    bytesAfter: blob.size,
    notes,
  };
}
