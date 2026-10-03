import type { FontChoice } from "./types";

/**
 * The faces a text mark can take, and the readiness rule that keeps the
 * preview and the export honest: canvas text draws with whatever font is
 * loaded at the moment of drawing, so `ensureFontLoaded` runs before the
 * first preview and before every batch run.
 *
 * The three house faces come from `next/font`, which generates their real
 * family names — the only place those names exist at runtime is the CSS
 * variables on <html>. Nothing here hard-codes a generated name; the caller
 * hands in what `getComputedStyle(document.documentElement)` reads.
 */

export interface FaceDef {
  /** The pill's plain-words label. */
  label: string;
  /** The next/font variable to read, or null for a system stack. */
  cssVar: string | null;
  /** The fallback stack when the variable is missing (SSR, tests). */
  system: string;
}

export const FACES: Record<FontChoice, FaceDef> = {
  "house-sans": { label: "House sans", cssVar: "--font-sans", system: "system-ui, sans-serif" },
  "house-display": { label: "House serif", cssVar: "--font-display", system: "Georgia, serif" },
  "house-label": { label: "House label", cssVar: "--font-mono", system: "system-ui, sans-serif" },
  "system-sans": { label: "System sans", cssVar: null, system: "system-ui, sans-serif" },
  "system-serif": { label: "System serif", cssVar: null, system: "Georgia, serif" },
  "system-mono": { label: "System mono", cssVar: null, system: "ui-monospace, monospace" },
};

/**
 * A `next/font` variable value is a family LIST — `'_Fraunces_ab12cd',
 * '_Fraunces_Fallback_ab12cd'` — meant to be used as-is, first name wins.
 * This trims the value and rejects the empties; the whole list stays intact
 * so the built-in fallback names survive into `ctx.font`.
 */
export function familyListFromVar(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : fallback;
}

/** The family list for a choice, from the runtime CSS-variable values. */
export function resolveFamilyList(
  choice: FontChoice,
  vars: Partial<Record<string, string>>,
): string {
  const face = FACES[choice] ?? FACES["system-sans"];
  if (!face.cssVar) return face.system;
  return familyListFromVar(face.cssVar in vars ? vars[face.cssVar] : null, face.system);
}

/** `ctx.font` shape: `weight size family`. */
export function fontString(weight: number, sizePx: number, familyList: string): string {
  const w = Number.isFinite(weight) ? Math.round(weight) : 400;
  const s = Number.isFinite(sizePx) && sizePx > 0 ? sizePx : 16;
  return `${w} ${s}px ${familyList}`;
}

/**
 * Read the three house-face variables off <html>. Browser-only; the guard
 * keeps a server render from reaching for computed styles.
 */
export function readFaceVars(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const style = getComputedStyle(document.documentElement);
  const vars: Record<string, string> = {};
  for (const face of Object.values(FACES)) {
    if (face.cssVar) vars[face.cssVar] = style.getPropertyValue(face.cssVar);
  }
  return vars;
}

/**
 * Ask the browser to have the exact face — at the exact weight, with the
 * exact glyphs the mark uses — ready before anything draws. Best-effort:
 * a refused load falls through to whatever the engine has, which is the
 * same thing the export would get, so preview and export still agree.
 */
export async function ensureFontLoaded(
  choice: FontChoice,
  weight: number,
  sizePx: number,
  sampleText: string,
  vars: Partial<Record<string, string>>,
): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const face = FACES[choice] ?? FACES["system-sans"];
  if (!face.cssVar) return; // system faces need no loading
  const family = resolveFamilyList(choice, vars);
  try {
    await document.fonts.load(fontString(weight, Math.max(16, sizePx), family), sampleText);
  } catch {
    // Font availability is a nicety; the fallback face is drawn honestly.
  }
}
