/**
 * The browser-only bridge to qr-code-styling.
 *
 * Two engine rules live here and nowhere else:
 * - the library touches browser globals at import time, so it loads through a
 *   dynamic `import()` inside `createQrEngine()` — never a static import, or
 *   the SSR pass crashes with "self is not defined";
 * - exports go through `getRawData()` only. The library's own `download()`
 *   emits JPEG regardless of the requested extension, so the component owns
 *   the anchor and the object URL instead.
 *
 * A second, offscreen `type: "svg"` instance mirrors every update: the SVG
 * serializer works without the element being in the DOM, and keeping it
 * separate means the on-screen canvas is never rebuilt for an SVG export.
 *
 * The decision helpers below are pure — node tests table-test them.
 */

import type { Gradient, Options } from "qr-code-styling";

import type { FrameLayout } from "./frame";
import type { EccLevel, FrameState, QrStyleState } from "./types";
import { toEngineByteString } from "./utf8";

export type ExportFormat = "png" | "jpeg" | "svg";

export interface QrEngine {
  mount(container: HTMLElement): void;
  /** One debounced call per change — `update()` clears and re-appends. */
  update(options: Options): void;
  /** The vector copy, from the offscreen svg instance — never `download()`. */
  svgBlob(): Promise<Blob | null>;
}

/** The flattening color for JPEG, which has no alpha channel. */
export const PAPER_COLOR = "#ffffff";

/** JPEG has no transparency — a transparent background needs the paper fill. */
export function jpegFillNeeded(bg: string | undefined): boolean {
  return !bg || bg === "transparent";
}

/**
 * SVG export keeps vector purity: the engine embeds a logo as a URL reference
 * that many SVG applications refuse to render, and a frame is drawn pixels,
 * not vectors — so the format is offered only without either.
 */
export function svgExportBlocked(hasLogo: boolean, hasFrame: boolean): boolean {
  return hasLogo || hasFrame;
}

/** The "download lands as" extension — JPEG's is the shorter .jpg. */
export function fileExtensionFor(format: ExportFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

/** The honest file-size figure for the status line — a measured blob, not an estimate. */
export function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function stage2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas refused");
  return ctx;
}

/**
 * Draw the composed export onto the stage canvas: the code's own background
 * (or transparency), the frame bands, the engine's QR canvas, then the
 * caption. The stage is what the preview shows, what the scan reads, and
 * what exports — one canvas, three readers, zero drift.
 */
export function composeStage(
  engineCanvas: HTMLCanvasElement,
  stage: HTMLCanvasElement,
  layout: FrameLayout,
  style: QrStyleState,
  frame: FrameState,
): void {
  const ctx = stage2d(stage);
  ctx.clearRect(0, 0, stage.width, stage.height);
  if (style.bg !== "transparent") {
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, stage.width, stage.height);
  }
  ctx.fillStyle = frame.color;
  for (const band of layout.bands) {
    if (band.radius > 0) {
      ctx.beginPath();
      ctx.roundRect(band.x, band.y, band.w, band.h, band.radius);
      ctx.fill();
    } else {
      ctx.fillRect(band.x, band.y, band.w, band.h);
    }
  }
  if (layout.ring) {
    const { outer, inner } = layout.ring;
    ctx.beginPath();
    ctx.roundRect(outer.x, outer.y, outer.w, outer.h, outer.radius);
    ctx.roundRect(inner.x, inner.y, inner.w, inner.h, inner.radius);
    ctx.fill("evenodd");
  }
  ctx.drawImage(engineCanvas, layout.qrX, layout.qrY, layout.qrSize, layout.qrSize);
  if (layout.caption && frame.label.trim()) {
    const fg = style.fg.mode === "solid" ? style.fg.color : style.fg.from;
    const cap = layout.caption;
    let fontSize = cap.fontSize;
    ctx.font = `500 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    const measured = ctx.measureText(frame.label.trim()).width;
    const floor = stage.width * 0.03;
    if (measured > cap.maxWidth && measured > 0) {
      fontSize = Math.max(fontSize * (cap.maxWidth / measured), floor);
      ctx.font = `500 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    }
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(frame.label.trim(), cap.x, cap.y, cap.maxWidth);
  }
}

/**
 * The raster export: PNG keeps the stage's alpha, JPEG is flattened onto
 * paper first. This — not the engine's `getRawData`, which only knows the
 * QR canvas — is what a framed export hands to the browser.
 */
export async function exportStage(
  stage: HTMLCanvasElement,
  format: "png" | "jpeg",
  bg: string | undefined,
): Promise<Blob | null> {
  if (format === "jpeg" && jpegFillNeeded(bg)) {
    const flat = document.createElement("canvas");
    flat.width = stage.width;
    flat.height = stage.height;
    const ctx = stage2d(flat);
    ctx.fillStyle = PAPER_COLOR;
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(stage, 0, 0);
    return await toBlob(flat, "jpeg");
  }
  return await toBlob(stage, format);
}

function toBlob(canvas: HTMLCanvasElement, format: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), `image/${format}`);
  });
}

/** Solid color → the engine's fill shape. */
export function toFill(color: string): { color: string } {
  return { color };
}

/** Gradient state → the engine's gradient shape. Rotation arrives in degrees and leaves in radians. */
export function toGradient(style: Extract<QrStyleState["fg"], { mode: "gradient" }>): {
  gradient: Gradient;
} {
  return {
    gradient: {
      type: style.gradientType,
      rotation: (style.rotation * Math.PI) / 180,
      colorStops: [
        { offset: 0, color: style.from },
        { offset: 1, color: style.to },
      ],
    },
  };
}

/** The dots/corners fill for a foreground style — color or gradient. */
export function toForeground(
  fg: QrStyleState["fg"],
): { color: string } | { gradient: Gradient } {
  return fg.mode === "solid" ? toFill(fg.color) : toGradient(fg);
}

/** The full engine options for a composed code, at the export size. */
export function buildEngineOptions(input: {
  value: string;
  size: number;
  style: QrStyleState;
  quietPx: number;
  logoUrl: string | null;
}): Options {
  const { value, size, style, quietPx, logoUrl } = input;
  const foreground = toForeground(style.fg);
  const cornerFill = style.cornerColor ? toFill(style.cornerColor) : foreground;
  return {
    width: size,
    height: size,
    type: "canvas",
    // Multibyte payloads ride to the engine as their own UTF-8 bytes — see
    // utf8.ts. ASCII is byte-identical, so this changes nothing for it.
    data: toEngineByteString(value),
    margin: quietPx,
    image: logoUrl ?? undefined,
    qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: style.ecc as EccLevel },
    dotsOptions: { type: style.dotType, ...foreground },
    cornersSquareOptions: { type: style.cornerSquareType, ...cornerFill },
    cornersDotOptions: { type: style.cornerDotType, ...cornerFill },
    backgroundOptions: { color: style.bg },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4 },
  };
}

export async function createQrEngine(): Promise<QrEngine> {
  if (typeof window === "undefined") {
    throw new Error("the qr engine only runs in a browser");
  }
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const canvas = new QRCodeStyling({ type: "canvas" });
  const svg = new QRCodeStyling({ type: "svg" });

  return {
    mount(container: HTMLElement) {
      canvas.append(container);
    },
    update(options: Options) {
      canvas.update(options);
      svg.update(options);
    },
    async svgBlob(): Promise<Blob | null> {
      return (await svg.getRawData("svg")) as Blob | null;
    },
  };
}
