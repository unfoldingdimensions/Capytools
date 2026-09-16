/**
 * The Check mode's engine — WCAG 2.x and APCA, side by side, honestly.
 *
 * WCAG 2.x's contrast ratio is the conformance standard (the one the law
 * and the auditors read); APCA 0.1.9 is its modern complement — polarity
 * aware, better behaved in dark mode, font-size aware — but a WCAG 3
 * *candidate*, not a standard. The UI labels them exactly that way, and
 * this module never merges the two into one verdict.
 */

import { APCAcontrast, sRGBtoY } from "apca-w3";
import { converter, parse } from "culori";

import { contrastRatio } from "./engine/color";

const toRgb = converter("rgb");

/** The WCAG 2.x conformance thresholds, by name. */
export const WCAG_THRESHOLDS = {
  /** AA, body text. */
  aaNormal: 4.5,
  /** AA, large text (18.66px bold or 24px and up). */
  aaLarge: 3,
  /** AAA, body text. */
  aaaNormal: 7,
  /** AAA, large text. */
  aaaLarge: 4.5,
} as const;

export interface WcagVerdicts {
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

/**
 * APCA guidance bands (published Lc levels, |Lc|): 75 preferred body text,
 * 60 body minimum, 45 large text, 30 any-text minimum, 15 non-text only.
 * Guidance, not gates — the band names say so in the UI.
 */
export type ApcaBand =
  | "preferred-body"
  | "body-min"
  | "large"
  | "text-min"
  | "non-text"
  | "none";

export function apcaBandOf(lc: number): ApcaBand {
  const abs = Math.abs(lc);
  if (abs >= 75) return "preferred-body";
  if (abs >= 60) return "body-min";
  if (abs >= 45) return "large";
  if (abs >= 30) return "text-min";
  if (abs >= 15) return "non-text";
  return "none";
}

export interface CheckResult {
  /** The text colour, as given. */
  fg: string;
  /** The background colour, as given. */
  bg: string;
  /** WCAG 2.x relative contrast ratio, 1..21, unrounded. */
  wcagRatio: number;
  wcag: WcagVerdicts;
  /**
   * APCA 0.1.9 lightness contrast (Lc). Signed: positive is dark text on
   * a light ground, negative is light text on a dark ground — the sign is
   * the polarity, not a quality grade.
   */
  apcaLc: number;
  apcaBand: ApcaBand;
}

/** Parse any CSS colour into 0–255 sRGB channels; null when unparseable. */
function toRgb255(color: string): [number, number, number] | null {
  const parsed = parse(color.trim());
  if (!parsed) return null;
  const rgb = toRgb(parsed);
  if (!rgb) return null;
  return [
    Math.round(Math.min(1, Math.max(0, rgb.r)) * 255),
    Math.round(Math.min(1, Math.max(0, rgb.g)) * 255),
    Math.round(Math.min(1, Math.max(0, rgb.b)) * 255),
  ];
}

/**
 * Measure one text-on-background pair under both systems. Returns null
 * when either colour is unparseable — a bad input is the caller's to show,
 * not this module's to guess around.
 */
export function checkPair(fg: string, bg: string): CheckResult | null {
  const fgRgb = toRgb255(fg);
  const bgRgb = toRgb255(bg);
  if (!fgRgb || !bgRgb) return null;

  const wcagRatio = contrastRatio(fg, bg);
  const apcaLc = APCAcontrast(sRGBtoY(fgRgb), sRGBtoY(bgRgb));

  return {
    fg,
    bg,
    wcagRatio,
    wcag: {
      aaNormal: wcagRatio >= WCAG_THRESHOLDS.aaNormal,
      aaLarge: wcagRatio >= WCAG_THRESHOLDS.aaLarge,
      aaaNormal: wcagRatio >= WCAG_THRESHOLDS.aaaNormal,
      aaaLarge: wcagRatio >= WCAG_THRESHOLDS.aaaLarge,
    },
    apcaLc,
    apcaBand: apcaBandOf(apcaLc),
  };
}
