import { isAnimatedGif, sniffImageKind } from "./sniff";
import type { InputKind, OutputFormat, PackFiles } from "./types";

/**
 * The browser-only bridge: decode, draw, encode, zip, sample. Every function
 * here runs in the tab and nowhere else; the pure decision helpers at the
 * bottom (fallback flag, byte formatting, naming) are what the node tests
 * table-test, so the browser bodies stay thin.
 *
 * Two engine rules live here and nowhere else:
 * - draws go from the decoded `<img>` (or the previous, at-most-half canvas)
 *   straight to the OUTPUT-sized canvas — never a source-sized canvas. Large
 *   canvases fail silently on some engines, and the design simply never
 *   builds one.
 * - WebP exports are checked after `toBlob`: Safari still silently returns
 *   PNG, so the returned blob's real type is the truth the UI reports.
 */

/** Hard ceiling the design guards: outputs above this are refused calmly. */
export const MAX_OUTPUT_SIDE = 8192;
export const MAX_OUTPUT_PIXELS = 16_700_000; // the iOS area cap, with headroom

export class DecodeFailedError extends Error {
  constructor() {
    super("the browser could not decode this file");
    this.name = "DecodeFailedError";
  }
}

/** The canvas refused the export — the silent-failure mode, made loud. */
export class CanvasRefusedError extends Error {
  constructor() {
    super("the browser refused this export — try a smaller size");
    this.name = "CanvasRefusedError";
  }
}

function guard(): void {
  if (typeof window === "undefined") {
    throw new Error("capyresize/render is browser-only");
  }
}

function canvas2d(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CanvasRefusedError();
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement, format: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new CanvasRefusedError())),
      `image/${format}`,
      quality,
    );
  });
}

export interface DecodedImage {
  img: HTMLImageElement;
  width: number;
  height: number;
  kind: InputKind;
  /** GIFs only: frames beyond the first exist, canvas takes the first. */
  animated: boolean;
}

/** Object URL → `<img>` → `decode()` → revoked in finally. The URL is only
 *  transport; the element keeps its bitmap once decoded. */
export async function decodeImage(file: Blob): Promise<DecodedImage> {
  guard();
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const kind = sniffImageKind(head, file.type);
  // Whole file only when a GIF — the animation hint needs every frame's GCE.
  const animated = kind === "gif" && isAnimatedGif(new Uint8Array(await file.arrayBuffer()));

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (width < 1 || height < 1) throw new DecodeFailedError();
    return { img, width, height, kind, animated };
  } catch (error) {
    if (error instanceof DecodeFailedError) throw error;
    throw new DecodeFailedError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Progressive halving: each step draws from the previous canvas, each canvas
 * at most half the one before, smoothing on throughout — the final step lands
 * exactly on the target. `imageSmoothingQuality` is set where supported and
 * ignored where not (Firefox), which is the point of halving at all.
 */
export function drawResized(img: HTMLImageElement, steps: Array<{ w: number; h: number }>): HTMLCanvasElement {
  guard();
  let source: CanvasImageSource = img;
  let canvas: HTMLCanvasElement | null = null;
  for (const { w, h } of steps) {
    const next = canvas2d(w, h);
    next.ctx.imageSmoothingEnabled = true;
    next.ctx.imageSmoothingQuality = "high";
    next.ctx.drawImage(source, 0, 0, w, h);
    canvas = next.canvas;
    source = canvas;
  }
  return canvas as HTMLCanvasElement;
}

/** Centered square crop → output-sized canvas, one draw. */
export function drawSquareFrom(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  size: number,
  outSize: number,
): HTMLCanvasElement {
  guard();
  const { canvas, ctx } = canvas2d(outSize, outSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, size, size, 0, 0, outSize, outSize);
  return canvas;
}

/** Opaque fill + art fitted to `box` px, centered — the maskable/apple form. */
export function drawPaddedFrom(img: HTMLImageElement, size: number, box: number, background: string): HTMLCanvasElement {
  guard();
  const { canvas, ctx } = canvas2d(size, size);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(box / w, box / h);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
  return canvas;
}

/**
 * Encode a canvas. JPEG has no alpha, so the flatten fill happens FIRST on a
 * fresh canvas and the art draws over it. WebP is the honest one: whatever
 * `toBlob` hands back is returned as-is, and the caller reports its real
 * type — Safari silently exports PNG, and the note says so.
 */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
  opts?: { flatten?: string },
): Promise<Blob> {
  guard();
  if (format === "jpeg") {
    const flat = canvas2d(canvas.width, canvas.height);
    flat.ctx.fillStyle = opts?.flatten || "#ffffff";
    flat.ctx.fillRect(0, 0, canvas.width, canvas.height);
    flat.ctx.drawImage(canvas, 0, 0);
    return toBlob(flat.canvas, "jpeg", quality);
  }
  return toBlob(canvas, format, format === "png" ? undefined : quality);
}

/** ZIP the pack. client-zip is STORE-only — PNGs are already compressed. */
export async function zipPack(files: PackFiles): Promise<Blob> {
  guard();
  const { downloadZip } = await import("client-zip");
  return downloadZip(
    files.map((file) => ({ name: file.name, lastModified: Date.now(), input: file.blob })),
  ).blob();
}

/** 4-corner median of the image, as hex — the opaque icons' default fill. */
export function sampleCornerColor(img: HTMLImageElement): string {
  guard();
  const size = 32;
  const { ctx } = canvas2d(size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const corners: Array<[number, number]> = [
    [0, 0],
    [size - 1, 0],
    [0, size - 1],
    [size - 1, size - 1],
  ];
  const samples = corners.map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);
  const hex = (channel: number) => {
    const sorted = samples.map((s) => s[channel]).sort((a, b) => a - b);
    const median = Math.round((sorted[1] + sorted[2]) / 2);
    return median.toString(16).padStart(2, "0");
  };
  return `#${hex(0)}${hex(1)}${hex(2)}`;
}

// ——— pure decision helpers, table-tested from node ———

/**
 * The WebP honesty rule: the requested format was WebP and the browser handed
 * back PNG. The blob's type is the only truth there is.
 */
export function isWebpFallback(requested: OutputFormat, blobType: string): boolean {
  return requested === "webp" && blobType === "image/png";
}

/** Output guard: above a side or area cap, the failure would be silent. */
export function outputRefused(w: number, h: number): boolean {
  return w > MAX_OUTPUT_SIDE || h > MAX_OUTPUT_SIDE || w * h > MAX_OUTPUT_PIXELS;
}

/** The file extension for an output format — JPEG's is the shorter .jpg. */
export function extensionFor(format: OutputFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

/** "1.2 MB", "340 kB", "8 B" — the byte line under the proof. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} kB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** The savings line: an integer percent, honest only after encoding. */
export function savingsPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round((1 - after / before) * 100);
}

/** `<name>-<width>w.<ext>` — the download name. */
export function resizeFilename(name: string, width: number, format: OutputFormat): string {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}-${width}w.${extensionFor(format)}`;
}
