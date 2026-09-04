/**
 * CapyStrip's data shapes. Everything here is plain data — no browser APIs —
 * so the whole pipeline stays testable in node.
 */

/** File formats CapyStrip understands, sniffed from magic bytes (never extensions). */
export type ImageKind = "jpeg" | "png" | "webp" | "heic" | "avif" | "tiff" | "unknown";

/** Where C2PA content credentials were found. `null` means none detected. */
export type C2paPresence = "app11" | "caBX" | "riff" | null;

/** One readable PNG text chunk (tEXt/iTXt/zTXt). exifr does not read these. */
export interface PngTextChunk {
  key: string;
  value: string;
  chunk: "tEXt" | "iTXt" | "zTXt";
}

/** An A1111-style `parameters` value, split into its three conventional parts. */
export interface A1111Parameters {
  prompt: string;
  negativePrompt: string | null;
  settings: string | null;
}

/** Everything the raw byte reads found, before any presentation decisions. */
export interface RawMetadata {
  kind: ImageKind;
  fileName: string;
  byteSize: number;
  /**
   * The merged exifr record (TIFF blocks, XMP namespaces, ICC, IPTC, JFIF and
   * IHDR keys all flattened — `mergeOutput: true`). XMP-specific keys are also
   * plucked into `xmp` below so the report can prefer a stable view of them.
   */
  exif?: Record<string, unknown>;
  xmp?: Record<string, unknown>;
  pngText?: PngTextChunk[];
  gps?: { latitude: number; longitude: number } | null;
  iccPresent: boolean;
  thumbnailPresent: boolean;
  c2pa: C2paPresence;
  markers: string[];
}

export type FieldCategory = "privacy" | "camera" | "time" | "software_ai" | "technical";

/** One presentable row of the report card. */
export interface MetadataField {
  id: string;
  label: string;
  value: string;
  category: FieldCategory;
  /** True when the field can identify a person, a device or a moment. */
  critical: boolean;
}

export type Verdict = "chatty" | "quiet" | "muted" | "blank";

export interface MetadataReport {
  fileName: string;
  kind: ImageKind;
  fields: MetadataField[];
  gps?: { latitude: number; longitude: number } | null;
  /** Friendly sentences about AI-generation evidence found in the file. */
  aiSignals: string[];
  /** Count of critical (sensitive) fields. */
  chattyCount: number;
  verdict: Verdict;
  byteSize: number;
}

export interface CleanOptions {
  /** JPEG export quality, 0–1. Default 0.92. */
  quality?: number;
}

export interface CleanResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  bytesBefore: number;
  bytesAfter: number;
  /** True when the re-scan of the output found nothing at all. */
  verified: boolean;
  /** Honest fallback notes (browser limits, ICC flattening, …). */
  notes: string[];
}
