import {
  digitalSourceLabel,
  formatBytes,
  formatExposure,
  friendlyDate,
  isAiSourceType,
} from "./format";
import { isInterestingPngKey, parseA1111Parameters } from "./png";
import type { FieldCategory, MetadataField, MetadataReport, RawMetadata, Verdict } from "./types";

/**
 * Raw bytes → the report card. Turns whatever survived parsing into labelled
 * fields (privacy / time / camera / software_ai / technical), AI-generation
 * signals, and a four-level verdict.
 */

export const VERDICT_COPY: Record<Verdict, string> = {
  chatty: "This photo has a lot to say.",
  quiet: "A few quiet details.",
  muted: "Barely a whisper.",
  blank: "This photo keeps its secrets.",
};

/** First defined value among candidate keys (exifr merges several blocks). */
function pick(record: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return friendlyDate(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function field(
  id: string,
  label: string,
  value: unknown,
  category: FieldCategory,
  critical: boolean,
): MetadataField | null {
  const text = formatValue(value);
  if (!text) return null;
  return { id, label, value: text, category, critical };
}

/** Fingerprint strings that name a generation tool → the friendly sentence. */
const TOOL_MARKERS: Record<string, string> = {
  Midjourney: "Midjourney",
  NovelAI: "NovelAI",
  Firefly: "Adobe Firefly",
  DALL: "DALL·E",
  "Stable Diffusion": "Stable Diffusion",
  StableDiffusion: "Stable Diffusion",
  runwayml: "Runway",
  Sora: "Sora",
};

const IPTC_VOCAB_MARKERS = new Set([
  "trainedAlgorithmicMedia",
  "compositeWithTrainedAlgorithmicMedia",
  "algorithmicMedia",
  "compositeSynthetic",
]);

const C2PA_CONTAINER_LABEL: Record<string, string> = {
  app11: "JPEG APP11 (JUMBF)",
  caBX: "PNG caBX chunk",
  riff: "WebP container",
};

function buildAiSignals(raw: RawMetadata): string[] {
  const signals = new Set<string>();

  // IPTC declaration — the signal the industry agreed to give us. Found via
  // XMP when it parses, or via the raw marker scan when it doesn't.
  const sourceType = formatValue(pick(raw.xmp, ["DigitalSourceType"]) ?? pick(raw.exif, ["DigitalSourceType"]));
  if (sourceType && isAiSourceType(sourceType)) {
    signals.add(`declared AI-generated (IPTC source type: ${digitalSourceLabel(sourceType)})`);
  } else {
    const vocabMarker = raw.markers.find((m) => IPTC_VOCAB_MARKERS.has(m));
    if (vocabMarker) {
      signals.add(`declared AI-generated (IPTC source type: ${digitalSourceLabel(vocabMarker)})`);
    }
  }

  // A1111 `parameters` chunk — prompt, negative and settings, embedded.
  const parameters = raw.pngText?.find((c) => c.key === "parameters");
  if (parameters) signals.add("carries a Stable Diffusion-style generation prompt (prompt and settings embedded)");

  // ComfyUI / NovelAI-style recipe chunks.
  const recipe = raw.pngText?.find(
    (c) => (c.key === "prompt" || c.key === "workflow") && isInterestingPngKey(c.key),
  );
  if (recipe) signals.add("carries a generation recipe (ComfyUI-style workflow metadata)");
  const novelAiComment = raw.pngText?.find(
    (c) => c.key === "Comment" && /NovelAI/i.test(c.value),
  );
  if (novelAiComment) signals.add("carries NovelAI generation metadata");

  // Content credentials.
  if (raw.c2pa) signals.add("content credentials present (C2PA)");

  // Photoshop-style editing lineage.
  if (pick(raw.xmp, ["DocumentAncestors"]) || pick(raw.exif, ["DocumentAncestors"]) ||
      pick(raw.xmp, ["DerivedFrom"]) || pick(raw.exif, ["DerivedFrom"])) {
    signals.add("edited with lineage metadata (Photoshop-style history)");
  }

  // Tool fingerprints in the raw bytes.
  for (const marker of raw.markers) {
    const tool = TOOL_MARKERS[marker];
    if (tool) signals.add(`mentions ${tool} in the file bytes`);
  }

  // Generation-settings text without a parseable parameters chunk — the
  // marker scan saw "Steps:/Sampler:" somewhere we couldn't structure.
  const hasSettingsMarkers = raw.markers.some((m) => m === "Steps:" || m === "Sampler:" || m === "Negative prompt:");
  if (hasSettingsMarkers && !parameters && !recipe) {
    signals.add("carries generation-recipe text (sampler settings in the file)");
  }

  return [...signals];
}

function collectFields(raw: RawMetadata): MetadataField[] {
  const exif = raw.exif;
  const xmp = raw.xmp;
  const fields: (MetadataField | null)[] = [];
  const hasGps = raw.gps != null;

  // ---- privacy ----
  if (raw.gps) {
    fields.push(
      field("location", "Location", `${raw.gps.latitude.toFixed(5)}, ${raw.gps.longitude.toFixed(5)}`, "privacy", true),
    );
  }
  fields.push(field("altitude", "Altitude", pick(exif, ["GPSAltitude"]), "privacy", true));
  fields.push(field("compass", "Compass direction", pick(exif, ["GPSImgDirection"]), "privacy", true));
  fields.push(field("camera-make", "Camera make", pick(exif, ["Make"]), "privacy", false));
  fields.push(field("camera-model", "Camera model", pick(exif, ["Model"]), "privacy", true));
  fields.push(field("body-serial", "Body serial", pick(exif, ["BodySerialNumber", "SerialNumber"]), "privacy", true));
  fields.push(field("lens-make", "Lens make", pick(exif, ["LensMake"]), "privacy", false));
  fields.push(field("lens-model", "Lens model", pick(exif, ["LensModel"]), "privacy", false));
  fields.push(field("lens-serial", "Lens serial", pick(exif, ["LensSerialNumber"]), "privacy", true));
  fields.push(field("artist", "Author", pick(exif, ["Artist", "By-line"]), "privacy", true));
  fields.push(field("copyright", "Copyright", pick(exif, ["Copyright", "CopyrightNotice", "Rights"]), "privacy", true));
  fields.push(field("credit", "Credit", pick(exif, ["Credit"]), "privacy", true));
  fields.push(field("comment", "Comment", pick(exif, ["UserComment"]), "privacy", true));
  fields.push(field("unique-id", "Unique ID", pick(exif, ["ImageUniqueID"]), "privacy", true));

  // ---- time ----
  // A timestamp next to a GPS fix is a where-AND-when leak; alone it's softer.
  fields.push(field("taken-at", "Taken at", pick(exif, ["DateTimeOriginal"]), "time", hasGps));
  fields.push(field("created", "Created", pick(exif, ["CreateDate"]), "time", hasGps));
  fields.push(field("modified", "Modified", pick(exif, ["ModifyDate"]), "time", hasGps));
  fields.push(field("utc-offset", "UTC offset", pick(exif, ["OffsetTime", "OffsetTimeOriginal"]), "time", hasGps));
  fields.push(field("gps-time", "GPS time", pick(exif, ["GPSTimeStamp"]), "time", hasGps));

  // ---- software & AI ----
  fields.push(field("software", "Software", pick(exif, ["Software"]) ?? pick(xmp, ["CreatorTool"]), "software_ai", false));
  const sourceType = pick(xmp, ["DigitalSourceType"]) ?? pick(exif, ["DigitalSourceType"]);
  fields.push(
    field(
      "ai-source",
      "AI source declaration",
      typeof sourceType === "string" ? digitalSourceLabel(sourceType) : sourceType,
      "software_ai",
      true,
    ),
  );
  fields.push(field("lineage", "Editing lineage", pick(xmp, ["DocumentAncestors"]) ?? pick(exif, ["DocumentAncestors"]), "software_ai", true));
  fields.push(field("derived-from", "Derived from", pick(xmp, ["DerivedFrom"]) ?? pick(exif, ["DerivedFrom"]), "software_ai", true));

  if (raw.pngText) {
    const parametersChunk = raw.pngText.find((c) => c.key === "parameters");
    if (parametersChunk) {
      const a1111 = parseA1111Parameters(parametersChunk.value);
      const parts = [a1111.prompt];
      if (a1111.negativePrompt) parts.push(`Negative prompt: ${a1111.negativePrompt}`);
      if (a1111.settings) parts.push(a1111.settings);
      fields.push(field("generation-prompt", "Generation prompt", parts.filter(Boolean).join("\n\n"), "software_ai", true));
    }

    for (const chunk of raw.pngText) {
      if (chunk.key === "parameters") continue;
      if (!isInterestingPngKey(chunk.key)) continue;
      if (chunk.key === "Comment" && chunk.value.length > 200) {
        // NovelAI-style metadata: summarize rather than dump.
        fields.push(field("generation-recipe", "Generation recipe", `carries a ${formatBytes(chunk.value.length)} metadata comment`, "software_ai", true));
        continue;
      }
      if (chunk.key === "Software") {
        fields.push(field("png-software", "Software", chunk.value, "software_ai", false));
        continue;
      }
      const label =
        chunk.key === "prompt" || chunk.key === "workflow"
          ? "Generation recipe"
          : chunk.key === "XML:com.adobe.xmp"
            ? "XMP metadata"
            : chunk.key === "Title"
              ? "Title"
              : chunk.key === "Description"
                ? "Description"
                : chunk.key === "Source"
                  ? "Source"
                  : chunk.key;
      const value = chunk.key === "workflow" ? `workflow JSON (${formatBytes(chunk.value.length)})` : chunk.value;
      fields.push(field(`png-${chunk.key.toLowerCase()}`, label, value, "software_ai", chunk.key === "prompt" || chunk.key === "workflow"));
    }
  }

  if (raw.c2pa) {
    fields.push(field("c2pa", "Content credentials (C2PA)", `present — ${C2PA_CONTAINER_LABEL[raw.c2pa]}`, "software_ai", true));
  }

  // ---- camera settings ----
  fields.push(field("exposure", "Exposure", formatExposureValue(pick(exif, ["ExposureTime"])), "camera", false));
  fields.push(field("aperture", "Aperture", fNumber(pick(exif, ["FNumber"])), "camera", false));
  fields.push(field("iso", "ISO", pick(exif, ["ISO"]), "camera", false));
  fields.push(field("focal-length", "Focal length", focalLength(pick(exif, ["FocalLength"])), "camera", false));
  fields.push(
    field(
      "focal-35mm",
      "Focal length (35 mm)",
      focalLength(pick(exif, ["FocalLengthIn35mmFormat"])),
      "camera",
      false,
    ),
  );
  fields.push(field("flash", "Flash", pick(exif, ["Flash"]), "camera", false));
  fields.push(field("white-balance", "White balance", pick(exif, ["WhiteBalance"]), "camera", false));
  fields.push(field("metering", "Metering mode", pick(exif, ["MeteringMode"]), "camera", false));
  fields.push(field("exposure-bias", "Exposure bias", pick(exif, ["ExposureBiasValue"]), "camera", false));
  fields.push(field("orientation", "Orientation", pick(exif, ["Orientation"]), "camera", false));

  // ---- technical ----
  const width = pick(exif, ["ExifImageWidth", "ImageWidth", "PixelXDimension"]);
  const height = pick(exif, ["ExifImageHeight", "ImageHeight", "PixelYDimension"]);
  if (width && height) fields.push(field("dimensions", "Dimensions", `${width} × ${height}`, "technical", false));
  fields.push(field("color-mode", "Color mode", pick(exif, ["PhotometricInterpretation"]), "technical", false));
  fields.push(
    field("color-profile", "Color profile", pick(exif, ["ProfileDescription"]) ?? pick(exif, ["ColorSpaceData"]), "technical", false),
  );
  if (raw.thumbnailPresent) {
    fields.push(field("thumbnail", "Hidden thumbnail", "yes — an embedded preview image", "technical", false));
  }

  return fields.filter((f): f is MetadataField => f !== null);
}

function formatExposureValue(value: unknown): unknown {
  return typeof value === "number" ? formatExposure(value) : value;
}

function fNumber(value: unknown): unknown {
  return typeof value === "number" ? `f/${Math.round(value * 100) / 100}` : value;
}

function focalLength(value: unknown): unknown {
  return typeof value === "number" ? `${Math.round(value * 10) / 10} mm` : value;
}

function hasTraces(raw: RawMetadata): boolean {
  return (
    raw.iccPresent ||
    raw.thumbnailPresent ||
    raw.markers.length > 0 ||
    (raw.pngText?.length ?? 0) > 0 ||
    raw.c2pa !== null
  );
}

export function buildReport(raw: RawMetadata, fileName: string): MetadataReport {
  const fields = collectFields(raw);
  const chattyCount = fields.filter((f) => f.critical).length;

  let verdict: Verdict;
  if (chattyCount > 0) verdict = "chatty";
  else if (fields.length > 0) verdict = "quiet";
  else if (hasTraces(raw)) verdict = "muted";
  else verdict = "blank";

  return {
    fileName,
    kind: raw.kind,
    fields,
    gps: raw.gps ?? null,
    aiSignals: buildAiSignals(raw),
    chattyCount,
    verdict,
    byteSize: raw.byteSize,
  };
}
