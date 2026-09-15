/**
 * The matrix oracle — how wide a code will be, before the engine draws it.
 *
 * qr-code-styling never exposes its module count, but its margin is in
 * pixels, so the quiet-zone slider needs the count to convert modules into
 * pixels. The standalone qrcode-generator (the engine's own dependency, fed
 * the same payload, the same Byte mode and the same correction level) answers
 * `getModuleCount()`, and its encoder truncates bytes the exact same way, so
 * the two always agree.
 *
 * Isomorphic on purpose: the tests run it in node.
 */

import qrcode from "qrcode-generator";

import { fileExtensionFor, type ExportFormat } from "./render";
import type { EccLevel } from "./types";
import { toEngineByteString } from "./utf8";

/** Module count for this payload at this correction level; null = too much data. */
export function moduleCountFor(value: string, ec: EccLevel): number | null {
  try {
    const qr = qrcode(0, ec);
    // The engine eats the UTF-8 byte-string (see utf8.ts) — the oracle must
    // count the same bytes or the quiet-zone math disagrees with the drawing.
    qr.addData(toEngineByteString(value), "Byte");
    qr.make();
    return qr.getModuleCount();
  } catch {
    // qrcode-generator throws "code length overflow" past the version's
    // capacity — a calm null, never a crash.
    return null;
  }
}

/** The QR version number (1–40) behind a module count; 0 when it cannot be one. */
export function versionForModuleCount(count: number): number {
  return count >= 21 && (count - 17) % 4 === 0 ? (count - 17) / 4 : 0;
}

/**
 * The friendly sizing line under the payload well: what the code's width will
 * be, or — when the payload does not fit — the honest word about it.
 */
export function capacityNote(value: string, ec: EccLevel): string {
  const count = moduleCountFor(value, ec);
  if (count === null) {
    return "this much data needs a quieter style or shorter text — it will not fit a scannable code.";
  }
  const version = versionForModuleCount(count);
  const suffix = version ? ` · version ${version}` : "";
  return `about ${count} modules wide${suffix}`;
}

/**
 * The export's spec sheet, printed beside the download: correction level,
 * width in modules, quiet zone in modules and the pixels it costs, and the
 * output size. Every number is a fact of the current render — nothing here
 * is an estimate.
 */
export function exportSpecLine(input: {
  ecc: EccLevel;
  moduleCount: number;
  quietModules: number;
  quietPx: number;
  size: number;
  format: ExportFormat;
}): string {
  const parts = [`error correction ${input.ecc}`];
  if (input.moduleCount > 0) parts.push(`${input.moduleCount} modules`);
  if (input.quietModules > 0) {
    parts.push(`quiet zone ${input.quietModules} (≈${Math.round(input.quietPx)} px)`);
  }
  parts.push(`${input.size}×${input.size} ${fileExtensionFor(input.format)}`);
  return parts.join(" · ");
}
