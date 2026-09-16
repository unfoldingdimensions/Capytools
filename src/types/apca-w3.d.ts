declare module "apca-w3" {
  /**
   * Ambient types for APCA 0.1.9 (the W3-compatible build), which ships
   * untyped. Only the functions CapyTone's Check mode uses.
   */

  /** 8-bit sRGB tuple, channels 0–255. */
  export type RgbTuple = number[];

  /**
   * The Accessible Perceptual Contrast Algorithm. Takes linearised Y
   * (luminance) for text and background — polarity matters: dark text on
   * a light ground is positive, light on dark is negative. Returns 0 on
   * out-of-range input.
   */
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;

  /** Linearised sRGB luminance (Y) from an 8-bit tuple. */
  export function sRGBtoY(rgb?: RgbTuple): number;

  /** Reverse lookup: the Lc needed for a font size/weight to pass. */
  export function fontLookupAPCA(contrast: number, places?: number): number[];

  /** Reverse lookup: the Y a colour needs for a target Lc. */
  export function reverseAPCA(contrast?: number, knownY?: number): number;
}
