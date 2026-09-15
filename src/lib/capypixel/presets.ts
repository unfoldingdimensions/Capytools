/**
 * The six styles, each one measured parameter bundle from the prototype
 * (capypixel/c1-pixel-quantizer/index.html STYLES + RESULTS.md). Every value
 * below is benchmarked — do not "fix" them. The ones that look odd are the
 * ones a measured failure bought:
 *
 * - 1-bit: band 0.35 with black 0.26 / white 0.74 at grid 70 scored flatness
 *   0.817 on the test portrait; the old full-amplitude screen scored 0.59 —
 *   that was a halftone, not 1-bit art.
 * - portrait: dither off + auto-levels bought +39% edge selectivity and −60%
 *   hue-flips; bins 8 cut mis-hued cells a further 4.8×; the outline draws the
 *   separation. Tone bands made the portrait worse and stay off.
 * - whale: levels on because the ramp is dark-weighted by design (it tops out
 *   at Oklab L 0.75 — it cannot represent white unmapped).
 *
 * The prototype's faithful/portrait/whale bundles leave the grid to the user;
 * the grids here are the ones the reference stills were shot at
 * (photo-*-150c, logo-whale-120c), so a style chip lands on the look the
 * measurements describe.
 */

import type { QuantParams, StyleId } from "./types";

export interface StylePreset {
  id: StyleId;
  /** The chip's label. */
  label: string;
  /** The one-line explanation under the chips — what it is for and, where it
   *  matters, what it is not for. */
  blurb: string;
  params: QuantParams;
}

const BASE: QuantParams = {
  palette: "median",
  fixedPalette: "1bit",
  colors: 16,
  dither: "bayer",
  amount: 1,
  band: 1,
  levels: false,
  black: 0,
  white: 1,
  gamma: 1,
  saturation: 1,
  bands: 0,
  bins: 0,
  outline: false,
  outlineThreshold: 0.07,
  outlineThickness: 1,
  grid: 150,
  cell: 4,
  gutter: 0,
};

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  faithful: {
    id: "faithful",
    label: "faithful",
    blurb: "natural colours taken from the image itself — the safe starting point for a photograph.",
    params: { ...BASE },
  },
  portrait: {
    id: "portrait",
    label: "portrait",
    blurb:
      "for a subject against a busy background: more colours, dither off, palette bins on, an outline to pull the subject forward.",
    params: {
      ...BASE,
      palette: "median",
      colors: 24,
      dither: "none",
      amount: 0,
      levels: true,
      bins: 8,
      outline: true,
    },
  },
  whale: {
    id: "whale",
    label: "whale",
    blurb:
      "the seven-blue brand ramp with visible tile gaps — drawn for a pale shape on a dark background, not a filter for any photo.",
    params: {
      ...BASE,
      palette: "fixed",
      fixedPalette: "whale",
      band: 1,
      levels: true,
      saturation: 0.25,
      gutter: 1,
      grid: 120,
    },
  },
  gameboy: {
    id: "gameboy",
    label: "game boy",
    blurb: "the four greens of the original game boy screen.",
    params: {
      ...BASE,
      palette: "fixed",
      fixedPalette: "gameboy",
      dither: "bayer",
      band: 0.5,
      saturation: 0,
      black: 0.2,
      white: 0.8,
      grid: 110,
    },
  },
  "1bit": {
    id: "1bit",
    label: "1-bit",
    blurb:
      "pure black and white — large solid areas, dither only where tones change. the coarse grid is part of the look.",
    params: {
      ...BASE,
      palette: "fixed",
      fixedPalette: "1bit",
      band: 0.35,
      saturation: 0,
      black: 0.26,
      white: 0.74,
      grid: 70,
    },
  },
  "1bit-halftone": {
    id: "1bit-halftone",
    label: "1-bit halftone",
    blurb:
      "a fine dot screen, like newspaper print — a real look, and honestly a halftone rather than 1-bit drawing.",
    params: {
      ...BASE,
      palette: "fixed",
      fixedPalette: "1bit",
      band: 1,
      levels: true,
      saturation: 0,
      grid: 700,
    },
  },
};

/** Chip order — from "give me my photo back" to "give me a look". */
export const STYLE_ORDER: StyleId[] = [
  "faithful",
  "portrait",
  "whale",
  "gameboy",
  "1bit",
  "1bit-halftone",
];
