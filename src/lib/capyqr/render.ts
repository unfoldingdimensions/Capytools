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

import type { EccLevel, QrStyleState } from "./types";

export type ExportFormat = "png" | "jpeg" | "svg";

export interface QrEngine {
  mount(container: HTMLElement): void;
  /** One debounced call per change — `update()` clears and re-appends. */
  update(options: Options): void;
  /** `getRawData` under the hood — never the library's `download()`. */
  exportBlob(ext: ExportFormat): Promise<Blob | null>;
}

/** The flattening color for JPEG, which has no alpha channel. */
export const PAPER_COLOR = "#ffffff";

/** JPEG has no transparency — a transparent background needs the paper fill. */
export function jpegFillNeeded(bg: string | undefined): boolean {
  return !bg || bg === "transparent";
}

/**
 * SVG export keeps vector purity: the engine embeds a logo as a URL reference
 * that many SVG applications refuse to render, so the format is offered
 * without a logo only.
 */
export function svgExportBlocked(hasLogo: boolean): boolean {
  return hasLogo;
}

/** The "download lands as" extension — JPEG's is the shorter .jpg. */
export function fileExtensionFor(format: ExportFormat): string {
  return format === "jpeg" ? "jpg" : format;
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
    data: value,
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
  let current: Options = {};

  return {
    mount(container: HTMLElement) {
      canvas.append(container);
    },
    update(options: Options) {
      current = options;
      canvas.update(options);
      svg.update(options);
    },
    async exportBlob(ext: ExportFormat): Promise<Blob | null> {
      if (ext === "svg") {
        return (await svg.getRawData("svg")) as Blob | null;
      }
      if (ext === "jpeg" && jpegFillNeeded(current.backgroundOptions?.color as string)) {
        // Flatten onto paper for the format, then put the user's background
        // straight back so the preview never changes.
        canvas.update({ ...current, backgroundOptions: { color: PAPER_COLOR } });
        const blob = (await canvas.getRawData("jpeg")) as Blob | null;
        canvas.update(current);
        return blob;
      }
      return (await canvas.getRawData(ext)) as Blob | null;
    },
  };
}
