/**
 * Start-color stops — "start my palette from ___".
 *
 * Every filter (hue families AND cross-cutting tags) gets a ladder of named
 * stops. A stop's hex is a PROMISE, not decoration: generateFromStop derives
 * hue, chroma AND lightness from it, so the generated field lands visually
 * on the tapped color (tests enforce closeness). Stop hexes are deliberately
 * drawn from colors that already pass the engine's guardrails.
 */

import type { FamilyFilter } from "./families";

export interface ColorStop {
  id: string;
  label: string;
  /** The color the palette starts from — honored in full by the generator. */
  hex: string;
  /** The phrase written into the mood box (also the share URL's ?mood=). */
  phrase: string;
}

export interface FamilyStops {
  /** Character flavor kept for grain defaults. */
  grain: number;
  stops: ColorStop[];
}

/**
 * All six filters carry stops. Phrases are tokenized before matching, so
 * "popping magenta" matches regardless of order/punctuation — keep every
 * phrase's token set unique across the table.
 */
export const START_COLORS: Record<Exclude<FamilyFilter, "all">, FamilyStops> = {
  warm: {
    grain: 0.32,
    stops: [
      { id: "coral", label: "Coral", hex: "#E07A5F", phrase: "warm coral" },
      { id: "orange", label: "Orange", hex: "#D96C3A", phrase: "warm orange" },
      { id: "amber", label: "Amber", hex: "#CE8352", phrase: "amber glow" },
      { id: "gold", label: "Gold", hex: "#DBA83E", phrase: "golden hour" },
      { id: "butter", label: "Butter", hex: "#EBC689", phrase: "butter light" },
    ],
  },
  cool: {
    grain: 0.38,
    stops: [
      { id: "ice", label: "Ice", hex: "#C9D3DE", phrase: "ice pale" },
      { id: "sky", label: "Sky", hex: "#8FB3AD", phrase: "open sky" },
      { id: "steel", label: "Steel", hex: "#5E88A6", phrase: "steel rain" },
      { id: "indigo", label: "Indigo", hex: "#4C4A73", phrase: "indigo dusk" },
      { id: "violet", label: "Violet", hex: "#8B87B0", phrase: "violet hour" },
    ],
  },
  nature: {
    grain: 0.34,
    stops: [
      { id: "mint", label: "Mint", hex: "#96C4AE", phrase: "mint morning" },
      { id: "sage", label: "Sage", hex: "#A3B18A", phrase: "sage air" },
      { id: "moss", label: "Moss", hex: "#5F8B4E", phrase: "moss depth" },
      { id: "fern", label: "Fern", hex: "#7FA33C", phrase: "fern light" },
      { id: "teal", label: "Teal", hex: "#3F7355", phrase: "deep teal" },
    ],
  },
  popping: {
    grain: 0.28,
    stops: [
      { id: "magenta", label: "Magenta", hex: "#C74FA8", phrase: "popping magenta" },
      { id: "red", label: "Poppy", hex: "#E0576B", phrase: "popping poppy" },
      { id: "gold", label: "Gold", hex: "#E8A81E", phrase: "festival gold" },
      { id: "lime", label: "Lime", hex: "#7FA33C", phrase: "lime surge" },
      { id: "cyan", label: "Surf", hex: "#4E93A6", phrase: "electric surf" },
    ],
  },
  soft: {
    grain: 0.2,
    stops: [
      { id: "blush", label: "Blush", hex: "#F2CDD5", phrase: "soft blush" },
      { id: "peach", label: "Peach", hex: "#F6DAC2", phrase: "soft peach" },
      { id: "mint", label: "Mint", hex: "#D2E7DC", phrase: "soft mint" },
      { id: "sky", label: "Sky", hex: "#D3DEEA", phrase: "soft sky" },
      { id: "lilac", label: "Lilac", hex: "#DFCFE8", phrase: "soft lilac" },
    ],
  },
  dusk: {
    grain: 0.42,
    // All-dark family, deliberately LIGHTNESS-SPREAD: if every stop sits at
    // the same near-black depth the chips read as identical dots. Each keeps
    // a dusk mood but occupies its own band of the darkness range.
    stops: [
      { id: "ember", label: "Ember", hex: "#6B3418", phrase: "deep ember" },
      { id: "plum", label: "Plum", hex: "#5C2E50", phrase: "plum night" },
      { id: "tide", label: "Tide", hex: "#2E5F58", phrase: "abyss tide" },
      { id: "slate", label: "Slate", hex: "#41415F", phrase: "storm night" },
      { id: "pine", label: "Pine", hex: "#28401F", phrase: "black pine" },
    ],
  },
};
