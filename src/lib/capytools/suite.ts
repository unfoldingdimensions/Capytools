/**
 * The suite, as data.
 *
 * Every count and every list of tools on the site derives from this array: the
 * hero's "Nº 05", its stat ring, the live wire, the catalog, the Labs grid, the
 * masthead's switcher, the Colophon's partner row, the footer's Suite column,
 * the notes page, the sitemap. Adding a tool is one row here plus its page.
 *
 * Nothing in here is React, so the masthead's client bundle can import the
 * registry without dragging the landing's copy along with it.
 */

export type ToolCategory = "browser" | "desktop";

export type SuiteTool = {
  /** `Capy<Name>` — the product name everywhere it is spelled out. */
  name: string;
  /** The masthead's short label. */
  short: string;
  href: string;
  cat: ToolCategory;
  /** The catalog card's corner badge. */
  badge: string;
  year: string;
  /** The catalog card's sentence. */
  blurb: string;
  /** The Colophon's one-line note under the glyph. */
  note: string;
  /** The notes page's one-liner, shorter than `blurb`. */
  line: string;
  plate: { src: string; width: number; height: number };
};

export const SUITE: SuiteTool[] = [
  {
    name: "CapyWrapped",
    short: "Wrapped",
    href: "/capywrapped",
    cat: "browser",
    badge: "Wrapped",
    year: "2026",
    blurb:
      "Your GitHub year in a calm little card — contributions, a month-by-month trendline, stars and top languages.",
    note: "GitHub year",
    line: "Your GitHub year in a calm little card.",
    plate: { src: "/plates/lab-1.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyImagine",
    short: "Imagine",
    href: "/capyimagine",
    cat: "browser",
    badge: "Imagine",
    year: "2026",
    blurb:
      "Random image and video prompts, tuned in your engine's dialect — ratios, frames and negative clauses included.",
    note: "Prompt roulette",
    line: "Random image and video prompts, in your engine's dialect.",
    plate: { src: "/plates/lab-2.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyCreator",
    short: "Creator",
    href: "/capycreator",
    cat: "browser",
    badge: "Create",
    year: "2026",
    blurb:
      "Model-aware prompt engineering scaled from flash to frontier — intent elucidation, assembly, optional polish.",
    note: "Model-aware",
    line: "Model-aware prompt engineering, flash to frontier.",
    plate: { src: "/plates/lab-3.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyStrip",
    short: "Strip",
    href: "/capystrip",
    cat: "browser",
    badge: "Strip",
    year: "2026",
    blurb:
      "Photos talk; this helps them forget. Reads every metadata trail, strips it in-tab, then proves the strip.",
    note: "Metadata off",
    line: "Photos talk; this helps them forget.",
    plate: { src: "/plates/lab-4.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyExpense",
    short: "Expense",
    href: "/capyexpense",
    cat: "desktop",
    badge: "Desktop · soon",
    year: "2026",
    blurb:
      "The one that will live on your machine — a Tauri desktop app writing only to your own disk. Builds are not out yet.",
    note: "Coming soon",
    line: "The desktop one — writes only to your own disk.",
    plate: { src: "/plates/lab-5.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyOG",
    short: "OG",
    href: "/capyog",
    cat: "browser",
    badge: "OG",
    year: "2026",
    blurb:
      "OG images and social cards worth sharing — templates, sizes and accents composed in a live preview, then downloaded or copied. Nothing uploads.",
    note: "Cards, in-tab",
    line: "OG images & social cards, composed in your browser.",
    plate: { src: "/plates/lab-6.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyQR",
    short: "QR",
    href: "/capyqr",
    cat: "browser",
    badge: "QR",
    year: "2026",
    blurb:
      "Styled QR codes that prove they scan — payloads, colors, a logo, and an in-tab decoder before you export.",
    note: "Proof-scanned",
    line: "Styled QR codes, proven scannable in-tab.",
    plate: { src: "/plates/lab-7.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyResize",
    short: "Resize",
    href: "/capyresize",
    cat: "browser",
    badge: "Resize",
    year: "2026",
    blurb:
      "Resize, convert and favicon-pack without uploading — progressive-halving quality, honest byte counts, and a 16-pixel proof strip before you ship.",
    note: "Bytes, proven",
    line: "Resize, convert and favicon-pack, entirely in-tab.",
    plate: { src: "/plates/lab-8.webp", width: 896, height: 1200 },
  },
];

export const SUITE_SIZE = SUITE.length;

export const SUITE_NAMES = SUITE.map((tool) => tool.name);

/** Zero-padded index — the editorial "Nº 05" form. */
export const pad2 = (n: number) => String(n).padStart(2, "0");

/** "05" — wherever the copy counts the suite. */
export const SUITE_INDEX = pad2(SUITE_SIZE);

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

/** "five" — the spelled-out count, for copy that reads as prose. */
export const SUITE_WORD = WORDS[SUITE_SIZE] ?? String(SUITE_SIZE);

/** Capitalised, for the start of a sentence. */
export const SUITE_WORD_CAP = SUITE_WORD.charAt(0).toUpperCase() + SUITE_WORD.slice(1);

/** "a, b and c" — the Oxford-comma-free list the house copy uses. */
export function listOut(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const SUITE_LIST = listOut(SUITE_NAMES);

/** How many rows in the catalog carry each filter tag. */
export function countByCategory(cat: ToolCategory): number {
  return SUITE.filter((tool) => tool.cat === cat).length;
}

/** "02" — a tool's position in the suite, by route. Throws nothing; unknown
 *  routes fall back to the first slot rather than printing "NaN". */
export function suiteNumber(href: string): string {
  const at = SUITE.findIndex((tool) => tool.href === href);
  return pad2(at < 0 ? 1 : at + 1);
}

/**
 * How many columns a tool grid should lay out.
 *
 * Up to five, one column per tool — the catalog's widest and densest form, and
 * what every screenshot of it has shown. Past five it drops to four: a sixth
 * card on the five-column grid tightens every card *and* strands one alone on
 * the next row, which reads as broken rather than as a grid.
 */
export function gridColumns(count: number): number {
  return count <= 5 ? count : 4;
}
