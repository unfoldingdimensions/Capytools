/**
 * Accent × variant → card style tokens.
 *
 * The hex values are the same ones CardArt's PALETTE and tokens.css carry, so
 * a CapyOG card sits next to a Wrapped card and reads as the same house. The
 * one WCAG invariant that shapes the type: `accentInk` — the ink that goes ON
 * an accent fill — is always the dark ink, never white.
 */

import type { OgAccent, OgVariant } from "./types";

export interface OgTheme {
  bg: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
  accentInk: string;
  track: string;
}

/** Light/dark accents straight from tokens.css. */
const ACCENT_HEX: Record<OgAccent, Record<OgVariant, string>> = {
  sage: { light: "#8e9b7e", dark: "#9aab8d" },
  clay: { light: "#c07952", dark: "#d68f66" },
  water: { light: "#5f7a72", dark: "#7fa9a3" },
  gold: { light: "#d9a441", dark: "#e3b25e" },
};

/** The dark ink, on every accent, in every variant (WCAG AA invariant). */
const ACCENT_INK = "#141412";

const SURFACES: Record<OgVariant, Omit<OgTheme, "accent" | "accentInk">> = {
  light: {
    bg: "#ffffff",
    ink: "#1a1a1a",
    muted: "#6f6c66",
    border: "#e7e4dd",
    track: "rgba(26,26,26,0.05)",
  },
  dark: {
    bg: "#1e1e1e",
    ink: "#e8e6e2",
    muted: "#a09e98",
    border: "#2e2d2a",
    track: "rgba(255,255,255,0.06)",
  },
};

export function accentTokens(accent: OgAccent, variant: OgVariant): OgTheme {
  return {
    ...SURFACES[variant],
    accent: ACCENT_HEX[accent][variant],
    accentInk: ACCENT_INK,
  };
}
