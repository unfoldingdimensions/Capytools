/**
 * The shape of a quantize run.
 *
 * `QuantParams` is the preset-bundle type: one of these describes a whole
 * style, so a style chip can set everything at once and every slider edits
 * one field of a measured default.
 */

/** How the palette comes to be: derived from the image, or one of the built-ins. */
export type PaletteMethod = "median" | "kmeans" | "fixed";

/** The built-in palettes the suite ships. */
export type FixedPaletteId = "1bit" | "gameboy" | "whale";

/** How in-between tones are faked. `bayer` is contrast-modulated — see dither.ts. */
export type DitherMode = "none" | "bayer" | "floyd";

/** The six one-click styles. */
export type StyleId = "faithful" | "portrait" | "whale" | "gameboy" | "1bit" | "1bit-halftone";

export type RGB = [number, number, number];

export type Palette = RGB[];

/**
 * Everything one run needs. `grid`/`cell`/`gutter` do not change the indices —
 * they are part of the bundle because a style is a look, and pitch is part of
 * the look (a 70-cell 1-bit photograph and a 1000-cell one are different art).
 */
export interface QuantParams {
  palette: PaletteMethod;
  /** Which built-in ramp, when `palette` is "fixed". */
  fixedPalette: FixedPaletteId;
  /** Derived palette size. */
  colors: number;
  dither: DitherMode;
  /** Dither strength, 0..~2. */
  amount: number;
  /** The fraction of each bracket that dithers — 1 is the old screen, 0 is off. */
  band: number;
  /** Auto-levels: a 2%/98% percentile stretch before anything else. */
  levels: boolean;
  black: number;
  white: number;
  gamma: number;
  /** 1 is the image's own saturation; 0 is greyscale. */
  saturation: number;
  /** Tone bands: quantise Oklab L into N flat steps. 0 = off. */
  bands: number;
  /** Palette bins: derive from a coarse lattice. 0 = off. */
  bins: number;
  outline: boolean;
  /** Outline sensitivity as a percentile of this image's own gradients. */
  outlineThreshold: number;
  /** Outline weight in cells. */
  outlineThickness: number;
  /** Cells across — part of the style bundle. */
  grid: number;
  /** Export cell pitch in px. */
  cell: number;
  /** Gap between cells in px; > 0 only for tiled/logo styles. */
  gutter: number;
}

/** What a run reports about itself — the numbers behind the guard hints. */
export interface Metrics {
  /** Adjacent cell pairs sharing an entry: high is solid, ~0.5 is a screen. */
  flatness: number;
  /** Clearly-chromatic cells whose warm/cool ordering the palette inverted. */
  hueFlipRate: number;
  /** Mean squared Oklab error against the (pre-passed) source grid. */
  oklabError: number;
  /** Share of cells held by the most-used palette entry — the starvation signal. */
  largestShare: number;
}

export interface QuantResult {
  indices: Uint8Array;
  palette: Palette;
  metrics: Metrics;
}
