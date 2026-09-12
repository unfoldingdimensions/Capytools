import type { InputKind } from "./types";

/**
 * What a dropped file actually is, from its first bytes — extensions lie, and
 * so does a `File`'s reported type half the time. The magic bytes win; the
 * reported type is only asked for SVG, which has no magic header to speak of.
 *
 * Pure so the table tests in node can feed it fixtures byte by byte.
 */

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/** `image/svg+xml` or a leading `<svg` / `<?xml` after a BOM and whitespace. */
function looksLikeSvg(bytes: Uint8Array, reportedType: string): boolean {
  if (reportedType === "image/svg+xml") return true;
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  while (start < bytes.length && (bytes[start] === 0x20 || bytes[start] === 0x09 || bytes[start] === 0x0a || bytes[start] === 0x0d)) {
    start += 1;
  }
  return ascii(bytes, start, 5) === "<svg " || ascii(bytes, start, 5) === "<?xml";
}

export function sniffImageKind(bytes: Uint8Array, reportedType: string): InputKind {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" / "GIF89a"
  const gif = ascii(bytes, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") return "gif";

  // WebP: "RIFF" at 0..4 and "WEBP" at 8..12
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";

  // ISOBMFF family: "ftyp" at 4..8, brand at 8..12 — AVIF only; HEIC is
  // undecodable in most browsers and gets called unknown rather than promised.
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
    return "unknown";
  }

  // BMP: "BM"
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";

  // ICO: reserved u16 = 0, type u16 = 1 (little-endian)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00
  ) {
    return "ico";
  }

  if (looksLikeSvg(bytes, reportedType)) return "svg";

  return "unknown";
}

/**
 * Animated-GIF hint: more than one Graphic Control Extension (21 F9 04) means
 * frames beyond the first — and canvas always takes the first frame by spec.
 * A byte scan, not a parse; a false positive costs one honest note.
 */
export function isAnimatedGif(bytes: Uint8Array): boolean {
  let extensions = 0;
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
      extensions += 1;
      if (extensions > 1) return true;
    }
  }
  return false;
}
