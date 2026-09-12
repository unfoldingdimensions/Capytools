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

import type { EccLevel } from "./types";

/** Module count for this payload at this correction level; null = too much data. */
export function moduleCountFor(value: string, ec: EccLevel): number | null {
  try {
    const qr = qrcode(0, ec);
    qr.addData(value, "Byte");
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
