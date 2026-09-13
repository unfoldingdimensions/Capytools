/**
 * The UTF-8 bridge between payloads and the engine.
 *
 * The engine's Byte mode eats exactly one character per byte — its bundled
 * encoder truncates every char with `charCodeAt & 0xff` (Latin-1), and the
 * engine cannot be reached by overriding the standalone qrcode-generator
 * module because the encoder is inlined into its bundle. So multibyte text
 * (é, 中文, emoji) only reaches a phone intact if it arrives at the engine
 * already shaped like its own UTF-8 bytes: one Latin-1 char per byte.
 *
 * Phones decode Byte mode as UTF-8 per the spec, so the round trip is
 * original text → UTF-8 bytes → engine → code → phone → original text.
 * ASCII input is byte-identical and passes through unchanged.
 */

const CHUNK = 0x8000;

export function toEngineByteString(text: string): string {
  const bytes = new TextEncoder().encode(text);
  // Chunked because one spread over a multi-thousand-element array can
  // overflow the call stack; the guard must not depend on payload size.
  let out = "";
  for (let at = 0; at < bytes.length; at += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(at, at + CHUNK));
  }
  return out;
}
