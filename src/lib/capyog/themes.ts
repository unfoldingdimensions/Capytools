/**
 * Accent × variant → card style tokens.
 *
 * The hex values are the same ones CardArt's PALETTE and tokens.css carry, so
 * a CapyOG card sits next to a Wrapped card and reads as the same house.
 *
 * One brand hex cannot serve three contrast roles at once, so the accent is
 * split by role and every pairing is asserted in tests/capyog.test.ts:
 *
 *  - `accent`     decoration only (the rule, the swatch dot) — the brand hex,
 *                 verbatim from tokens.css, no contrast duty.
 *  - `accentText` accent as TEXT or a glyph on `bg`, ≥ 4.5:1. In light mode the
 *                 brand hexes land at 2.25–4.65:1 on white, so light carries a
 *                 darkened shade of the same hue; dark mode already clears it.
 *  - `accentFill` accent as a FILL under `accentInk` (the tag pill), ≥ 4.5:1.
 *                 Only water/light needed a nudge: against `#5f7a72` even pure
 *                 black tops out at 4.42:1, so no dark ink could ever pass it.
 *
 * `accentInk` — the ink that goes ON an accent fill — is always the dark ink,
 * never white.
 */

import type { OgAccent, OgVariant } from "./types";

export interface OgTheme {
  bg: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  accentFill: string;
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

/** Same hue, darkened until it clears 4.5:1 as text on the light `bg`. */
const ACCENT_TEXT_LIGHT: Record<OgAccent, string> = {
  sage: "#6c7560",
  clay: "#9e6444",
  water: "#5d776f",
  gold: "#8f6c2b",
};

/** Fills that carry `accentInk` at 4.5:1 — only water/light differs. */
const ACCENT_FILL_LIGHT: Record<OgAccent, string> = {
  sage: "#8e9b7e",
  clay: "#c07952",
  water: "#69877e",
  gold: "#d9a441",
};

/** The dark ink, on every accent fill, in every variant (WCAG AA invariant). */
const ACCENT_INK = "#141412";

const SURFACES: Record<
  OgVariant,
  Omit<OgTheme, "accent" | "accentText" | "accentFill" | "accentInk">
> = {
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
  const hex = ACCENT_HEX[accent][variant];
  return {
    ...SURFACES[variant],
    accent: hex,
    // Dark mode's accents already clear both bars against #1e1e1e.
    accentText: variant === "light" ? ACCENT_TEXT_LIGHT[accent] : hex,
    accentFill: variant === "light" ? ACCENT_FILL_LIGHT[accent] : hex,
    accentInk: ACCENT_INK,
  };
}
