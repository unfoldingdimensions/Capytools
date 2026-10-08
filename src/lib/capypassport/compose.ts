import type { CropWindow, Fit } from "./geometry";
import type { PhotoSpec } from "./specs";

/**
 * The compose half (plan §5.3): draw the chosen crop at the spec's pixel
 * size, optionally with the head-band guides ON (a verification affordance,
 * off by default in anything exported). The optional background fill is NOT
 * composited here — it runs through CapyBg's `removeBackground` in the tool
 * component, so there is exactly one matte engine in the suite.
 */

import { CanvasRefusedError } from "@/lib/capybg/compose";

/** How long an <img> decode may take before we call it a bad file. */
const DECODE_TIMEOUT_MS = 15_000;

export interface DecodedPortrait {
  /** What every draw call here accepts — bitmap or image element. */
  source: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  close: () => void;
}

export class PortraitDecodeError extends Error {
  constructor() {
    super("decode failed");
    this.name = "PortraitDecodeError";
  }
}

/**
 * Decode a portrait photo, EXIF orientation honoured.
 *
 * Bitmap-first, with the <img> road as the fallback — the mirror of
 * CapyBg's decode lesson: on real camera JPEGs, `img.decode()` can simply
 * never settle in some browsers (measured 2026-10-08 on a 1762×2220 EXIF
 * photo in Chromium: createImageBitmap returns in milliseconds,
 * `img.decode()` hangs forever). A hung decode would leave the tool saying
 * "reading the photo…" for eternity.
 */
export async function decodePortrait(file: Blob): Promise<DecodedPortrait> {
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
  if (typeof document === "undefined") throw new PortraitDecodeError();
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const ceiling = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new PortraitDecodeError()), DECODE_TIMEOUT_MS);
      });
      Promise.race([img.decode(), ceiling]).then(
        () => resolve(),
        () => reject(new PortraitDecodeError()),
      ).finally(() => clearTimeout(timer));
    });
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (width < 1 || height < 1) throw new PortraitDecodeError();
    return { source: img, width, height, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new PortraitDecodeError();
  }
}

/** Render the crop window to a fresh canvas at outW × outH. */
export function renderCrop(
  source: CanvasImageSource,
  crop: CropWindow,
  outW: number,
  outH: number,
): HTMLCanvasElement {
  if (typeof document === "undefined") throw new Error("capypassport composes in a browser tab only");
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CanvasRefusedError();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
  return canvas;
}

/**
 * Draw the measured hairlines ON a composed canvas — crown, chin and eye
 * line, exactly where the readout says they are. For checking the fit with
 * a ruler, not for submitting: guides on an exported photo would itself be
 * an alteration. Default-off at every call site that exports.
 */
export function drawGuides(canvas: HTMLCanvasElement, spec: PhotoSpec, fit: Fit): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CanvasRefusedError();
  const lineY = (mm: number) => {
    // mm from the frame's top → px row.
    const y = Math.round((mm / spec.physical.hMm) * canvas.height) + 0.5;
    return y;
  };
  ctx.strokeStyle = "rgba(192, 121, 82, 0.9)"; // the house clay, at rest
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  const rows = [
    { label: "crown", y: lineY(fit.topMarginMm) },
    { label: "chin", y: lineY(fit.topMarginMm + fit.headMm) },
    // The eye line is measured from the BOTTOM edge — convert mm from the
    // bottom to a px row from the top directly (lineY takes mm).
    ...(fit.eyeLineMm !== null
      ? [{ label: "eyes", y: canvas.height - (fit.eyeLineMm / spec.physical.hMm) * canvas.height }]
      : []),
  ];
  for (const row of rows) {
    ctx.beginPath();
    ctx.moveTo(0, row.y);
    ctx.lineTo(canvas.width, row.y);
    ctx.stroke();
  }
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(192, 121, 82, 0.9)";
  let labelY = 12;
  for (const row of rows) {
    ctx.fillText(row.label, 4, labelY);
    labelY = row.y + 12;
  }
}

/** Encode a canvas. `toBlob`'s verdict is the truth — no guessing sizes. */
export function exportCanvas(canvas: HTMLCanvasElement, mime: "image/jpeg" | "image/png", quality = 0.92): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new CanvasRefusedError())),
      mime,
      mime === "image/jpeg" ? quality : undefined,
    );
  });
}

/** The single digital file's JPEG name. */
export function photoFilename(specId: string, w: number, h: number): string {
  return `passport-photo-${specId}-${w}x${h}.jpg`;
}

/** The sheet's PNG name (plan §5.5). */
export function sheetFilename(specId: string): string {
  return `passport-sheet-${specId}.png`;
}
