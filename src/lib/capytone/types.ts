/**
 * The palette contract.
 *
 * These types are the seam between the engine (lexicon + Oklch blending +
 * guardrails) and the renderer. The renderer only ever sees `MoodPalette` —
 * so the engine must emit exactly this shape. The standalone `capytone/`
 * repo's `fixtures.ts` holds the hand-written instances used by the
 * lexicon-tuning studio; nothing in the shipped suite needs them.
 */

/** The five roles every palette carries — same roles as the Wrapped card. */
export interface MoodPalette {
  /** The phrase as typed by the user (display case preserved). */
  mood: string;
  /** URL-safe slug used in filenames and share URLs. */
  slug: string;
  /** Deterministic seed for this render (hex-ish string, e.g. "a3f9"). */
  seed: string;
  /** Dark field the artwork sits on. */
  bg: string;
  /** Mid tone — bars, strokes, secondary fills. */
  mid: string;
  /** The one saturated moment of the palette. */
  accent: string;
  /** Lighter surface tone — panels, highlight bands. */
  surface: string;
  /** Highest-contrast role; body/label text on `bg`. Guardrail-checked ≥4.5:1. */
  ink: string;
  /** 0..1 — how much grain this mood wears. Cozy moods wear more. */
  grain: number;
}

/** A fixture: palette + provenance, exactly what a lexicon entry resolves to. */
export interface FixtureSpec {
  id: string;
  label: string;
  family: string;
  note: string;
  palettes: {
    wide: MoodPalette;
    square: MoodPalette;
    darkUi: MoodPalette;
    lightUi: MoodPalette;
  };
}

export const CARD_FORMATS = {
  wide: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
} as const;

export type CardFormat = keyof typeof CARD_FORMATS;

export type UiTheme = "darkUi" | "lightUi";
