import type { OgCardData } from "./types";

/**
 * The idle-state card — plausible, brand-flavored, and complete, so the
 * preview is never empty and every template has something true to say on
 * arrival. No storage reads and no randomness: the editor seeds from this
 * directly and hydration stays trivial.
 */
export const DEMO_CARD: OgCardData = {
  eyebrow: "CAPYTOOLS · TOOL NO. 6",
  title: "Make the internet a little",
  titleEm: "calmer",
  subtitle: "og images & social cards, composed in your browser",
  big: "100%",
  attribution: "@capytools",
  tag: "just shipped",
};
