/**
 * The Blend mode's engine — gradient CSS emission, modern syntax first.
 *
 * CSS gradients interpolate in Oklab by default, and the `in` syntax
 * (`linear-gradient(45deg in oklab, …)`, `in oklch longer hue`) has been
 * Baseline since 2023 — but older engines drop the whole declaration when
 * they meet it. So every gradient ships twice: the primary `in`-syntax
 * string, and a dense hex-stop fallback that samples the *same*
 * interpolation (culori interpolate + samples, gamut-clamped per sample)
 * so legacy engines see nearly the same ramp instead of nothing.
 */

import {
  clampChroma,
  fixupHueLonger,
  formatHex,
  interpolate,
  parse,
  samples,
} from "culori";

export type GradientType = "linear" | "radial" | "conic";

export type InterpSpace = "oklab" | "oklch" | "oklch-longer" | "srgb";

export interface InterpRule {
  id: InterpSpace;
  /** The CSS colour-interpolation-method fragment. */
  css: string;
  /** What the picker calls it. */
  label: string;
}

export const INTERP_SPACES: readonly InterpRule[] = [
  { id: "oklab", css: "in oklab", label: "oklab" },
  { id: "oklch", css: "in oklch", label: "oklch" },
  { id: "oklch-longer", css: "in oklch longer hue", label: "oklch longer hue" },
  { id: "srgb", css: "in srgb", label: "srgb" },
];

export const INTERP_MAP: Record<InterpSpace, InterpRule> = Object.fromEntries(
  INTERP_SPACES.map((rule) => [rule.id, rule]),
) as Record<InterpSpace, InterpRule>;

/** How many samples the fallback ramp carries between the given stops. */
const FALLBACK_SAMPLES = 13;

export interface GradientSpec {
  type: GradientType;
  /** Direction in degrees — used by linear and conic; radial ignores it. */
  angle: number;
  /** Two or three colour stops (any CSS colour; normalised to hex). */
  stops: string[];
  interp: InterpSpace;
}

export interface GradientResult {
  /** The modern `in`-syntax declaration. */
  css: string;
  /** A dense hex-stop declaration approximating the same ramp. */
  fallback: string;
}

function normalizeColor(color: string): string {
  const parsed = parse(color.trim());
  if (!parsed) throw new Error(`unparseable colour: ${color}`);
  const hex = formatHex(parsed);
  if (!hex) throw new Error(`unparseable colour: ${color}`);
  return hex;
}

const pct = (t: number) => `${Math.round(t * 10000) / 100}%`;

/** The `linear-gradient(…)` head: type, direction, interpolation space. */
function head(type: GradientType, angle: number, interpCss: string): string {
  switch (type) {
    case "linear":
      return `linear-gradient(${Math.round(angle)}deg ${interpCss}`;
    case "radial":
      return `radial-gradient(${interpCss}`;
    case "conic":
      return `conic-gradient(from ${Math.round(angle)}deg ${interpCss}`;
  }
}

/** The function head without the interpolation clause — the fallback form. */
function plainHead(type: GradientType, angle: number): string {
  switch (type) {
    case "linear":
      return `linear-gradient(${Math.round(angle)}deg`;
    case "radial":
      return "radial-gradient(";
    case "conic":
      return `conic-gradient(from ${Math.round(angle)}deg`;
  }
}

/**
 * Sample the interpolation between the (normalised) stops and clamp every
 * sample into sRGB before hex-encoding — an oklch hue detour can leave the
 * gamut, and formatHex's naive channel clamp would bend its hue.
 */
/** Culori mode id per interpolation space — CSS calls it "srgb", culori "rgb". */
const CULORI_MODE: Record<InterpSpace, "oklab" | "oklch" | "rgb"> = {
  oklab: "oklab",
  oklch: "oklch",
  "oklch-longer": "oklch",
  srgb: "rgb",
};

function sampleRamp(hexes: string[], interp: InterpSpace): string[] {
  // The longer-hue fixup rides in with every channel key named — culori's
  // overrides union resolves per-channel, and channels without a use/fixup
  // fall back to the mode's default interpolator at runtime.
  const longerHue: Record<
    "l" | "c" | "h" | "alpha",
    { fixup?: (arr: number[]) => number[] }
  > = {
    l: {},
    c: {},
    h: { fixup: fixupHueLonger },
    alpha: {},
  };
  const ramp =
    interp === "oklch-longer"
      ? interpolate(hexes, "oklch", longerHue)
      : interpolate(hexes, CULORI_MODE[interp]);
  return samples(FALLBACK_SAMPLES).map((t) => {
    const c = ramp(t);
    // clampChroma converts to oklch for the bisect and returns the colour
    // in its original mode; only out-of-gamut samples are touched.
    return formatHex(clampChroma(c, "oklch")) ?? hexes[0];
  });
}

/**
 * Build the two declarations for a gradient. Pure: same spec, same strings,
 * every time — the only formatting choices are fixed here (integer degrees,
 * even stop positions, a 13-step fallback ramp).
 */
export function gradientCss(spec: GradientSpec): GradientResult {
  const { type, angle: rawAngle, interp } = spec;
  if (spec.stops.length < 2 || spec.stops.length > 3) {
    throw new Error("a gradient needs two or three stops");
  }
  const angle = ((Math.round(rawAngle) % 360) + 360) % 360;
  const hexes = spec.stops.map(normalizeColor);

  // 2 stops sit at the ends; 3 sit evenly at 0 / 50 / 100.
  const positions = hexes.length === 2 ? [0, 1] : [0, 0.5, 1];
  const stops = hexes.map((hex, i) => `${hex} ${pct(positions[i])}`).join(", ");

  const dense = sampleRamp(hexes, interp)
    .map((hex, i) => `${hex} ${pct(i / (FALLBACK_SAMPLES - 1))}`)
    .join(", ");

  return {
    css: `${head(type, angle, INTERP_MAP[interp].css)}, ${stops})`,
    fallback: `${plainHead(type, angle)}, ${dense})`,
  };
}
