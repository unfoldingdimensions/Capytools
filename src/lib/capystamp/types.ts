import type { OutputFormat } from "@/lib/capyresize/types";

/**
 * CapyStamp's vocabulary. A stamp design is stored RELATIVE to each image —
 * size as a fraction of the image's short side, position as a 9-point anchor
 * plus a fractional offset — so one design lands proportionally on portrait,
 * landscape and square photos in the same batch. No pixel is ever stored.
 */

/** The 9-point anchor grid: t/m/b × l/c/r. */
export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

export type Tiling = "none" | "grid" | "diagonal";

/**
 * The faces the mark can take. The three house faces resolve at runtime from
 * the `next/font` CSS variables (their real family names are generated), so
 * the preview and the export always draw the face the page actually loaded.
 */
export type FontChoice =
  | "house-sans"
  | "house-display"
  | "house-label"
  | "system-sans"
  | "system-serif"
  | "system-mono";

export type Halo = "none" | "shadow" | "outline";

/** Everything a text mark and a logo mark share. */
export interface MarkCommon {
  /** Fraction of the image's SHORT side. Text: the font size. Logo: its longer side. */
  size: number;
  /** 0.05–1. */
  opacity: number;
  /** Degrees about the mark's centre; wraps to −180…180. */
  rotation: number;
  anchor: Anchor;
  /** Drag position, as a fraction of the image's width/height. 0,0 = the anchor. */
  offset: { x: number; y: number };
  tiling: Tiling;
  /** Tile spacing beyond the mark's own box, as a fraction of its longer side. */
  gap: number;
}

export interface TextMark extends MarkCommon {
  kind: "text";
  text: string;
  font: FontChoice;
  weight: number;
  /** Hex, `#rrggbb`. */
  colour: string;
  /** em, relative to the font size. */
  letterSpacing: number;
  halo: Halo;
}

export interface LogoMark extends MarkCommon {
  kind: "logo";
}

export type StampSpec = TextMark | LogoMark;

export interface OutputOptions {
  format: OutputFormat;
  /** 0.5–1 for JPEG/WebP; ignored by PNG. */
  quality: number;
}

/** One finished file, with the honest numbers and notes around it. */
export interface StampResult {
  name: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  bytesBefore: number;
  bytesAfter: number;
  /** Honest fallbacks: WebP→PNG swap, first GIF frame only, … */
  notes: string[];
}

/** A file the run could not stamp, with the reason the UI prints. */
export interface FileFailure {
  name: string;
  reason: string;
}

export type ItemStatus = "queued" | "stamping" | "done" | "failed";
