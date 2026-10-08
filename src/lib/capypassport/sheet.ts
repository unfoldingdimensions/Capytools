import { mmToPx } from "./format";
import type { PhotoSpec } from "./specs";

/**
 * The print sheet (plan §5.5): the composed photo, tiled onto a 4 × 6 inch
 * sheet at the sheet's dpi, with hairline cut guides. The canvas carries no
 * DPI tag out of `toBlob` (plan §3.5), so withPrintDpi adds one; the PHYSICAL
 * size lives in the pixel math: at 300 dpi, 1200 × 1800 px prints exactly
 * 4 × 6 inches. The grid helpers are pure and unit-tested; only the renderer
 * touches a canvas.
 */

/** The sheet this version lays out: 4 × 6 in, portrait. */
export const SHEET = {
  wIn: 4,
  hIn: 6,
  dpi: 300,
};
export const SHEET_PX = {
  w: Math.round(SHEET.wIn * SHEET.dpi),
  h: Math.round(SHEET.hIn * SHEET.dpi),
};

/** Room for scissors: spacing between and around cells, spent only when the
 *  sheet has slack (a 2 × 2 in US grid on 4 in has none, and needs none). */
const PREFERRED_GAP_MM = 2.5;

export interface SheetCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SheetLayout {
  w: number;
  h: number;
  /** Pixel size of one photo cell (the spec's physical size at the dpi). */
  cell: { w: number; h: number };
  cells: SheetCell[];
  /** The hairlines to cut along, in px: horizontal and vertical positions. */
  cutsX: number[];
  cutsY: number[];
}

/**
 * Fit `copies` cells of the spec's physical size onto the sheet. Columns and
 * rows are chosen by the same rule a print shop uses: waste as few cells as
 * possible, prefer the wider grid on a tie, and spread whatever slack is
 * left evenly between and around the cells. Returns null when they cannot
 * all fit — the UI caps its stepper at `maxCopies` so this never happens by
 * accident.
 */
export function sheetLayout(spec: PhotoSpec, copies: number): SheetLayout | null {
  const n = Math.max(1, Math.floor(copies));
  const cellW = mmToPx(spec.physical.wMm, spec.dpi);
  const cellH = mmToPx(spec.physical.hMm, spec.dpi);

  let best: { cols: number; rows: number } | null = null;
  for (let cols = 1; cols <= n; cols++) {
    if (cols * cellW > SHEET_PX.w) break;
    const rows = Math.ceil(n / cols);
    if (rows * cellH > SHEET_PX.h) continue;
    const waste = cols * rows - n;
    const better =
      best === null ||
      waste < best.cols * best.rows - n ||
      (waste === best.cols * best.rows - n && cols > best.cols);
    if (better) best = { cols, rows };
  }
  if (!best) return null;

  // Even slack: outer margins equal the inner gaps, so the grid sits centred
  // and every gap scissors-wide. The per-gap spend caps at the preferred gap
  // (a short grid shouldn't drift into three bands of empty paper); whatever
  // the cap leaves goes half above and half below the grid.
  const spendX = (SHEET_PX.w - best.cols * cellW) / (best.cols + 1);
  const spendY = Math.min((SHEET_PX.h - best.rows * cellH) / (best.rows + 1), mmToPx(PREFERRED_GAP_MM, spec.dpi));
  const topY = (SHEET_PX.h - (best.rows * cellH + (best.rows - 1) * spendY)) / 2;
  const leftX = (SHEET_PX.w - (best.cols * cellW + (best.cols - 1) * spendX)) / 2;

  const cells: SheetCell[] = [];
  for (let row = 0; row < best.rows; row++) {
    for (let col = 0; col < best.cols; col++) {
      if (cells.length >= n) break;
      cells.push({
        x: Math.round(leftX + col * (cellW + spendX)),
        y: Math.round(topY + row * (cellH + spendY)),
        w: cellW,
        h: cellH,
      });
    }
  }

  const cutsX: number[] = [];
  const cutsY: number[] = [];
  for (const cell of cells) {
    cutsX.push(cell.x, cell.x + cell.w);
    cutsY.push(cell.y, cell.y + cell.h);
  }

  return {
    w: SHEET_PX.w,
    h: SHEET_PX.h,
    cell: { w: cellW, h: cellH },
    cells,
    // De-duplicated and sorted — the renderer draws each hairline once.
    cutsX: [...new Set(cutsX)].sort((a, b) => a - b),
    cutsY: [...new Set(cutsY)].sort((a, b) => a - b),
  };
}

/** The most copies of this spec a 4 × 6 sheet can carry. */
export function maxCopies(spec: PhotoSpec): number {
  const cellW = mmToPx(spec.physical.wMm, spec.dpi);
  const cellH = mmToPx(spec.physical.hMm, spec.dpi);
  const cols = Math.floor(SHEET_PX.w / cellW);
  const rows = Math.floor(SHEET_PX.h / cellH);
  return Math.max(1, cols * rows);
}

// ——— the renderer (browser) ———

import { CanvasRefusedError } from "@/lib/capybg/compose";

function guard(): void {
  if (typeof document === "undefined") throw new Error("capypassport renders in a browser tab only");
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Stamp a PNG with its print resolution: a pHYs chunk, right after IHDR.
 * `toBlob` writes none, so "actual size" in Windows Photos or Preview printed
 * the 1200 × 1800 sheet at 72–96 dpi — about 12.5 × 18.75 in, not 4 × 6. With
 * pHYs at the sheet's dpi, every viewer that honours it prints the real size.
 * Pure: bytes in, bytes out. Anything that isn't a PNG comes back untouched.
 */
export function withPrintDpi(png: Uint8Array, dpi: number): Uint8Array {
  const IHDR_END = 33; // 8-byte signature + IHDR (4 len + 4 type + 13 data + 4 crc)
  const isPng =
    png.length > IHDR_END && png[0] === 0x89 && png[1] === 0x50 && png[12] === 0x49 && png[15] === 0x52;
  if (!isPng) return png;
  const perMetre = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21); // 4 len + 4 type + 9 data + 4 crc
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, perMetre);
  view.setUint32(12, perMetre);
  chunk[16] = 1; // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, IHDR_END), 0);
  out.set(chunk, IHDR_END);
  out.set(png.subarray(IHDR_END), IHDR_END + chunk.length);
  return out;
}

/**
 * Draw the sheet. `photo` is the composed single-photo canvas; each cell
 * draws it at the cell's exact pixel size. Guides default ON here because a
 * sheet without cut lines is a worse product. They run along the cell edges,
 * so on the shared edges of a tight grid they overlap the outermost pixel row
 * of a photo — 1/300 in, inside any cut tolerance.
 */
export function renderSheet(photo: HTMLCanvasElement, layout: SheetLayout, guides = true): HTMLCanvasElement {
  guard();
  const canvas = document.createElement("canvas");
  canvas.width = layout.w;
  canvas.height = layout.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CanvasRefusedError();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for (const cell of layout.cells) {
    ctx.drawImage(photo, cell.x, cell.y, cell.w, cell.h);
  }
  if (guides) {
    ctx.strokeStyle = "#d8d6d0";
    ctx.lineWidth = 1;
    // Centre each hairline in its pixel column so it prints one pixel wide.
    const line = (at: number) => Math.round(at) + 0.5;
    ctx.beginPath();
    for (const x of layout.cutsX) {
      ctx.moveTo(line(x), 0);
      ctx.lineTo(line(x), layout.h);
    }
    for (const y of layout.cutsY) {
      ctx.moveTo(0, line(y));
      ctx.lineTo(layout.w, line(y));
    }
    ctx.stroke();
  }
  return canvas;
}
