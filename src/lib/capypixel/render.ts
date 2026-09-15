/**
 * The browser-only bridge: grid sampling, canvas rasterising, PNG export and
 * SVG logo rasterization. Everything here runs in the tab and nowhere else;
 * the pure decision helpers at the bottom (bbox-from-alpha, export sizing,
 * preview pitch) are what the node tests table-test, so the browser bodies
 * stay thin.
 *
 * Rendering rules carried over from the prototype (HOW-IT-WORKS §4):
 * - square cells, uniform scale, letterbox — never stretch;
 * - integer cell pitch at export, so tiles are crisp with no resampling;
 * - `willReadFrequently: true` on any 2D context that gets read back;
 * - `Path2D` never throws on garbage — it silently makes an empty path, so
 *   absence of ink is asserted, not assumed.
 */

import type { Palette } from "./types";

/** The browser's decoder refused the file. */
export class DecodeFailedError extends Error {
  constructor() {
    super("the browser could not decode this file");
    this.name = "DecodeFailedError";
  }
}

/** The SVG produced no ink — Path2D parses garbage into an empty path, silently. */
export class NoInkError extends Error {
  constructor() {
    super("this svg produced no ink");
    this.name = "NoInkError";
  }
}

function guard(): void {
  if (typeof window === "undefined") {
    throw new Error("capypixel/render is browser-only");
  }
}

// ------------------------------------------------------------------ sampling

/**
 * Area-average downsample into a cols×rows cell grid. This is the single
 * biggest quality lever in the whole pipeline: imageSmoothingQuality "high"
 * makes the browser box-filter the source into the grid, where
 * nearest-neighbour would alias fine detail into noise.
 *
 * Throws if the canvas is tainted, and callers must treat that as fatal rather
 * than shipping a blank frame. Only a SecurityError means taint — catching
 * everything here would relabel a genuine bug as a taint problem, which (once)
 * it did.
 */
export function sampleGrid(
  img: CanvasImageSource,
  cols: number,
  rows: number,
): { cells: Uint8Array; alpha: Uint8Array; cols: number; rows: number; n: number } {
  guard();
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new DecodeFailedError();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.clearRect(0, 0, cols, rows);
  g.drawImage(img, 0, 0, cols, rows);

  let data: Uint8ClampedArray;
  try {
    data = g.getImageData(0, 0, cols, rows).data;
  } catch (e) {
    if (e instanceof Error && e.name === "SecurityError") {
      const err = new Error(
        "canvas readback blocked by the same-origin policy — load the image from a blob: URL (upload) or an inlined data: URI",
      );
      err.name = "TaintedCanvasError";
      throw err;
    }
    throw new DecodeFailedError();
  }

  const n = cols * rows;
  const cells = new Uint8Array(n * 3);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    cells[i * 3] = data[i * 4];
    cells[i * 3 + 1] = data[i * 4 + 1];
    cells[i * 3 + 2] = data[i * 4 + 2];
    alpha[i] = data[i * 4 + 3];
  }
  return { cells, alpha, cols, rows, n };
}

/** Object URL → `<img>` → `decode()` → revoked in finally. */
export async function decodeImage(file: Blob): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  guard();
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (width < 1 || height < 1) throw new DecodeFailedError();
    return { img, width, height };
  } catch (e) {
    if (e instanceof DecodeFailedError) throw e;
    throw new DecodeFailedError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------- rasterise

/** Cell/gutter pitch for the live preview: the same tile look at a smaller
 *  pitch, so the preview reads like the export without paying for it. */
export function previewPitchFor(
  cols: number,
  cell: number,
  gutter: number,
): { cell: number; gutter: number } {
  const previewCell = cols <= 300 ? 4 : 2;
  const ratio = cell > 0 ? gutter / cell : 0;
  const previewGutter = gutter > 0 ? Math.max(1, Math.round(previewCell * ratio)) : 0;
  return { cell: previewCell, gutter: Math.min(previewGutter, previewCell - 1) };
}

/** Export dimensions at integer scale — whole numbers keep the tiles crisp. */
export function exportSize(
  cols: number,
  rows: number,
  cell: number,
  scale: number,
): { width: number; height: number } {
  return { width: cols * cell * scale, height: rows * cell * scale };
}

/** Paint each cell in its palette colour; cells whose source alpha is under 8
 *  stay transparent. */
export function drawIndices(
  indices: Uint8Array | Int32Array,
  palette: Palette,
  cols: number,
  rows: number,
  cell: number,
  gutter: number,
  alpha?: Uint8Array,
): HTMLCanvasElement {
  guard();
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const g = canvas.getContext("2d");
  if (!g) throw new DecodeFailedError();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (alpha && alpha[i] < 8) continue; // keep transparency from the source
      const p = palette[indices[i]];
      g.fillStyle = `rgb(${p[0]},${p[1]},${p[2]})`;
      g.fillRect(x * cell, y * cell, cell - gutter, cell - gutter);
    }
  }
  return canvas;
}

/**
 * Nearest-neighbour upscale, so an exported PNG has hard pixel edges instead of
 * the browser's interpolated ones. Then PNG bytes — the format is part of the
 * promise (crisp tiles survive the download).
 */
export async function exportPng(canvas: HTMLCanvasElement, scale: number): Promise<Blob> {
  guard();
  let source = canvas;
  if (scale !== 1) {
    const up = document.createElement("canvas");
    up.width = canvas.width * scale;
    up.height = canvas.height * scale;
    const g = up.getContext("2d");
    if (!g) throw new DecodeFailedError();
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, up.width, up.height);
    source = up;
  }
  return new Promise((resolve, reject) => {
    source.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new DecodeFailedError())),
      "image/png",
    );
  });
}

// ---------------------------------------------------------------- logo mode

export interface InkBbox {
  /** Tight bounding box in PROBE pixels. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Tight bounding box from an alpha scan — pure, so it is table-tested on a
 * synthetic ImageData buffer. Alpha (channel 3) is the coverage signal: fill
 * the shape white and alpha tells you where the ink is.
 */
export function tightBboxFromAlpha(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  threshold = 24,
): InkBbox | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * Fill every `d` path of an SVG white onto a square probe canvas and return
 * the tight ink bbox in PROBE pixels, plus the probe scale used.
 *
 * Coordinate spaces are named because getting them mixed up is the classic
 * silent bug: `d` attributes speak PATH units, the probe speaks PROBE pixels,
 * and only the explicit scale `k` converts between them.
 */
function probeSvg(svgText: string): { bbox: InkBbox; k: number } {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const ds = Array.from(doc.querySelectorAll("path"))
    .map((p) => p.getAttribute("d") ?? "")
    .filter((d) => d.trim().length > 0);
  if (!ds.length) throw new NoInkError();

  // Path units: the viewBox if there is one, else width/height, else the
  // 24-unit icon convention (simple-icons, the target input).
  const svg = doc.querySelector("svg");
  let unit = 24;
  const viewBox = svg?.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((v) => Number.isFinite(v)) && parts[2] > 0) {
      unit = parts[2];
    }
  } else {
    const w = parseFloat(svg?.getAttribute("width") ?? "");
    if (Number.isFinite(w) && w > 0) unit = w;
  }

  const hi = 512;
  const k = hi / unit;
  const probe = document.createElement("canvas");
  probe.width = hi;
  probe.height = hi;
  const g = probe.getContext("2d", { willReadFrequently: true });
  if (!g) throw new NoInkError();
  g.setTransform(k, 0, 0, k, 0, 0);
  g.fillStyle = "#fff";
  for (const d of ds) g.fill(new Path2D(d));

  const data = g.getImageData(0, 0, hi, hi).data;
  const bbox = tightBboxFromAlpha(data, hi, hi, 24);
  if (!bbox) throw new NoInkError();
  return { bbox, k };
}

/** The ink's aspect ratio in path units — what picks the logo grid's height. */
export function logoInkAspect(svgText: string): { uw: number; uh: number } {
  guard();
  const { bbox, k } = probeSvg(svgText);
  const uw = (bbox.x1 - bbox.x0 + 1) / k; // → PATH units
  const uh = (bbox.y1 - bbox.y0 + 1) / k;
  return { uw, uh };
}

/**
 * SVG text → boolean occupancy mask on a cols×rows grid.
 *
 * Rasterize white, scan alpha for the tight bbox, scale UNIFORMLY (same
 * factor for x and y — a non-uniform scale turns a recognisable glyph into an
 * unreadable smear) and letterbox rather than stretch. The alpha threshold
 * (≈90) is the quantisation knob: low catches anti-aliased edges (blobbier),
 * high keeps only solid interiors (thinner).
 */
export function logoMask(svgText: string, cols: number, rows: number): Uint8Array {
  guard();
  const { bbox, k } = probeSvg(svgText);

  const uw = (bbox.x1 - bbox.x0 + 1) / k; // ink size in PATH units
  const uh = (bbox.y1 - bbox.y0 + 1) / k;
  const s = Math.min(cols / uw, rows / uh); // uniform ⇒ SQUARE cells
  const ox = (cols - uw * s) / 2 - (bbox.x0 / k) * s; // centre in the grid
  const oy = (rows - uh * s) / 2 - (bbox.y0 / k) * s;

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const paths = Array.from(doc.querySelectorAll("path"))
    .map((p) => p.getAttribute("d") ?? "")
    .filter((d) => d.trim().length > 0)
    .map((d) => new Path2D(d));

  const out = document.createElement("canvas");
  out.width = cols;
  out.height = rows;
  const g = out.getContext("2d", { willReadFrequently: true });
  if (!g) throw new NoInkError();
  g.setTransform(s, 0, 0, s, ox, oy);
  g.fillStyle = "#fff";
  for (const p of paths) g.fill(p);

  const px = g.getImageData(0, 0, cols, rows).data;
  const mask = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) mask[i] = px[i * 4 + 3] > 90 ? 1 : 0; // threshold ALPHA
  return mask;
}

/** A logo mask → the cell grid the quantizer eats: white ink, transparent
 *  elsewhere. A flat logo has no tonal variation for a ramp to express — that
 *  is the honest shape of logo mode, not a limitation to hide. */
export function maskToCells(
  mask: Uint8Array,
  cols: number,
  rows: number,
): { cells: Uint8Array; alpha: Uint8Array } {
  const n = cols * rows;
  const cells = new Uint8Array(n * 3);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (mask[i]) {
      cells[i * 3] = 255;
      cells[i * 3 + 1] = 255;
      cells[i * 3 + 2] = 255;
      alpha[i] = 255;
    }
  }
  return { cells, alpha };
}
