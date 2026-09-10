import type { A1111Parameters, PngTextChunk } from "./types";

/**
 * PNG chunk walking. exifr parses PNG's binary blocks (IHDR, eXIf, iCCP) but
 * does NOT read the text chunks (tEXt/iTXt/zTXt) — which is exactly where
 * A1111 prompts, ComfyUI workflows and NovelAI metadata live — so we walk the
 * chunk stream ourselves. The format is trivial: an 8-byte signature, then
 * [4-byte length][4-byte type][data][4-byte CRC] repeated until IEND.
 */

export interface PngChunk {
  type: string;
  data: Uint8Array;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Shown instead of a value when the browser lacks DecompressionStream. */
const INFLATE_UNAVAILABLE =
  "(compressed text — your browser can't inflate it, but the clean copy still removes it)";

function hasSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return SIGNATURE.every((b, i) => bytes[i] === b);
}

/** Walk the chunk stream, stopping at IEND (or at the first malformed chunk). */
export function walkPngChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  if (!hasSignature(bytes)) return chunks;

  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    const length = view.getUint32(0);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    // A length that runs past the file means the stream is truncated or not a
    // PNG at all — stop rather than trust it.
    if (dataStart + length > bytes.length) break;

    chunks.push({ type, data: bytes.subarray(dataStart, dataStart + length) });
    if (type === "IEND") break;
    offset = dataStart + length + 4; // +4 skips the CRC, which we never need
  }
  return chunks;
}

export function findPngChunk(bytes: Uint8Array, type: string): PngChunk | null {
  return walkPngChunks(bytes).find((chunk) => chunk.type === type) ?? null;
}

function latin1(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * Ceiling on inflated text, per file (not per chunk — see readPngText).
 *
 * Deflate reaches roughly 1032:1, so a ~4MB zTXt chunk expands to ~4GB. The
 * previous `new Response(stream).text()` buffered the whole thing with no
 * limit, and an out-of-memory abort is NOT catchable — the `try` below and the
 * caller's guard in parse.ts both miss it, and the tab dies. Since CapyStrip
 * exists to clean images someone else sent you, a hostile PNG is the expected
 * input, not the exotic one.
 *
 * 4MB is far above real payloads (an A1111 prompt is bytes; even a large
 * ComfyUI workflow is a few hundred KB) and far below anything that hurts.
 */
const MAX_INFLATED_BYTES = 4 * 1024 * 1024;

/** Shown instead of a value when a compressed chunk blows the ceiling above. */
const INFLATE_TOO_LARGE =
  "(compressed text too large to display — the clean copy still removes it)";

/**
 * Inflate a zlib stream, refusing to buffer more than `limit` bytes of output.
 * Returns null when the platform can't (or won't).
 */
async function inflate(data: Uint8Array, limit: number): Promise<string | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new Blob([data as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
    const reader = stream.getReader();
    const parts: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel();
        return INFLATE_TOO_LARGE;
      }
      parts.push(value);
    }
    const joined = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {
      joined.set(part, at);
      at += part.length;
    }
    return new TextDecoder("utf-8").decode(joined);
  } catch {
    return null;
  }
}

/**
 * Charge a chunk against the file budget. A chunk that BLEW the ceiling spent
 * the whole remaining budget, not the 60 bytes of the sentinel it returns —
 * otherwise a PNG carrying thousands of small bombs pays 4MB of inflation each
 * time and hangs the tab, which is the case the per-file budget exists for.
 */
function spend(budget: number, text: string | null): number {
  if (text === null) return budget;
  return text === INFLATE_TOO_LARGE ? 0 : budget - text.length;
}

/** Read every text chunk: tEXt (latin1), zTXt (zlib) and iTXt (utf-8, maybe zlib). */
export async function readPngText(bytes: Uint8Array): Promise<PngTextChunk[]> {
  const out: PngTextChunk[] = [];
  // Budget is per FILE, not per chunk: nothing caps how many zTXt chunks a PNG
  // may carry, so a per-chunk limit alone would just be paid 500 times over.
  let inflateBudget = MAX_INFLATED_BYTES;

  for (const chunk of walkPngChunks(bytes)) {
    if (chunk.type === "tEXt") {
      const nul = chunk.data.indexOf(0);
      if (nul < 0) continue;
      out.push({
        key: latin1(chunk.data, 0, nul),
        value: latin1(chunk.data, nul + 1, chunk.data.length),
        chunk: "tEXt",
      });
    } else if (chunk.type === "zTXt") {
      const nul = chunk.data.indexOf(0);
      // key\0 + compression-method byte (0 = zlib, the only defined method)
      if (nul < 0 || nul + 2 > chunk.data.length) continue;
      const text = await inflate(chunk.data.subarray(nul + 2), inflateBudget);
      inflateBudget = spend(inflateBudget, text);
      out.push({
        key: latin1(chunk.data, 0, nul),
        value: text ?? INFLATE_UNAVAILABLE,
        chunk: "zTXt",
      });
    } else if (chunk.type === "iTXt") {
      const nul = chunk.data.indexOf(0);
      if (nul < 0) continue;
      const key = latin1(chunk.data, 0, nul);
      // key\0 + compression-flag byte + compression-method byte + language\0 + translated\0 + text
      const compressionFlag = chunk.data[nul + 1];
      const compressionMethod = chunk.data[nul + 2];
      const langEnd = chunk.data.indexOf(0, nul + 3);
      if (langEnd < 0) continue;
      const translatedEnd = chunk.data.indexOf(0, langEnd + 1);
      if (translatedEnd < 0) continue;
      const textBytes = chunk.data.subarray(translatedEnd + 1);
      const compressed = compressionFlag === 1 && compressionMethod === 0;
      const text = compressed
        ? await inflate(textBytes, inflateBudget)
        : new TextDecoder("utf-8").decode(textBytes);
      if (compressed) inflateBudget = spend(inflateBudget, text);
      out.push({ key, value: text ?? INFLATE_UNAVAILABLE, chunk: "iTXt" });
    }
  }

  return out;
}

/**
 * The keys worth surfacing. Everything else is container noise the report
 * deliberately doesn't dump.
 */
const INTERESTING_KEYS = new Set([
  "parameters",
  "prompt",
  "workflow",
  "Comment",
  "Software",
  "Source",
  "Title",
  "Description",
  "XML:com.adobe.xmp",
]);

export function isInterestingPngKey(key: string): boolean {
  return INTERESTING_KEYS.has(key);
}

/**
 * Split an A1111 `parameters` value into prompt / negative prompt / settings.
 * The writer's layout is: the prompt (line 1), then a `Negative prompt:` line,
 * then a final comma-separated `Key: value, …` settings line.
 */
export function parseA1111Parameters(value: string): A1111Parameters {
  const lines = value.split(/\r?\n/);

  // The settings line is the LAST line reading as ≥2 comma-separated pairs —
  // requiring the comma keeps a one-line prompt that merely contains a colon
  // from being mistaken for settings.
  let settingsIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[A-Za-z][A-Za-z0-9 _]*: .+,\s*[A-Za-z][A-Za-z0-9 _]*: /.test(lines[i].trim())) {
      settingsIndex = i;
      break;
    }
  }

  const negativeIndex = lines.findIndex((line) => line.startsWith("Negative prompt:"));

  const promptEnd = negativeIndex >= 0 ? negativeIndex : settingsIndex >= 0 ? settingsIndex : lines.length;
  const prompt = lines.slice(0, promptEnd).join("\n").trim();

  let negativePrompt: string | null = null;
  if (negativeIndex >= 0) {
    const negEnd = settingsIndex > negativeIndex ? settingsIndex : lines.length;
    const parts = [lines[negativeIndex].slice("Negative prompt:".length).trim()];
    if (negEnd > negativeIndex + 1) parts.push(lines.slice(negativeIndex + 1, negEnd).join("\n").trim());
    const joined = parts.filter(Boolean).join("\n");
    negativePrompt = joined || null;
  }

  const settings = settingsIndex >= 0 ? lines[settingsIndex].trim() : null;

  return { prompt, negativePrompt, settings };
}
