import type { Anchor, FontChoice, Halo, LogoMark, StampSpec, Tiling, TextMark } from "./types";

/**
 * Defaults, clamps and the storage boundary for a stamp design. Everything
 * here is pure: the browser never touches this module, and neither does a
 * pixel — a spec carries fractions and enums only, which is exactly why a
 * preset can live in localStorage without storing a byte of anyone's photo
 * or logo.
 */

export const SIZE_LIMITS = { min: 0.02, max: 0.5, default: 0.16 } as const;
export const OPACITY_LIMITS = { min: 0.05, max: 1, default: 0.9 } as const;
/** Tile gap as a fraction of the mark's longer side. */
export const GAP_LIMITS = { min: 0, max: 4, default: 0.5 } as const;
/** Letter spacing in em. */
export const SPACING_LIMITS = { min: 0, max: 0.4, default: 0.04 } as const;
export const WEIGHTS = [400, 500, 600, 700] as const;

const ANCHORS: readonly Anchor[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
const TILINGS: readonly Tiling[] = ["none", "grid", "diagonal"];
const FONTS: readonly FontChoice[] = [
  "house-sans",
  "house-display",
  "house-label",
  "system-sans",
  "system-serif",
  "system-mono",
];
const HALOS: readonly Halo[] = ["none", "shadow", "outline"];

export const DEFAULT_TEXT_SPEC: TextMark = {
  kind: "text",
  text: "your mark",
  font: "house-sans",
  weight: 700,
  colour: "#ffffff",
  size: SIZE_LIMITS.default,
  opacity: OPACITY_LIMITS.default,
  rotation: 0,
  anchor: "br",
  offset: { x: 0, y: 0 },
  tiling: "none",
  gap: GAP_LIMITS.default,
  letterSpacing: SPACING_LIMITS.default,
  halo: "shadow",
};

export const DEFAULT_LOGO_SPEC: LogoMark = {
  kind: "logo",
  size: SIZE_LIMITS.default,
  opacity: OPACITY_LIMITS.default,
  rotation: 0,
  anchor: "br",
  offset: { x: 0, y: 0 },
  tiling: "none",
  gap: GAP_LIMITS.default,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** −180…180, wrapping 190 → −170. A slider never needs this; a stored spec might. */
export function wrapRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  let d = degrees % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

const HEX = /^#[0-9a-f]{6}$/i;

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickOffset(value: unknown): { x: number; y: number } {
  if (typeof value !== "object" || value === null) return { x: 0, y: 0 };
  const raw = value as { x?: unknown; y?: unknown };
  const x = typeof raw.x === "number" && Number.isFinite(raw.x) ? clamp(raw.x, -2, 2) : 0;
  const y = typeof raw.y === "number" && Number.isFinite(raw.y) ? clamp(raw.y, -2, 2) : 0;
  return { x, y };
}

/**
 * Rebuild a spec from unknown storage-shaped input, rejecting rather than
 * repairing what is structurally wrong (wrong kind, empty text) and clamping
 * what is merely out of range. Same rule as llm.ts: validation happens on the
 * way OUT of storage, so a tampered or stale key can only ever produce a
 * spec the renderer can draw.
 */
export function parseSpec(value: unknown): StampSpec | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  const common = {
    size: clampNumber(raw.size, SIZE_LIMITS),
    opacity: clampNumber(raw.opacity, OPACITY_LIMITS),
    rotation: wrapRotation(typeof raw.rotation === "number" ? raw.rotation : 0),
    anchor: pickEnum(raw.anchor, ANCHORS, "br"),
    offset: pickOffset(raw.offset),
    tiling: pickEnum(raw.tiling, TILINGS, "none"),
    gap: clampNumber(raw.gap, GAP_LIMITS),
  };

  if (raw.kind === "logo") return { kind: "logo", ...common };

  if (raw.kind === "text") {
    const text = typeof raw.text === "string" ? raw.text.slice(0, 80) : "";
    if (!text.trim()) return null;
    return {
      kind: "text",
      ...common,
      text,
      font: pickEnum(raw.font, FONTS, "house-sans"),
      weight: WEIGHTS.includes(raw.weight as (typeof WEIGHTS)[number])
        ? (raw.weight as TextMark["weight"])
        : 700,
      colour: typeof raw.colour === "string" && HEX.test(raw.colour) ? raw.colour : DEFAULT_TEXT_SPEC.colour,
      letterSpacing: clampNumber(raw.letterSpacing, SPACING_LIMITS),
      halo: pickEnum(raw.halo, HALOS, "none"),
    };
  }

  return null;
}

function clampNumber(value: unknown, limits: { min: number; max: number; default: number }): number {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, limits.min, limits.max) : limits.default;
}

/** Pull every number and enum back inside the limits — the live editor's gate.
 *  Unlike parseSpec this never rejects: a spec built by the controls is
 *  structurally sound by construction (an empty text field is the UI's to
 *  disable, not the clamps' to rewrite). */
export function clampSpec<T extends StampSpec>(spec: T): T {
  const common = {
    size: clamp(spec.size, SIZE_LIMITS.min, SIZE_LIMITS.max),
    opacity: clamp(spec.opacity, OPACITY_LIMITS.min, OPACITY_LIMITS.max),
    rotation: wrapRotation(spec.rotation),
    anchor: pickEnum(spec.anchor, ANCHORS, "br"),
    offset: pickOffset(spec.offset),
    tiling: pickEnum(spec.tiling, TILINGS, "none"),
    gap: clamp(spec.gap, GAP_LIMITS.min, GAP_LIMITS.max),
  };
  if (spec.kind === "logo") return { kind: "logo", ...common } as T;
  return {
    kind: "text",
    ...common,
    text: typeof spec.text === "string" ? spec.text.slice(0, 80) : "",
    font: pickEnum(spec.font, FONTS, "house-sans"),
    weight: (WEIGHTS as readonly number[]).includes(spec.weight) ? spec.weight : 700,
    colour: HEX.test(spec.colour) ? spec.colour : DEFAULT_TEXT_SPEC.colour,
    letterSpacing: clamp(spec.letterSpacing, SPACING_LIMITS.min, SPACING_LIMITS.max),
    halo: pickEnum(spec.halo, HALOS, "none"),
  } as T;
}

/** The storage form is JSON of the clamped spec — settings only, never bytes. */
export function serialiseSpec(spec: StampSpec): string {
  return JSON.stringify(clampSpec(spec));
}
