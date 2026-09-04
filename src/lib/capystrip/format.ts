/**
 * Pure formatting helpers — no browser APIs, all unit-testable.
 */

/** 0.004 → "1/250 s". Values ≥ 1 s render as whole/decimal seconds. */
export function formatExposure(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return String(seconds);
  if (seconds >= 1) return `${trimFraction(seconds)} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

function trimFraction(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * [40, 44, 54.4], "N" → decimal degrees. South and west are negative.
 * (exifr's `gps()` already yields decimals; this is for original DMS arrays.)
 */
export function dmsToDecimal(dms: [number, number, number], ref?: string): number {
  const [deg, min, sec] = dms;
  const decimal = deg + min / 60 + sec / 3600;
  const hemisphere = (ref ?? "").trim().toUpperCase();
  return hemisphere === "S" || hemisphere === "W" ? -decimal : decimal;
}

/**
 * 40.7484 → "40° 44′ 54.4″ N" (latitude) or "… E" (longitude).
 * Seconds carry one decimal, which is ~3 m of precision — plenty to be
 * frightened of, no more than is honest.
 */
export function formatGpsDms(value: number, axis: "lat" | "lon"): string {
  const hemisphere = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}° ${min}′ ${sec}″ ${hemisphere}`;
}

/** 512 → "512 B", 2048 → "2.0 KB", 5 MB → "5.0 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * IPTC DigitalSourceType coded terms → calm labels. Vocabulary from the IPTC
 * Digital Source Type NewsCodes; unknown non-empty values render as-is.
 */
const DIGITAL_SOURCE_LABELS: Record<string, string> = {
  trainedAlgorithmicMedia: "Made with generative AI (model trained on sampled content)",
  compositeWithTrainedAlgorithmicMedia: "Composite that includes generative AI",
  algorithmicMedia: "Made algorithmically (not AI-trained)",
  compositeSynthetic: "Composite of synthetic sources",
  digitalCapture: "Digital camera capture",
  minorHumanEdits: "Camera capture, minor edits",
  majorHumanEdits: "Camera capture, major edits",
  screenCapture: "Screen capture",
  digitalArt: "Digital art",
  data: "Data",
};

export function digitalSourceLabel(value: string): string {
  return DIGITAL_SOURCE_LABELS[value] ?? value;
}

/** True when an IPTC source type is an AI-generation declaration. */
const AI_SOURCE_TYPES = new Set([
  "trainedAlgorithmicMedia",
  "compositeWithTrainedAlgorithmicMedia",
  "algorithmicMedia",
  "compositeSynthetic",
]);

export function isAiSourceType(value: string): boolean {
  return AI_SOURCE_TYPES.has(value);
}

/** EXIF dates (already revived to Date by exifr) → "May 1, 2024, 12:34". */
export function friendlyDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return String(date);
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}
