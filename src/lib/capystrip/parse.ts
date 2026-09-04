import exifr from "exifr/dist/full.esm.mjs";
import { sniffImageKind } from "./detect";
import { findPngChunk, readPngText } from "./png";
import type { C2paPresence, ImageKind, RawMetadata } from "./types";

/**
 * The parsing pipeline: sniff the kind, read the PNG text chunks ourselves
 * (exifr can't), run exifr for the EXIF/XMP/ICC/IPTC families, then do a raw
 * byte scan for C2PA containers and AI-tool fingerprints. Every sub-read is
 * individually guarded — a broken EXIF block must never kill the report.
 */

// The prebundled browser build of exifr (full: jpg/heic/tif/png). Importing the
// dist ESM directly skips the package main entry, which dynamically imports
// `fs` and breaks Next's webpack build.
export { exifr };

export const EXIFR_OPTIONS = {
  tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true,
  ifd0: true, ifd1: true, exif: true, gps: true, interop: false,
  makerNote: false, userComment: true, // UserComment is a privacy field; surface it
  translateKeys: true, translateValues: true, reviveValues: true,
  sanitize: true, mergeOutput: true, silentErrors: true,
};

/** XMP keys CapyStrip surfaces from the merged record into its `xmp` view. */
const XMP_KEYS = [
  "CreatorTool",
  "DigitalSourceType",
  "DocumentAncestors",
  "DerivedFrom",
  "Creator",
  "Rights",
  "WebStatement",
] as const;

/**
 * Fingerprint strings worth reporting. Deliberately specific — no generic
 * words like "prompt" or "AI" that would false-positive on ordinary photos.
 * "JFIF" is excluded on purpose: every canvas-encoded JPEG carries it as a
 * container tag, and the verification re-scan must stay quiet.
 */
const MARKER_STRINGS = [
  "trainedAlgorithmicMedia",
  "compositeWithTrainedAlgorithmicMedia",
  "algorithmicMedia",
  "compositeSynthetic",
  "c2pa",
  "jumb",
  "contentauth",
  "DocumentAncestors",
  "DerivedFrom",
  "Negative prompt:",
  "Steps:",
  "Sampler:",
  "Midjourney",
  "NovelAI",
  "Firefly",
  "DALL",
  "Stable Diffusion",
  "StableDiffusion",
  "runwayml",
  "Sora",
] as const;

/** Manifests and prompts live near the head; the tail catches trailing XMP. */
const HEAD_BYTES = 3 * 1024 * 1024;
const TAIL_BYTES = 1024 * 1024;

/** Latin1 view of the scan window (head + tail). No regex — linear only. */
function markerWindow(bytes: Uint8Array): string {
  const headEnd = Math.min(bytes.length, HEAD_BYTES);
  let text = latin1Range(bytes, 0, headEnd);
  if (bytes.length > HEAD_BYTES + TAIL_BYTES) {
    text += latin1Range(bytes, bytes.length - TAIL_BYTES, bytes.length);
  }
  return text;
}

function latin1Range(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function containsAscii(bytes: Uint8Array, start: number, end: number, needle: string): boolean {
  const limit = end - needle.length;
  outer: for (let i = start; i <= limit; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle.charCodeAt(j)) continue outer;
    }
    return true;
  }
  return false;
}

/** JPEG APP11 (FF EB) segment carrying JUMBF — the C2PA container. */
function hasJpegApp11Jumbf(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length - 4, HEAD_BYTES);
  for (let i = 0; i < limit; i++) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xeb) continue;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) continue;
    const dataStart = i + 4;
    const dataEnd = Math.min(dataStart + length - 2, bytes.length);
    // A real APP11 payload is a JUMBF superbox: the "JP" header box, "jumb"
    // box types and "c2pa" content types all appear inside it. Random
    // entropy data can form FF EB, but not these strings within it.
    if (
      containsAscii(bytes, dataStart, dataEnd, "jumb") ||
      containsAscii(bytes, dataStart, dataEnd, "c2pa") ||
      (bytes[dataStart] === 0x4a && bytes[dataStart + 1] === 0x50) // "JP"
    ) {
      return true;
    }
    i += 2 + length - 1; // jump past the segment (the loop's i++ lands on the next marker)
  }
  return false;
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
  );
}

/**
 * C2PA presence only — parsing claims is out of scope. JPEG → APP11, PNG →
 * caBX chunk, WebP → c2pa inside the RIFF container.
 */
export function detectC2pa(bytes: Uint8Array, text: string): C2paPresence {
  if (findPngChunk(bytes, "caBX")) return "caBX";
  if (hasJpegApp11Jumbf(bytes)) return "app11";
  if (isWebp(bytes) && text.includes("c2pa")) return "riff";
  return null;
}

export function scanMarkers(bytes: Uint8Array): { c2pa: C2paPresence; markers: string[] } {
  const text = markerWindow(bytes);
  const markers: string[] = [];
  for (const needle of MARKER_STRINGS) {
    if (text.includes(needle)) markers.push(needle);
  }
  return { c2pa: detectC2pa(bytes, text), markers };
}

function iccPresentIn(bytes: Uint8Array, text: string, kind: ImageKind, merged?: Record<string, unknown>): boolean {
  if (merged) {
    for (const key of Object.keys(merged)) {
      // ICC block keys arrive PascalCase: ProfileDescription, ProfileClass, …
      if (key.startsWith("Profile") || key === "ColorSpaceData") return true;
    }
  }
  if (text.includes("ICC_PROFILE")) return true; // JPEG APP2
  if (kind === "png" && findPngChunk(bytes, "iCCP")) return true;
  return false;
}

export async function readRawMetadata(file: Blob): Promise<RawMetadata> {
  const kind = await sniffImageKind(file);
  const raw: RawMetadata = {
    kind,
    fileName: file instanceof File ? file.name : "",
    byteSize: file.size,
    gps: null,
    iccPresent: false,
    thumbnailPresent: false,
    c2pa: null,
    markers: [],
  };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = markerWindow(bytes);

  // PNG text chunks (A1111 prompts, ComfyUI workflows, NovelAI metadata) —
  // exifr does not read them, so this walker is the only way in.
  if (kind === "png") {
    try {
      raw.pngText = await readPngText(bytes);
    } catch {
      // a broken chunk stream must not kill the report
    }
  }

  try {
    const merged = await exifr.parse(file, EXIFR_OPTIONS);
    if (merged) {
      raw.exif = merged;
      const xmp: Record<string, unknown> = {};
      for (const key of XMP_KEYS) {
        if (merged[key] !== undefined) xmp[key] = merged[key];
      }
      if (Object.keys(xmp).length > 0) raw.xmp = xmp;
    }
  } catch {
    // unreadable EXIF is a report about nothing, not a crash
  }

  // Decimal GPS for the location card — no DMS array reverse-engineering.
  try {
    raw.gps = await exifr.gps(file);
  } catch {
    raw.gps = null;
  }

  // mergeOutput silently disables ifd1, so the merged parse never carries the
  // thumbnail block — ask the dedicated helper instead.
  try {
    raw.thumbnailPresent = Boolean(await exifr.thumbnail(file));
  } catch {
    raw.thumbnailPresent = false;
  }

  raw.iccPresent = iccPresentIn(bytes, text, kind, raw.exif);

  const { c2pa, markers } = scanMarkers(bytes);
  raw.c2pa = c2pa;
  raw.markers = markers;

  return raw;
}
