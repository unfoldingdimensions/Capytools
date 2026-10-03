import type { Backdrop, OutputFormat } from "./types";

/**
 * What happens between a matted canvas and the downloaded file — decisions
 * first (pure, table-tested from node), then the one browser body.
 *
 * The honesty rules this module owns:
 * - JPEG has no alpha, so a transparent backdrop refuses JPEG and says why.
 * - Whatever `toBlob` hands back is the truth reported to the visitor (the
 *   same rule CapyResize learned the hard way with Safari's WebP).
 * - The download name is the original's, with `-nobg` and the honest
 *   extension.
 */

export interface ComposeDecision {
  format: OutputFormat;
  /** The flatten fill, or null to keep the alpha channel. */
  fill: string | null;
  note?: string;
}

export const LIGHT_FILL = "#ffffff";
export const DARK_FILL = "#121212";

export function backdropFill(backdrop: Backdrop): string {
  if (backdrop === "light") return LIGHT_FILL;
  if (backdrop === "dark") return DARK_FILL;
  if (backdrop === "transparent") throw new Error("transparent has no fill");
  return backdrop.color;
}

export function decideCompose(backdrop: Backdrop, format: OutputFormat): ComposeDecision {
  if (backdrop === "transparent") {
    if (format === "jpeg") {
      return {
        format: "png",
        fill: null,
        note: "JPEG has no transparency, so the transparent cut is saved as PNG.",
      };
    }
    return { format: "png", fill: null };
  }
  return { format, fill: backdropFill(backdrop) };
}

/** JPEG quality: default 0.92, clamped to the 0.5–1 window the options promise. */
export function clampQuality(quality: number | undefined): number {
  const q = quality ?? 0.92;
  return Math.min(1, Math.max(0.5, q));
}

/** `photo.JPG` → `photo-nobg.png`. Extensionless names keep their base. */
export function bgFilename(name: string, format: OutputFormat): string {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}-nobg.${format === "jpeg" ? "jpg" : "png"}`;
}

// ——— the browser half ———

/** The canvas refused the export — the silent-failure mode, made loud. */
export class CanvasRefusedError extends Error {
  constructor() {
    super("the browser refused this export — try a smaller size");
    this.name = "CanvasRefusedError";
  }
}

function guard(): void {
  if (typeof document === "undefined") throw new Error("capybg/compose is browser-only");
}

/**
 * Encode the matted canvas. When the decision carries a fill, the flatten
 * happens FIRST on a fresh canvas and the cut draws over it — a JPEG canvas
 * would otherwise come back black where the alpha was zero.
 */
export async function encodeCut(canvas: HTMLCanvasElement, decision: ComposeDecision, quality: number): Promise<Blob> {
  guard();
  let target = canvas;
  if (decision.fill) {
    const flat = document.createElement("canvas");
    flat.width = canvas.width;
    flat.height = canvas.height;
    const ctx = flat.getContext("2d");
    if (!ctx) throw new CanvasRefusedError();
    ctx.fillStyle = decision.fill;
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    target = flat;
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    target.toBlob((b) => resolve(b), `image/${decision.format}`, decision.format === "png" ? undefined : quality);
  });
  if (!blob) throw new CanvasRefusedError();
  return blob;
}
