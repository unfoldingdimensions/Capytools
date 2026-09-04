import { buildReport } from "./report";
import type { RawMetadata } from "./types";

/**
 * The idle-state card — a hand-made report that teaches the tool before you
 * give it a file (repo pattern: DEMO_STATS). A plausible phone-ish camera, a
 * Madrid GPS fix (capybara-free zone; they're South American), the usual
 * camera settings, and one A1111 prompt fingerprint so the AI-signal card has
 * something to say.
 */
const DEMO_RAW: RawMetadata = {
  kind: "jpeg",
  fileName: "IMG_4128.jpg",
  byteSize: 3_145_728,
  exif: {
    Make: "Capybara CyberShot Corp.",
    Model: "Capyber-shot DSC-H300",
    BodySerialNumber: "2718281828",
    DateTimeOriginal: new Date(2026, 7, 12, 18, 42),
    Software: "Adobe Lightroom Classic",
    UserComment: "shot from the hostel window, before the rain",
    ExposureTime: 0.004,
    FNumber: 2.8,
    ISO: 200,
    FocalLength: 24,
    ExifImageWidth: 4032,
    ExifImageHeight: 3024,
  },
  xmp: {},
  gps: { latitude: 40.4168, longitude: -3.7038 },
  iccPresent: true,
  thumbnailPresent: true,
  c2pa: null,
  markers: ["Negative prompt:", "Steps:", "Sampler:"],
};

export const DEMO_REPORT = buildReport(DEMO_RAW, DEMO_RAW.fileName);
