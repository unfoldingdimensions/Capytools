/**
 * The document specs — the data that IS the product (plan §3.1, §5.1).
 *
 * Every row carries its authority source and the date its figures were last
 * checked, and the UI prints both. Figures change; provenance is not optional.
 * A unit test pins each shipped number to the plan's table so a typo cannot
 * ship, and asserts the head band is a sane subset of the frame.
 *
 * Provenance honesty: `fetched` rows were read off the authority's own page.
 * `surfaced` rows could not be fetched (travel.state.gov answers 403 to
 * automated checks, re-tried 2026-10-08) and are corroborated from published
 * summaries of that guidance — the UI says so, next to the "confirm on the
 * official site" line that every row gets anyway.
 */

export type BackgroundRule = "white" | "light" | "whiteOrLightGrey";

export type SpecProvenance = "fetched" | "surfaced";

export interface PhotoSpec {
  /** `"us-passport" | "uk-passport" | "schengen-visa"` — stable, testable. */
  id: string;
  /** The choice pill's label. */
  label: string;
  /** The printed frame, in millimetres. */
  physical: { wMm: number; hMm: number };
  /** The single digital file's pixel size (see digitalMin for the rule). */
  px: { w: number; h: number };
  /** The dpi every physical conversion in this tool assumes. */
  dpi: number;
  /** Chin → crown, as the authority measures it. */
  head: { minMm: number; maxMm: number };
  /** Eye line above the frame's BOTTOM edge (the US way of measuring it). */
  eyeLineFromBottom?: { minMm: number; maxMm: number };
  /** The digital file's published minimums. */
  digitalMin: { w: number; h: number; minKB?: number; maxMB?: number };
  background: BackgroundRule;
  /** Which fill colours this spec's guidance permits, in offer order. */
  allowedFills: readonly { label: string; hex: string }[];
  sourceUrl: string;
  sourceLabel: string;
  verifiedOn: string;
  provenance: SpecProvenance;
}

/**
 * The white the US guidance asks for. Pure #ffffff; the fill is an opt-in
 * compositing colour, not a page token.
 */
export const FILL_WHITE = { label: "white", hex: "#ffffff" } as const;
/** A plain light grey, for the specs whose guidance allows one. */
export const FILL_LIGHT_GREY = { label: "light grey", hex: "#e9e9e6" } as const;

export const SPECS: readonly PhotoSpec[] = [
  {
    id: "us-passport",
    label: "US passport / visa",
    // 2 × 2 inches, stated in mm so every row speaks one unit.
    physical: { wMm: 50.8, hMm: 50.8 },
    px: { w: 600, h: 600 },
    dpi: 300,
    // 1 – 1 3/8 in chin to crown; eye line 1 1/8 – 1 3/8 in above the bottom
    // edge. Surfaced (see the header note): travel.state.gov 403s fetchers.
    head: { minMm: 25.4, maxMm: 34.925 },
    eyeLineFromBottom: { minMm: 28.575, maxMm: 34.925 },
    digitalMin: { w: 600, h: 600 },
    background: "white",
    allowedFills: [FILL_WHITE],
    sourceUrl: "https://travel.state.gov/content/travel/en/passports/how-apply/photos.html",
    sourceLabel: "travel.state.gov — passport photos",
    verifiedOn: "2026-09-21",
    provenance: "surfaced",
  },
  {
    id: "uk-passport",
    label: "UK passport",
    physical: { wMm: 35, hMm: 45 },
    // gov.uk's digital minimums are 600 × 750; this tool crops to the PRINT
    // aspect (35:45), whose 600-px-wide render is 772 px tall — over both
    // minimums while keeping the crop usable on the sheet unchanged.
    px: { w: 600, h: 772 },
    dpi: 300,
    head: { minMm: 29, maxMm: 34 },
    digitalMin: { w: 600, h: 750, minKB: 50, maxMB: 10 },
    background: "light",
    allowedFills: [FILL_WHITE, FILL_LIGHT_GREY],
    // Re-fetched from gov.uk 2026-10-08 (photo-requirements page: 45 × 35 mm,
    // head 29–34 mm; photos page: ≥ 600 × 750 px, 50 kB – 10 MB, unaltered,
    // plain light-coloured background).
    sourceUrl: "https://www.gov.uk/photos-for-passports",
    sourceLabel: "gov.uk — photos for passports",
    verifiedOn: "2026-10-08",
    provenance: "fetched",
  },
  {
    id: "schengen-visa",
    label: "Schengen visa",
    physical: { wMm: 35, hMm: 45 },
    // The common visa rule: 35 × 45 mm at 300 dpi.
    px: { w: 413, h: 531 },
    dpi: 300,
    // 32–36 mm chin to crown — the ICAO 70–80 % band expressed in mm on a
    // 45 mm frame.
    head: { minMm: 32, maxMm: 36 },
    digitalMin: { w: 413, h: 531 },
    background: "whiteOrLightGrey",
    allowedFills: [FILL_WHITE, FILL_LIGHT_GREY],
    sourceUrl: "https://www.icao.int/publications/pages/publication.aspx?docnum=9303",
    sourceLabel: "ICAO Doc 9303 Part 3 — the baseline the 35 × 45 rule derives from",
    verifiedOn: "2026-09-21",
    provenance: "surfaced",
  },
];

/** Look a spec up by id, or null — the select's value is user input. */
export function specById(id: string): PhotoSpec | null {
  return SPECS.find((spec) => spec.id === id) ?? null;
}

/** The default spec — the suite's largest audience first. */
export const DEFAULT_SPEC = SPECS[0];
