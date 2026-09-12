/**
 * The honesty layer — the four quiet numbers a styled QR code can fail on.
 *
 * None of these are ISO thresholds (no ISO threshold exists for contrast or
 * logo size; ISO/IEC 18004 only fixes the 4-module quiet zone). They are
 * rules of thumb the UI labels as such. What is not a rule of thumb is the
 * proof scan: jsQR over the rendered canvas, in verify.ts.
 */

import type { EccLevel } from "./types";

/** "ok" | "soft" — worth a nudge | "hard" — many phones will refuse it. */
export type GuardBand = "ok" | "soft" | "hard";

/** WCAG-style contrast ratio between two hex colors (3- or 6-digit). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string): number => {
    const full =
      hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;
    const channels = [1, 3, 5].map((at) => parseInt(full.slice(at, at + 2), 16) / 255);
    const [r, g, b] = channels.map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(hexA);
  const b = lum(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** <2:1 refuses outright; <3:1 phones may hesitate; else fine. */
export function contrastBand(ratio: number): GuardBand {
  if (ratio < 2) return "hard";
  if (ratio < 3) return "soft";
  return "ok";
}

export const CONTRAST_COPY: Record<GuardBand, string> = {
  ok: "contrast is comfortable — the code reads at a glance.",
  soft: "contrast is under 3:1 — phones may hesitate. bump it above 3:1.",
  hard: "contrast is under 2:1 — many phones will refuse this. raise it above 3:1.",
};

/**
 * The quiet zone in pixels for the engine's `margin`, at the export size.
 * ISO/IEC 18004 asks for four modules on all sides; the engine speaks pixels,
 * so modules × (size / moduleCount) is the conversion.
 */
export function quietZonePx(sizePx: number, moduleCount: number, quietModules: number): number {
  if (moduleCount <= 0 || sizePx <= 0) return 0;
  return quietModules * (sizePx / moduleCount);
}

export function quietBand(quietModules: number): GuardBand {
  if (quietModules < 2) return "hard";
  if (quietModules < 4) return "soft";
  return "ok";
}

export const QUIET_COPY: Record<GuardBand, string> = {
  ok: "quiet zone is at the spec's four modules.",
  soft: "quiet zone is tight — 2–3 modules scan, but 4 is the spec.",
  hard: "quiet zone is under 2 modules — phones read the page into the code. slide it back up.",
};

/**
 * Community guidance pairs logos with H correction (~30% codeword recovery).
 * Consensus, not spec.
 *
 * There is no "logo too big" note: the engine is pinned to the README's 0.4
 * anchor in `buildEngineOptions` and nothing can move it, so a size warning
 * would be a branch no user could ever reach. It belongs back here the day a
 * size control does.
 */
export function logoAdvice(hasLogo: boolean, ecc: EccLevel): string[] {
  if (!hasLogo) return [];
  const notes: string[] = [];
  if (ecc === "H") {
    notes.push("error correction is at H — about 30% of the code can be covered and still scan.");
  } else {
    notes.push("a logo covers data modules — raise error correction to H so the code still reads.");
  }
  return notes;
}
