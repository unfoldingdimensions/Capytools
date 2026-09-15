/**
 * The generator — resolve → synthesize → guardrail → re-seed walk.
 *
 * Every palette is CONSTRUCTED to pass the guardrails rather than hoped to:
 * hues are pulled toward the anchor sector, chroma is clamped into the mood's
 * range with hard caps, lightness landmarks set the roles, and contrast is
 * enforced by `ensureContrast`. The deterministic re-seed walk remains as the
 * belt to the construction's braces: same phrase + seed ⇒ same card, forever.
 */

import { clampToGamut, ensureContrast, hueDistance, meanHue, toHex, toOklchOrNull, type Oklch } from "./color";
import { resolveMood, tokenize, BOOTSTRAP_LEXICON, type AnchorEntry } from "./lexicon";
import { START_COLORS, type ColorStop } from "./startColors";
import type { HueFamily } from "./families";
import { makeRng, range, hashString } from "../rand";
import type { MoodPalette } from "../types";

type HueFamilyKey = HueFamily;

export interface GenerateOptions {
  /** Explicit seed; when omitted one is derived from the phrase itself. */
  seed?: string;
  lexicon?: typeof BOOTSTRAP_LEXICON;
}

export interface GenerateResult {
  palette: MoodPalette;
  /** True when nothing curated matched and the guarded random fired. */
  fallback: boolean;
  /** Human note for the UI ("closest match", "no match — improvised"). */
  note?: string;
}

/** Guardrail thresholds — the "never ugly" invariants. */
export const GUARDRAILS = {
  minContrast: 4.5,
  maxFieldChroma: 0.15,
  maxAccentChroma: 0.22,
  maxHueSpread: 30,
} as const;

function slugify(phrase: string): string {
  return (
    tokenize(phrase).join("-") || "mood"
  ).slice(0, 48);
}

function pickHue(anchorHues: number[], rng: () => number): number {
  if (anchorHues.length === 0) return range(rng, 0, 360);
  const base = anchorHues[Math.floor(rng() * anchorHues.length)];
  // Wander within ±18° of the chosen anchor — inside the ±30° harmony gate.
  return (base + range(rng, -18, 18) + 360) % 360;
}

/**
 * Synthesize the five roles around an entry's parameters. All randomness is
 * drawn from the phrase+seed — two calls with equal inputs draw equal numbers.
 */
function synthesize(
  entry: AnchorEntry,
  tweak: { lightnessShift?: number; chromaScale?: number; grainDelta?: number },
  phrase: string,
  seed: string,
  /** When set, the palette's base hue is pinned here (start-color mode). */
  pinnedHue?: number,
): MoodPalette {
  const rng = makeRng("palette", entry.id, seed);
  const lShift = tweak.lightnessShift ?? 0;
  const cScale = tweak.chromaScale ?? 1;

  const [bgL, midL, surfaceL] = entry.lightnessCurve;
  const [cMin, cMax] = entry.chromaRange;

  // Field hue wanders; accent stays within ±14° of it; mid splits the diff
  // CIRCULARLY — naive averaging across the 0° wrap put a teal mid in
  // carnival's red-pink card. A pinned hue (start-color mode) replaces the
  // anchor draw but keeps the same ±18° wander, so harmony gates hold.
  const fieldHue =
    pinnedHue !== undefined ? (pinnedHue + range(rng, -18, 18) + 360) % 360 : pickHue(entry.hueAnchors, rng);
  const accentHue = (fieldHue + range(rng, 6, 14) * (rng() > 0.5 ? 1 : -1) + 360) % 360;
  const midHue = meanHue([fieldHue, accentHue]);
  const fieldC = clamp(range(rng, cMin, cMax) * cScale, 0, GUARDRAILS.maxFieldChroma);
  const midC = clamp(fieldC * range(rng, 1.05, 1.35), 0, GUARDRAILS.maxFieldChroma);
  const accentC = clamp(
    Math.max(fieldC * range(rng, 1.5, 2.1), cMin * 1.4) * cScale,
    0,
    GUARDRAILS.maxAccentChroma,
  );

  let bg = clampToGamut({ l: bgL + lShift, c: fieldC, h: fieldHue });
  const isLightField = bgL >= 0.5;

  // Role placement flips with the composition: on light fields the accent
  // sits BELOW mid in lightness (the dark moment), mirroring dark fields
  // where it sits above. Surface stays near the bg pole.
  const mid = clampToGamut({
    l: isLightField ? midL : midL - 0.06,
    c: midC,
    h: midHue,
  });
  const accent = clampToGamut({
    l: isLightField ? clamp(midL - 0.2, 0.25, 0.6) : midL + 0.16,
    c: accentC,
    h: accentHue,
  });
  const surface = clampToGamut({
    l: surfaceL,
    c: Math.min(fieldC, GUARDRAILS.maxFieldChroma),
    h: fieldHue,
  });

  // Ink starts at the extreme of the bg side; contrast pass finishes the job.
  let ink: Oklch = isLightField
    ? { l: 0.24, c: Math.min(fieldC, 0.04), h: fieldHue }
    : { l: 0.94, c: Math.min(fieldC, 0.04), h: fieldHue };

  const ensured = ensureContrast(ink, bg, GUARDRAILS.minContrast);
  ink = ensured.ink;
  bg = ensured.bg;

  return {
    mood: phrase.trim().toLowerCase(),
    slug: slugify(phrase),
    seed,
    bg: toHex(bg),
    mid: toHex(mid),
    accent: toHex(accent),
    surface: toHex(surface),
    ink: toHex(ink),
    grain: clamp(entry.grain + (tweak.grainDelta ?? 0), 0, 1),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** The five guardrails, evaluated on a finished palette. */
export function checkGuardrails(palette: MoodPalette): {
  contrast: number;
  fieldChromaOk: boolean;
  accentChromaOk: boolean;
  harmonyOk: boolean;
} {
  // Malformed hex would fail every check loudly rather than pass silently.
  const bg = toOklchLocal(palette.bg)!;
  const mid = toOklchLocal(palette.mid)!;
  const accent = toOklchLocal(palette.accent)!;
  const surface = toOklchLocal(palette.surface)!;

  // 8-bit hex quantization alone shifts measured chroma/hue by ~±0.003/±1°,
  // so tolerances must clear that floor — tighter is physically meaningless.
  const EPS = 0.005;
  const HUE_EPS = 2;

  const contrast = contrastOf(palette.ink, palette.bg);
  const fieldChromaOk = [bg, mid, surface].every((c) => c.c <= GUARDRAILS.maxFieldChroma + EPS);
  const accentChromaOk = accent.c <= GUARDRAILS.maxAccentChroma + EPS;

  const hues = [bg.h, mid.h, accent.h, surface.h];
  const center = meanHue(hues);
  const harmonyOk = hues.every((h) => Math.abs(hueDistance(center, h)) <= GUARDRAILS.maxHueSpread + HUE_EPS);

  return { contrast, fieldChromaOk, accentChromaOk, harmonyOk };
}

// Local shims keep this module import-light for tests run in node.
import { toOklchOrNull as toOklchLocal, contrastRatio as contrastOf } from "./color";

/** Deterministic guarded-random for unmatched phrases. */
function guardedRandom(phrase: string, seed: string): MoodPalette {
  const rng = makeRng("guarded-random", phrase.toLowerCase(), seed);
  const anchors = Object.values(BOOTSTRAP_LEXICON.anchors);
  const entry = anchors[Math.floor(rng() * anchors.length)];
  const palette = synthesize(entry, {}, phrase, seed);
  return palette;
}

/**
 * Main entry. Free text → palette, deterministically.
 */
export function generatePalette(phrase: string, options: GenerateOptions = {}): GenerateResult {
  const trimmed = phrase.trim();
  if (!trimmed || !tokenize(trimmed).length) {
    // Empty/absurd input: derive everything from the raw string so even
    // "aaaa" is stable, and flag it.
    const seed = options.seed ?? deriveSeedFromPhrase(trimmed || "empty");
    return { palette: guardedRandom(trimmed || "empty mood", seed), fallback: true, note: "nothing matched — improvised" };
  }

  const seed = options.seed ?? deriveSeedFromPhrase(trimmed);

  // Start-color mode: ONLY via an explicit prefix ("start from orange",
  // "start with violet hour"). Bare stop phrases like "golden hour" or
  // "sage air" are real lexicon moods and must keep resolving to their
  // hand-tuned anchors — the stop table must never hijack them.
  const stop = matchStopCommand(trimmed.toLowerCase());
  if (stop) {
    return generateFromStop(stop, seed);
  }

  const { result } = resolveMood(trimmed, options.lexicon ?? BOOTSTRAP_LEXICON);
  if (!result) {
    return {
      palette: guardedRandom(trimmed, seed),
      fallback: true,
      note: `no match yet — improvising in a random family`,
    };
  }

  const palette = synthesize(result.entry, result.tweak, trimmed, seed);
  return {
    palette,
    fallback: false,
    note: result.viaSynonym ? `via synonym · ${result.entry.id}` : undefined,
  };
}

/** Find a color-stop whose phrase matches the tokenized input exactly. */
function findStopByPhrase(
  normalizedPhrase: string,
): { group: (typeof START_COLORS)[HueFamilyKey]; stop: ColorStop } | null {
  for (const group of Object.values(START_COLORS)) {
    for (const s of group.stops) {
      if (tokenize(s.phrase).join(" ") === normalizedPhrase) return { group, stop: s };
    }
  }
  return null;
}

/**
 * Start-color commands: "start from <stop>" / "start with <stop>" /
 * "<stop> palette". The prefix keeps bare phrases ("golden hour", "storm")
 * resolving to their real lexicon moods — only an explicit command opts
 * into stop mode.
 */
function matchStopCommand(
  lowerPhrase: string,
): { group: (typeof START_COLORS)[HueFamilyKey]; stop: ColorStop } | null {
  const prefixes = ["start from ", "start with ", "start using "];
  for (const p of prefixes) {
    if (lowerPhrase.startsWith(p)) {
      return findStopByPhrase(tokenize(lowerPhrase.slice(p.length)).join(" "));
    }
  }
  // Suffix form: "<phrase> palette" where the head is a stop phrase.
  if (lowerPhrase.endsWith(" palette")) {
    const head = lowerPhrase.slice(0, -" palette".length);
    return findStopByPhrase(tokenize(head).join(" "));
  }
  return null;
}

/**
 * Build a palette from a start-color stop: family profile supplies chroma,
 * lightness and grain; the stop pins hue; synthesize enforces every guardrail.
 * The synthetic anchor id doubles as the palette's identity in exports.
 */
function generateFromStop(
  { group, stop }: { group: (typeof START_COLORS)[HueFamilyKey]; stop: ColorStop },
  seed: string,
): GenerateResult {
  // The stop's hex is the promise — derive hue AND chroma AND lightness from
  // it so the generated field lands visually on the tapped color. Chroma is
  // scaled per-role (field keeps the stop's softness, accent lifts ~1.8x)
  // and lightness landmarks follow the stop's own tone.
  const probe = toOklchOrNull(stop.hex);
  if (!probe) throw new Error(`bad stop hex for ${stop.id}`);
  const fieldC = clamp(probe.c * 0.9, 0.012, GUARDRAILS.maxFieldChroma);
  const entry: AnchorEntry = {
    id: `stop-${stop.id}`,
    keywords: [],
    hueAnchors: [probe.h],
    chromaRange: [fieldC * 0.75, fieldC],
    lightnessCurve: [clamp(probe.l, 0.14, 0.95), 0.55, Math.min(0.97, probe.l + 0.3)],
    grain: group.grain,
    blessed: ["#000000", "#000000", "#000000", "#000000", "#000000"],
  };
  const palette = synthesize(entry, {}, stop.phrase, seed, probe.h);
  return { palette, fallback: false, note: `starting from ${stop.label.toLowerCase()}` };
}

/**
 * Seed derived purely from the phrase — stable across sessions/devices.
 * Canonicalized through tokenize() so punctuation and casing never matter.
 */
export function deriveSeedFromPhrase(phrase: string): string {
  return hashString(`seed\u0000${tokenize(phrase).join(" ")}`).toString(36).slice(0, 6);
}
