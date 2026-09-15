/**
 * Mood families — the taxonomy layer over the lexicon.
 *
 * Every anchor's family is DERIVED from its own color math (hueAnchors,
 * chromaRange, lightnessCurve) rather than hand-tagged, then a small override
 * map catches perceptual edge cases (petrichor's olive straddle, carnival's
 * warm red-pink, confetti's multi-hue party). Tests assert the derivation
 * against each anchor's blessed hexes so a mis-tuned anchor can't hide.
 *
 * Membership model: exactly one hue family per anchor; Popping/Soft/Dusk are
 * cross-cutting tags that stack. A filter view = hue-family match OR tag match,
 * so every card appears in ≥1 filter and most in several.
 */

import { BOOTSTRAP_LEXICON, type AnchorEntry } from "./lexicon";
import { toOklchOrNull as hexToOklch } from "./color";

export type HueFamily = "warm" | "cool" | "nature";
export type Tag = "popping" | "soft" | "dusk";
export type FamilyFilter = HueFamily | "all" | Tag;

/** Sector bounds in Oklch hue degrees. */
const SECTORS: Record<HueFamily, [number, number]> = {
  // 20→95°: coral/red-orange through gold to yellow-green edge.
  warm: [20, 95],
  // 185→300°: teal through sky/indigo to violet.
  cool: [185, 300],
  // 95→185°: chartreuse through green to sea-teal.
  nature: [95, 185],
};

/** Thresholds for cross-cutting tags — tuned against the v1 lexicon. */
const TAG_THRESHOLDS = {
  /** accent chroma at/above this reads as vivid ("popping"). */
  poppingAccentChroma: 0.115,
  /** light field + field chroma at/below this reads pale ("soft"). */
  softFieldChroma: 0.062,
  softBgLightness: 0.5,
  /** dark-field bg lightness at/below this reads "dusk". */
  duskBgLightness: 0.25,
} as const;

export interface FamilyAssignment {
  hueFamily: HueFamily;
  tags: Tag[];
}

function sectorOf(hue: number): HueFamily {
  const h = ((hue % 360) + 360) % 360;
  for (const [family, [lo, hi]] of Object.entries(SECTORS) as [HueFamily, [number, number]][]) {
    if (h >= lo && h <= hi) return family;
  }
  // Wrap gap 300–20° (magenta → red): perceptually warm-adjacent.
  return "warm";
}

function derive(entry: AnchorEntry): FamilyAssignment {
  const meanHue =
    entry.hueAnchors.reduce((a, b) => a + b, 0) / Math.max(entry.hueAnchors.length, 1);
  const hueFamily = sectorOf(meanHue);

  const tags: Tag[] = [];
  if (entry.chromaRange[1] >= TAG_THRESHOLDS.poppingAccentChroma) tags.push("popping");
  const isLightField = entry.lightnessCurve[0] >= TAG_THRESHOLDS.softBgLightness;
  if (isLightField && entry.chromaRange[0] <= TAG_THRESHOLDS.softFieldChroma) tags.push("soft");
  if (entry.lightnessCurve[0] <= TAG_THRESHOLDS.duskBgLightness) tags.push("dusk");

  return { hueFamily, tags };
}

/**
 * Hand overrides — only where perception disagrees with the math.
 * `hueFamily` swap or extra/removed tags; never both families.
 */
const OVERRIDES: Record<string, Partial<FamilyAssignment>> = {
  // Red-pink sector sits in the magenta wrap-gap; users read it as warm.
  "carnival-night": { hueFamily: "warm", tags: ["popping", "dusk"] },
  // Multi-hue party mix — belongs to the energy filter, not one hue family.
  "confetti-pop": { tags: ["popping"] },
  // Olive straddles the yellow/green border; reads nature first.
  petrichor: { hueFamily: "nature", tags: ["soft"] },
};

const RESOLVED: Record<string, FamilyAssignment> = {};
for (const [id, entry] of Object.entries(BOOTSTRAP_LEXICON.anchors)) {
  RESOLVED[id] = { ...derive(entry), ...OVERRIDES[id] };
}

export function assignmentOf(anchorId: string): FamilyAssignment {
  const a = RESOLVED[anchorId];
  if (!a) throw new Error(`unknown anchor: ${anchorId}`);
  return a;
}

/** All anchor ids, lexicon order — the single source for pill lists. */
export function allAnchorIds(): string[] {
  return Object.keys(BOOTSTRAP_LEXICON.anchors);
}

/** The display phrase for an anchor id (id words, e.g. "cozy-autumn-morning"). */
export function phraseOf(anchorId: string): string {
  return anchorId.replace(/-/g, " ");
}

export interface FilterGroupMeta {
  id: Exclude<FamilyFilter, "all">;
  label: string;
  blurb: string;
  /** Two hexes hinting the family's range (for the gradient dot). */
  range: [string, string];
}

export const FILTER_GROUPS: FilterGroupMeta[] = [
  { id: "warm", label: "Warm", blurb: "sunlight, spice, hearth", range: ["#D96C3A", "#E8A81E"] },
  { id: "cool", label: "Cool", blurb: "rain, frost, midnight", range: ["#6FA5B2", "#8B87B0"] },
  { id: "nature", label: "Nature", blurb: "moss, meadow, monsoon", range: ["#7FA33C", "#3F7355"] },
  { id: "popping", label: "Popping", blurb: "festival-grade chroma", range: ["#E0576B", "#C74FA8"] },
  { id: "soft", label: "Soft", blurb: "pale, quiet, pastel", range: ["#F2CDD5", "#D2E7DC"] },
  { id: "dusk", label: "Dusk", blurb: "dark fields, low light", range: ["#14121F", "#28425A"] },
];

/** Anchors shown under a filter: hue-family match OR any tag overlap. */
export function anchorsForFilter(filter: FamilyFilter): string[] {
  const ids = allAnchorIds();
  if (filter === "all") return ids;
  return ids.filter((id) => {
    const a = assignmentOf(id);
    return a.hueFamily === filter || a.tags.includes(filter as Tag);
  });
}

/** Mean measured hue of an anchor's blessed hexes — test + UI helper. */
export function blessedMeanHue(anchorId: string): number {
  const entry = BOOTSTRAP_LEXICON.anchors[anchorId];
  const hues = entry.blessed
    .map((hex) => hexToOklch(hex)?.h)
    .filter((h): h is number => typeof h === "number");
  // Circular mean so 350°+10° averages to ~0°, not 180°.
  const sin = hues.reduce((a, h) => a + Math.sin((h * Math.PI) / 180), 0);
  const cos = hues.reduce((a, h) => a + Math.cos((h * Math.PI) / 180), 0);
  return ((Math.atan2(sin, cos) * 180) / Math.PI + 360) % 360;
}
