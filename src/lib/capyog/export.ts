/**
 * Thin wrappers over the shared card export layer (`src/lib/card/export.ts`).
 *
 * `capturePngBlob` is reused as-is for the clipboard copy. The download path
 * stands alone (rather than extending `exportNodePng`) because CapyOG needs a
 * format switch and a scale the Wrapped call sites never pass — the plan names
 * the standalone route as the equally-fine option, and it keeps the
 * production-proven shared file untouched.
 */

import { toJpeg, toPng } from "html-to-image";

import { capturePngBlob } from "@/lib/card/export";

import type { ExportFormat, ExportScale } from "./types";

export interface ExportRequest {
  width: number;
  height: number;
  scale: ExportScale;
  format: ExportFormat;
  /** JPEG quality, 0.50–1.00. PNG ignores it. */
  quality?: number;
  /** Flattening colour for JPEG, which has no alpha — the card's own bg. */
  background?: string;
  /** Download name; callers build it with `buildFileName`. */
  filename: string;
}

/** "capyog-statement-1200x630@2x.png" — the name a download lands as. */
export function buildFileName(t: {
  template: string;
  width: number;
  height: number;
  scale: number;
  format: "png" | "jpeg";
}): string {
  const ext = t.format === "png" ? "png" : "jpg";
  return `capyog-${t.template}-${t.width}x${t.height}@${t.scale}x.${ext}`;
}

/**
 * The pure format → capture-options table, so the shape of the html-to-image
 * call is testable without a DOM: PNG keeps alpha and carries the pixel ratio;
 * JPEG gets a quality and a flattening background colour.
 */
export function buildExportOptions(opts: ExportRequest): {
  format: ExportFormat;
  width: number;
  height: number;
  pixelRatio: number;
  cacheBust: true;
  quality?: number;
  backgroundColor?: string;
} {
  const shared = {
    format: opts.format,
    width: opts.width,
    height: opts.height,
    pixelRatio: opts.scale,
    cacheBust: true as const,
  };
  if (opts.format === "jpeg") {
    return {
      ...shared,
      quality: opts.quality ?? 0.92,
      backgroundColor: opts.background ?? "#ffffff",
    };
  }
  return shared;
}

/** Capture the full-size node and trigger the download, fonts settled first. */
export async function exportCard(node: HTMLElement, opts: ExportRequest): Promise<void> {
  await document.fonts.ready; // Fraunces/Jakarta/Albert must be loaded before capture
  const { format, ...capture } = buildExportOptions(opts);
  const dataUrl =
    format === "jpeg" ? await toJpeg(node, capture) : await toPng(node, capture);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = opts.filename;
  a.click();
}

/**
 * Copy the card image alone — no share URL exists to pair it with. Returns
 * false when the clipboard rejects the write, so the caller can show the
 * text-free fallback note.
 */
export async function copyCardImage(
  node: HTMLElement,
  width: number,
  height: number,
): Promise<boolean> {
  if (typeof ClipboardItem === "undefined") return false;
  try {
    const blob = await capturePngBlob(node, width, height);
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
