/**
 * CapyResize's shared vocabulary: the two stages, what comes in, what goes
 * out, and the honest notes the tool hands the reader along the way.
 *
 * Everything here is plain data — no React, no browser — so the pure layers
 * (sniff, steps, ico, pack) and the tests can import it from anywhere.
 */

/** The editor's two stages. */
export type StageId = "resize" | "favicon";

/**
 * What the input actually is, sniffed from magic bytes — extensions lie.
 * Only kinds the browser can decode into an `<img>` appear here; anything
 * else is "unknown", and CapyResize says so plainly.
 */
export type InputKind =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "bmp"
  | "avif"
  | "svg"
  | "ico"
  | "unknown";

/** What the browser can encode to (`toBlob`). No AVIF — no browser encodes it. */
export type OutputFormat = "png" | "jpeg" | "webp";

/** Stage A's controls, as one request object. */
export interface ResizeRequest {
  /** Target width in px; the height follows the aspect lock. */
  width: number;
  format: OutputFormat;
  /** 0.50–1.00, JPEG/WebP only; PNG ignores it. */
  quality: number;
  /** JPEG has no transparency — the alpha channel flattens onto this hex. */
  flatten: string;
}

/** Stage A's proof: the encoded result and the honest byte math around it. */
export interface ResizeResult {
  blob: Blob;
  width: number;
  height: number;
  beforeBytes: number;
  afterBytes: number;
  /** Requested WebP, the browser silently exported PNG (the Safari rule). */
  webpFallback: boolean;
  /** The target width exceeded the source — softer pixels, said once. */
  upscaled: boolean;
}

/**
 * Stage B's payload for the ZIP — one entry per file, already encoded.
 * The favicon stage builds these from PACK_SPECS; zipPack serialises them.
 */
export type PackFiles = Array<{ name: string; blob: Blob }>;

/**
 * The notes the tool owes the reader, each stating what actually happened —
 * never a spec lecture. Copy lives where the note is raised; the type marks
 * which guard spoke.
 */
export type GuardNote =
  | "webp-fallback"
  | "gif-first-frame"
  | "upscale"
  | "center-crop"
  | "decode-failed";
