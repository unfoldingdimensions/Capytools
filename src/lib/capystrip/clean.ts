import { readRawMetadata } from "./parse";
import type { CleanOptions, CleanResult, ImageKind, RawMetadata } from "./types";

/**
 * The cleaning pipeline: decode through <img> (browsers apply EXIF
 * orientation to <img> pixels by default, so the redraw keeps the rotation
 * and loses everything else), draw onto a fresh canvas, re-encode, then
 * RE-SCAN the output to prove it's clean. A canvas bitmap carries no
 * metadata — the re-scan exists to show that, not to fix anything.
 */

export class CleanUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CleanUnsupportedError";
  }
}

/** Calm copy shown when a browser can't redraw HEIC. */
export const HEIC_UNSUPPORTED_MESSAGE =
  "Safari can redraw HEIC; this browser can only read its papers. The report is still complete — there's just no clean copy to download here.";

export const TIFF_UNSUPPORTED_MESSAGE =
  "Browsers can't decode TIFF, so there's nothing to redraw. The report above is the whole story.";

/**
 * The encode matrix as a pure decision, so the fallbacks are testable
 * without a browser: source kind + WebP-encode capability → output mime.
 */
export function decideOutputMime(
  kind: ImageKind,
  webpEncodeOk: boolean,
): { mimeType: string; note?: string } {
  switch (kind) {
    case "jpeg":
      return { mimeType: "image/jpeg" };
    case "png":
      return { mimeType: "image/png" };
    case "webp":
      // Safari accepts "image/webp" and silently writes PNG — feature-detect.
      return webpEncodeOk
        ? { mimeType: "image/webp" }
        : { mimeType: "image/png", note: "This browser can't export WebP — saved as PNG instead." };
    case "avif":
      // No browser ships a canvas AVIF encoder.
      return { mimeType: "image/png", note: "AVIF export isn't available in browsers — saved as PNG." };
    case "heic":
      // Safari decodes HEIC; nothing encodes it. Let the decode attempt decide —
      // cleanImage throws HEIC_UNSUPPORTED_MESSAGE where the decode fails.
      return { mimeType: "image/jpeg", note: "HEIC export isn't available in browsers — saved as JPEG." };
    case "tiff":
      throw new CleanUnsupportedError(TIFF_UNSUPPORTED_MESSAGE);
    default:
      throw new CleanUnsupportedError("This browser can't redraw that format. The report above is the whole story.");
  }
}

/** Feature-detect whether canvas.toBlob/toDataURL really produces WebP. */
export function webpEncodeSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * img.decode() is the right call — it guarantees the bitmap is paintable, and
 * browsers bake EXIF orientation into it — but it can stay pending forever in a
 * throttled or unpainted tab, which strands cleanImage with nothing to show.
 * Race it against the load event and a ceiling so a stall becomes a message.
 */
function decoded(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("load failed"));
  });
  // ponytail: fixed ceiling. Raise it if slow devices start losing big photos.
  let timer: ReturnType<typeof setTimeout>;
  const ceiling = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("decode timed out")), DECODE_TIMEOUT_MS);
  });
  return Promise.race([img.decode(), loaded, ceiling]).then(
    () => { clearTimeout(timer); },
    (err) => { clearTimeout(timer); throw err; },
  );
}

function toBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Container header keys that every normally-encoded file carries — JFIF
 * version/density and PNG IHDR dimensions — plus the entire ICC profile
 * block. Browsers stamp canvas output with their own generic sRGB profile
 * (the source ICC never survives a redraw), so in the verification re-scan
 * the whole ICC block is encoder plumbing, the same class of thing as the
 * literal "JFIF" string. These are the translated key names of exifr's ICC
 * dictionary; unknown vendor tags would surface as raw 4-char codes, which
 * real encoder profiles don't emit. (The block only appears in the rescan
 * because exifr runs with jfif/ihdr/icc enabled, which the report wants for
 * real files.)
 */
const CONTAINER_KEYS = new Set([
  // JPEG APP0 (JFIF)
  "JFIFVersion", "ResolutionUnit", "XResolution", "YResolution", "ThumbnailWidth", "ThumbnailHeight",
  // PNG IHDR
  "ImageWidth", "ImageHeight", "BitDepth", "ColorType", "Compression", "Filter", "Interlace",
]);

const ICC_KEYS = new Set([
  "BlueMatrixColumn", "BlueTRC", "CMMFlags", "CRDInfo", "CalibrationDateTime", "CharTarget",
  "ChromaticAdaptation", "Chromaticity", "ColorSpaceData", "ColorantOrder", "ColorantTable",
  "ColorantTableOut", "ColorimetricIntentImageState", "ConnectionSpaceIlluminant",
  "DeviceAttributes", "DeviceManufacturer", "DeviceMfgDesc", "DeviceModel", "DeviceModelDesc",
  "DeviceSettings", "FocalPlaneColorimetryEstimates", "Gamut", "GrayTRC", "GreenMatrixColumn",
  "GreenTRC", "Header", "Luminance", "MakeAndModel", "Measurement", "MediaBlackPoint",
  "MediaWhitePoint", "Metadata", "NamedColor", "NativeDisplayInfo", "OutputResponse",
  "PerceptualRenderingIntentGamut", "PrimaryPlatform", "ProfileCMMType", "ProfileClass",
  "ProfileConnectionSpace", "ProfileCopyright", "ProfileCreator", "ProfileDateTime",
  "ProfileDescription", "ProfileDescriptionML", "ProfileFileSignature", "ProfileHeader",
  "ProfileID", "ProfileSequenceDesc", "ProfileSequenceIdentifier", "ProfileVersion",
  "RedMatrixColumn", "RedTRC", "ReflectionHardcopyOrigColorimetry",
  "ReflectionPrintOutputColorimetry", "RenderingIntent", "SaturationRenderingIntentGamut",
  "SceneAppearanceEstimates", "SceneColorimetryEstimates", "Screening", "ScreeningDesc",
  "Technology", "UCRBG", "VideoCardGamma", "ViewingCondDesc", "ViewingConditions", "WCSProfiles",
]);

function stripContainerKeys(record?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!record) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (CONTAINER_KEYS.has(key) || ICC_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** The verification re-scan: true only when NOTHING user-generated was found. */
export function isVerificationClean(rescan: RawMetadata): boolean {
  return (
    isEmptyRecord(stripContainerKeys(rescan.exif)) &&
    isEmptyRecord(stripContainerKeys(rescan.xmp)) &&
    (rescan.pngText?.length ?? 0) === 0 &&
    rescan.c2pa === null &&
    rescan.markers.length === 0
  );
}

function isEmptyRecord(record?: Record<string, unknown>): boolean {
  return !record || Object.keys(record).length === 0;
}

const DIMENSION_GUARD = 8192;
const MAX_CANVAS_AREA = 16_777_216;
const DECODE_TIMEOUT_MS = 15_000;

export async function cleanImage(
  file: Blob,
  raw: RawMetadata,
  options?: CleanOptions,
): Promise<CleanResult> {
  const quality = options?.quality ?? 0.92;
  // The decision matrix throws for tiff/heic up front (report-only formats),
  // and picks the honest fallback mime for webp/avif.
  const { mimeType, note } = decideOutputMime(raw.kind, webpEncodeSupported());

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await decoded(img);
    } catch {
      throw new CleanUnsupportedError(
        raw.kind === "heic"
          ? HEIC_UNSUPPORTED_MESSAGE
          : "This browser couldn't decode the image — it may be corrupt or in an unusual color mode. The report is still complete.",
      );
    }

    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) {
      throw new CleanUnsupportedError("The image decoded to an empty size — nothing to redraw.");
    }

    // ponytail: fixed area cap, matched to the tightest mainstream limit
    // (Safari/iOS ~16.7 Mpx). Over it, toBlob returns a VALID blob of a blank
    // image, so the null-check below never fires and the re-scan of a blank
    // bitmap comes back "verified". Feature-detect per browser if this ever
    // turns real photos away.
    if (width * height > MAX_CANVAS_AREA) {
      throw new CleanUnsupportedError(
        "This photo is unusually large and this browser can't re-encode it safely. The report is still complete.",
      );
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new CleanUnsupportedError("Couldn't get a drawing surface from this browser.");
    ctx.drawImage(img, 0, 0);

    const blob = await toBlob(canvas, mimeType, quality);
    if (!blob) {
      // Very large canvases can fail silently; say the honest thing.
      throw new CleanUnsupportedError(
        width > DIMENSION_GUARD || height > DIMENSION_GUARD
          ? "This photo is unusually large and this browser couldn't re-encode it. The report is still complete."
          : "This browser couldn't re-encode the image. The report is still complete.",
      );
    }

    const notes: string[] = [];
    if (note) notes.push(note);
    if (raw.iccPresent) notes.push("Color profile flattened to sRGB.");

    // The trust moment: scan our own output. A canvas bitmap carries no
    // metadata, so this should always come back empty — verified proves it.
    const rescan = await readRawMetadata(blob);

    return {
      blob,
      mimeType,
      width,
      height,
      bytesBefore: file.size,
      bytesAfter: blob.size,
      verified: isVerificationClean(rescan),
      notes,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
