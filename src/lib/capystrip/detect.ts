import type { ImageKind } from "./types";

/**
 * Sniff the file's real format from its magic bytes. Extensions lie; the first
 * sixteen bytes of a file do not.
 */

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "hevm", "hevs", "mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

export async function sniffImageKind(file: Blob): Promise<ImageKind> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  // JPEG: FF D8 FF
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head.length >= 8 &&
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
    head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: "RIFF" at 0..4 and "WEBP" at 8..12
  if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP") return "webp";

  // ISOBMFF family: "ftyp" at 4..8, brand at 8..12
  if (head.length >= 12 && ascii(head, 4, 4) === "ftyp") {
    const brand = ascii(head, 8, 4);
    if (HEIC_BRANDS.has(brand)) return "heic";
    if (AVIF_BRANDS.has(brand)) return "avif";
    return "unknown";
  }

  // TIFF: little-endian "II*\0" or big-endian "MM\0*"
  if (
    head.length >= 4 &&
    ((head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0x00) ||
      (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00 && head[3] === 0x2a))
  ) {
    return "tiff";
  }

  return "unknown";
}
