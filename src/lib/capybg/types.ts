/**
 * CapyBg's shared vocabulary. Pure types — no browser, no Node, no imports —
 * so the build script, the worker and the tests can all speak them.
 */

/** The segmentation models CapyBg can run (see models.ts for the registry). */
/** `u2human` is never chosen on its own: it is group mode's helper, deciding
 *  WHO is in the photo while MODNet draws the edges (client.ts). */
export type ModelId = "modnet" | "birefnet" | "u2human";

/** Where inference runs. The copy on the page names both honestly. */
export type Backend = "webgpu" | "wasm";

/** What goes behind the cut subject. */
export type Backdrop = "transparent" | "light" | "dark" | { color: string };

export type OutputFormat = "png" | "jpeg";

/** Per-file options (plan §5.1 — the seam stays UI-free). */
export interface BgOptions {
  model: ModelId;
  backdrop: Backdrop;
  format: OutputFormat;
  /** JPEG only, clamped to 0.5–1 (compose.ts decides the default). */
  quality?: number;
  /** Matte softening in px, 0–3, default 1. */
  feather?: number;
  /** People model only: also run the group helper and fuse the mattes. */
  group?: boolean;
}

/** What a finished cut reports — every number in it is the truth. */
export interface BgResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  bytesBefore: number;
  bytesAfter: number;
  backend: Backend;
  /** Time the model itself took, not decode/compose. */
  modelMs: number;
  /** Honest fallbacks: downscaled, encoder swapped type, GPU fell back… */
  notes: string[];
}

/** What the UI shows while the work happens. */
export interface Progress {
  phase: "download" | "load" | "cut";
  /** download only: streamed bytes vs the manifest's known total. */
  received?: number;
  total?: number;
  message?: string;
}
