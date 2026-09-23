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
  /**
   * schema.org `applicationCategory` for this tool's SoftwareApplication
   * JSON-LD (`src/lib/capytools/structured-data.ts`). The vocabulary is coarse
   * — pick the closest of DeveloperApplication / DesignApplication /
   * MultimediaApplication / SecurityApplication / FinanceApplication /
   * UtilitiesApplication rather than inventing a value.
   */
  appCategory: string;
  year: string;
  /** The catalog card's sentence. */
  blurb: string;
  /** The Colophon's one-line note under the glyph. */
  note: string;
  /** The notes page's one-liner, shorter than `blurb`. */
  line: string;
  /**
   * Extra search terms for `/tools`, and nowhere else.
   *
   * The prose fields are written to READ well, which is not the same as
   * being searchable: nothing in CapyStrip's name, line or blurb contains
   * the word "exif", so the one term anyone looking for it would type
   * returned nothing at all. These are the words someone SEARCHES rather
   * than the words we would print - synonyms, file formats, and the model
   * and vendor names a tool actually works with.
   */
  keywords: readonly string[];
  plate: { src: string; width: number; height: number };
};

export const SUITE: SuiteTool[] = [
  {
    name: "CapyWrapped",
    short: "Wrapped",
    href: "/capywrapped",
    cat: "browser",
    badge: "Wrapped",
    appCategory: "DeveloperApplication",
    year: "2026",
    blurb:
      "Your GitHub year in a calm little card — contributions, a month-by-month trendline, stars and top languages.",
    note: "GitHub year",
    line: "Your GitHub year in a calm little card.",
    keywords: ["github", "contributions", "stats", "year in review", "languages", "streak"],
    plate: { src: "/plates/lab-1.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyImagine",
    short: "Imagine",
    href: "/capyimagine",
    cat: "browser",
    badge: "Imagine",
    appCategory: "DesignApplication",
    year: "2026",
    blurb:
      "Random image and video prompts, tuned in your engine's dialect — ratios, frames and negative clauses included.",
    note: "Prompt roulette",
    line: "Random image and video prompts, in your engine's dialect.",
    keywords: ["prompt", "midjourney", "flux", "sdxl", "gemini", "video", "random", "ai art"],
    plate: { src: "/plates/lab-2.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyCreator",
    short: "Creator",
    href: "/capycreator",
    cat: "browser",
    badge: "Create",
    appCategory: "DeveloperApplication",
    year: "2026",
    blurb:
      "Model-aware prompt engineering scaled from flash to frontier — intent elucidation, assembly, optional polish.",
    note: "Model-aware",
    line: "Model-aware prompt engineering, flash to frontier.",
    keywords: ["prompt", "engineering", "claude", "gpt", "deepseek", "qwen", "llm", "system prompt"],
    plate: { src: "/plates/lab-3.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyStrip",
    short: "Strip",
    href: "/capystrip",
    cat: "browser",
    badge: "Strip",
    appCategory: "SecurityApplication",
    year: "2026",
    blurb:
      "Photos talk; this helps them forget. Reads every metadata trail, strips it in-tab, then proves the strip.",
    note: "Metadata off",
    line: "Photos talk; this helps them forget.",
    keywords: ["image", "exif", "metadata", "gps", "privacy", "photo", "strip", "location", "c2pa"],
    plate: { src: "/plates/lab-4.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyExpense",
    short: "Expense",
    href: "/capyexpense",
    cat: "desktop",
    badge: "Desktop · soon",
    appCategory: "FinanceApplication",
    year: "2026",
    blurb:
      "The one that will live on your machine — a Tauri desktop app writing only to your own disk. Builds are not out yet.",
    note: "Coming soon",
    line: "The desktop one — writes only to your own disk.",
    keywords: ["budget", "spending", "expenses", "spreadsheet", "tauri", "offline", "finance"],
    plate: { src: "/plates/lab-5.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyOG",
    short: "OG",
    href: "/capyog",
    cat: "browser",
    badge: "OG",
    appCategory: "DesignApplication",
    year: "2026",
    blurb:
      "OG images and social cards worth sharing — templates, sizes and accents composed in a live preview, then downloaded or copied. Nothing uploads.",
    note: "Cards, in-tab",
    line: "OG images & social cards, composed in your browser.",
    keywords: ["open graph", "social card", "twitter", "linkedin", "preview", "1200x630", "share image"],
    plate: { src: "/plates/lab-6.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyQR",
    short: "QR",
    href: "/capyqr",
    cat: "browser",
    badge: "QR",
    appCategory: "UtilitiesApplication",
    year: "2026",
    blurb:
      "Styled QR codes that prove they scan — payloads, colors, a logo, and an in-tab decoder before you export.",
    note: "Proof-scanned",
    line: "Styled QR codes, proven scannable in-tab.",
    keywords: ["qr code", "wifi", "vcard", "scan", "barcode", "link", "contact"],
    plate: { src: "/plates/lab-7.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyResize",
    short: "Resize",
    href: "/capyresize",
    cat: "browser",
    badge: "Resize",
    appCategory: "MultimediaApplication",
    year: "2026",
    blurb:
      "Resize, convert and favicon-pack without uploading — progressive-halving quality, honest byte counts, and a 16-pixel proof strip before you ship.",
    note: "Bytes, proven",
    line: "Resize, convert and favicon-pack, entirely in-tab.",
    keywords: ["image", "favicon", "icon", "resize", "convert", "webp", "png", "jpeg", "compress", "ico"],
    plate: { src: "/plates/lab-8.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyToken",
    short: "Token",
    href: "/capytoken",
    cat: "browser",
    badge: "Token",
    appCategory: "DeveloperApplication",
    year: "2026",
    blurb:
      "Count tokens exactly, price them across every model that matters — offline, keyless, with a verified-date stamp on the rates.",
    note: "Count, then cost",
    line: "Exact token counts and model costs, offline.",
    keywords: ["tokenizer", "tiktoken", "cost", "pricing", "context window", "gpt", "count", "o200k"],
    plate: { src: "/plates/lab-9.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyPixel",
    short: "Pixel",
    href: "/capypixel",
    cat: "browser",
    badge: "Pixel",
    appCategory: "MultimediaApplication",
    year: "2026",
    blurb:
      "Photos and logos into pixel art — six measured styles from Game Boy to a seven-blue brand ramp, live preview, crisp export. Nothing uploads.",
    note: "Chunky, honest",
    line: "Pixel-art photos and logos, entirely in-tab.",
    keywords: ["image", "pixel art", "dither", "game boy", "quantize", "retro", "8-bit", "palette"],
    plate: { src: "/plates/lab-10.webp", width: 896, height: 1200 },
  },
  {
    name: "CapyTone",
    short: "Tone",
    href: "/capytone",
    cat: "browser",
    badge: "Tone",
    appCategory: "DesignApplication",
    year: "2026",
    blurb:
      "Type a feeling, get a poster — a hand-tuned lexicon builds a deterministic five-role palette and a shareable card. No AI, nothing stored.",
    note: "Moods, in colour",
    line: "Mood phrases into palette posters, deterministically.",
    keywords: ["palette", "colour", "color", "poster", "mood", "hex", "swatch", "contrast", "brand"],
    plate: { src: "/plates/lab-11.webp", width: 896, height: 1200 },
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
  "eleven",
] as const;

/** 7 → "seven": any count, spelled out for prose; digits past the table. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "five" — the spelled-out count, for copy that reads as prose. */
export const SUITE_WORD = numberWord(SUITE_SIZE);

/** Capitalised, for the start of a sentence. */
export const SUITE_WORD_CAP = SUITE_WORD.charAt(0).toUpperCase() + SUITE_WORD.slice(1);

/** "a, b and c" — the Oxford-comma-free list the house copy uses. */
export function listOut(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

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
