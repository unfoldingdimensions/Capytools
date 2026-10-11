/**
 * Harmony palettes — the Generate mode's engine (Phase B).
 *
 * Two palette families, two rulebooks (plan §6b.1): the mood engine's ±30°
 * hue-spread guardrail applies ONLY to lexicon palettes. A complementary
 * pair is 180° apart by definition, so harmony palettes are never run
 * through that check. Their own contract, enforced here by construction:
 *
 *   - hues land exactly on base + offset — the offsets below are the whole
 *     point of each rule, so nothing jitters them;
 *   - lightness and chroma are drawn per role from fixed bands (the
 *     published OKLCH role ranges for light UI fields, mirrored for deep
 *     fields, where those ranges' "background" pole flips) and chroma is
 *     clamped per (L, H) with culori's clampChroma — the CSS Color 4
 *     binary search — never a global cap;
 *   - when the caller passes a picked `baseColor`, that colour IS the
 *     field: its lightness and chroma pass through and the roles keep the
 *     band's spacing relative to it, so the card starts from the colour
 *     itself, not just its hue;
 *   - ink-vs-bg contrast ≥ 4.5 is enforced with the same ensureContrast
 *     walk the mood engine uses;
 *   - every random draw comes from a seeded RNG keyed on
 *     (base hue, harmony id, jitter seed): same triple, same palette.
 *     Math.random() is as banned here as in any other render path.
 */

import { clampChroma, oklch } from "culori";

import { ensureContrast, toHex, type Oklch } from "./engine/color";
import { makeRng, range } from "./rand";
import type { MoodPalette } from "./types";

export type HarmonyId =
  | "complementary"
  | "split"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "mono";

export type FieldDepth = "light" | "deep";

export interface HarmonyRule {
  id: HarmonyId;
  label: string;
  /** Hue offsets in degrees from the base hue — the standard wheel. */
  offsets: readonly number[];
  /** One-line reading of the rule, for the picker. */
  note: string;
}

/** The §3.4 harmony table — the offsets are the product; tests pin them. */
export const HARMONIES: readonly HarmonyRule[] = [
  {
    id: "complementary",
    label: "complementary",
    offsets: [0, 180],
    note: "opposites on the wheel — 180° apart",
  },
  {
    id: "split",
    label: "split-complementary",
    offsets: [0, 150, 210],
    note: "the complement, split to either side",
  },
  {
    id: "analogous",
    label: "analogous",
    offsets: [0, -30, 30],
    note: "neighbours — ±30° of the base",
  },
  {
    id: "triadic",
    label: "triadic",
    offsets: [0, 120, 240],
    note: "three spokes, evenly spaced",
  },
  {
    id: "tetradic",
    label: "tetradic",
    offsets: [0, 60, 180, 240],
    note: "two complementary pairs",
  },
  {
    id: "mono",
    label: "monochromatic",
    offsets: [0],
    note: "one hue — tone does all the work",
  },
];

export const HARMONY_MAP: Record<HarmonyId, HarmonyRule> = Object.fromEntries(
  HARMONIES.map((rule) => [rule.id, rule]),
) as Record<HarmonyId, HarmonyRule>;

/**
 * Per-role lightness/chroma bands. Light-field values follow the published
 * OKLCH guidance for UI roles (backgrounds L ≥ 0.87, surfaces near L 0.96
 * at C 0.005–0.02, accents mid-lightness at C 0.10–0.25); the deep field
 * mirrors the background pole so dark posters keep the same role spacing.
 */
interface RoleBand {
  l: readonly [number, number];
  c: readonly [number, number];
}

const BANDS: Record<FieldDepth, Record<"bg" | "mid" | "accent" | "surface", RoleBand>> = {
  light: {
    bg: { l: [0.87, 0.94], c: [0.012, 0.06] },
    mid: { l: [0.6, 0.74], c: [0.05, 0.13] },
    accent: { l: [0.55, 0.65], c: [0.1, 0.22] },
    surface: { l: [0.94, 0.97], c: [0.005, 0.02] },
  },
  deep: {
    bg: { l: [0.15, 0.28], c: [0.02, 0.09] },
    mid: { l: [0.44, 0.58], c: [0.05, 0.14] },
    accent: { l: [0.66, 0.78], c: [0.1, 0.22] },
    surface: { l: [0.88, 0.95], c: [0.02, 0.07] },
  },
};

/** Hard chroma ceilings per role family — the accent's published maximum. */
const MAX_ACCENT_CHROMA = 0.25;

/**
 * Lightness windows a picked base colour must sit in for each field — the
 * regime bounds. The composition boundary is L 0.5 (the mood engine's
 * isLightField convention): a light field's roles read best on L ≥ 0.55, a
 * deep field's on L ≤ 0.45, and a pick in between defers to whatever the
 * Field pill already says. When the pill is set AGAINST the pick, the
 * field's lightness is brought inside the regime here — hue and chroma
 * always pass through untouched.
 */
const BASE_FIELD_L: Record<FieldDepth, [number, number]> = {
  light: [0.55, 0.98],
  deep: [0.08, 0.45],
};

/** Which field a picked colour implies; null = mid-tone, the caller keeps its own. */
export function fieldForBaseLightness(l: number): FieldDepth | null {
  if (l >= BASE_FIELD_L.light[0]) return "light";
  if (l <= BASE_FIELD_L.deep[1]) return "deep";
  return null;
}

/**
 * Clamp an Oklch colour into sRGB by bisecting chroma at its own (L, H) —
 * culori's CSS Color 4 search. Hue and lightness pass through untouched
 * (culori only moves c), which is what keeps harmony hues exact after
 * clamping. The mood engine's hand-rolled clampToGamut stays untouched for
 * the Feel path; new code uses this.
 */
export function gamutClamp(color: Oklch): Oklch {
  const clamped = clampChroma(oklch({ ...color, mode: "oklch" }), "oklch");
  // At c = 0 culori drops the hue channel; keep the caller's hue.
  return {
    l: clamped?.l ?? color.l,
    c: clamped?.c ?? 0,
    h: clamped?.h ?? color.h,
  };
}

const normalizeHue = (deg: number) => ((deg % 360) + 360) % 360;

export interface HarmonyOptions {
  /** Base hue in degrees; any value is normalized into 0..360. Unused when `baseColor` is set. */
  baseHue: number;
  /**
   * The picked colour itself, when the caller has one. Its lightness and
   * chroma become the field verbatim (clamped into the chosen field's
   * regime only when the pick sits outside it), and role lightness keeps
   * the band's internal spacing relative to it — so "generate from my
   * colour" means the colour, not just its hue.
   */
  baseColor?: Oklch;
  harmony: HarmonyId;
  field: FieldDepth;
  /** Jitter seed — the same (hue, harmony, seed) triple gives the same palette. */
  seed: string;
}

/**
 * Build a five-role palette from a base hue and a harmony rule. The output
 * is a plain MoodPalette, so the poster stage and every export surface
 * render it unchanged.
 */
export function harmonyPalette({ baseHue, baseColor, harmony, field, seed }: HarmonyOptions): MoodPalette {
  const rule = HARMONY_MAP[harmony];
  const hue = normalizeHue(baseColor?.h ?? baseHue);
  const bands = BANDS[field];

  // The jitter RNG is keyed on the identity of the palette itself — the
  // hue is quantized to 0.1° so float noise never forks the stream.
  const rng = makeRng("harmony", rule.id, hue.toFixed(1), seed);

  // Hue casting: bg and surface stay on the base; the accent takes the
  // rule's complement (or last offset); mid takes a remaining offset when
  // one exists, else the base. Mono casts everything on the base.
  const others = rule.offsets.filter((o) => o !== 0);
  const accentOffset = others.includes(180) ? 180 : others.length ? others[others.length - 1] : 0;
  const rest = others.filter((o) => o !== accentOffset);
  const midOffset = rest.length ? rest[Math.floor(rng() * rest.length)] : 0;

  const drawBand = (band: RoleBand): { l: number; c: number } => ({
    l: range(rng, band.l[0], band.l[1]),
    c: range(rng, band.c[0], band.c[1]),
  });

  // Field lightness: a picked colour IS the field — its lightness and
  // chroma pass through verbatim and are gamut-clamped at their own (L, H)
  // below. Only a pick outside the chosen regime (the Field pill set
  // against the colour) is brought inside.
  const [regimeLo, regimeHi] = BASE_FIELD_L[field];
  const inkPole = field === "light" ? 0.22 : 0.94;
  const bandMid = (bands.bg.l[0] + bands.bg.l[1]) / 2;
  let bgL: number;
  let bgC: number;
  if (baseColor) {
    bgL = Math.min(regimeHi, Math.max(regimeLo, baseColor.l));
    bgC = baseColor.c;
  } else {
    const bgDraw = drawBand(bands.bg);
    bgL = bgDraw.l;
    bgC = bgDraw.c;
  }
  // Each role keeps its PROPORTIONAL place between the field and the ink
  // pole, not a fixed offset: translating every band by (bgL - bandMid)
  // slid the accent onto the ink on fields far from the band's middle
  // (#2f4a80 deep: accent/ink 1.01:1). At bgL = bandMid this is the band
  // itself; without a base colour bgL is drawn, so the map is the identity
  // only on average — the band still decides, as before.
  const roleL = (l: number) =>
    baseColor
      ? Math.min(0.985, Math.max(0.02, bgL + ((l - bandMid) * (inkPole - bgL)) / (inkPole - bandMid)))
      : l;

  const midDraw = drawBand(bands.mid);
  const accentDraw = drawBand(bands.accent);
  const surfaceDraw = drawBand(bands.surface);

  const bg = gamutClamp({ l: bgL, c: bgC, h: hue });
  const mid = gamutClamp({
    l: roleL(midDraw.l),
    c: midDraw.c,
    h: normalizeHue(hue + midOffset),
  });
  const accent = gamutClamp({
    l: roleL(accentDraw.l),
    c: Math.min(accentDraw.c, MAX_ACCENT_CHROMA),
    h: normalizeHue(hue + accentOffset),
  });
  const surface = gamutClamp({ l: roleL(surfaceDraw.l), c: surfaceDraw.c, h: hue });

  // Ink starts at the extreme of the field's opposite pole — the regime
  // windows above guarantee bg.l sits on the field's own side of 0.5 — and
  // the contrast walk finishes the job (it only moves lightness, never hue).
  const inkStart: Oklch = {
    l: inkPole,
    c: Math.min(bg.c, 0.03),
    h: hue,
  };
  const ensured = ensureContrast(inkStart, bg, 4.5);

  const roundedHue = Math.round(hue);
  return {
    mood: `${rule.label} ${roundedHue}°`,
    slug: `${rule.id}-${roundedHue}`,
    seed,
    bg: toHex(ensured.bg),
    mid: toHex(mid),
    accent: toHex(accent),
    surface: toHex(surface),
    ink: toHex(ensured.ink),
    grain: range(rng, 0.18, 0.42),
  };
}
