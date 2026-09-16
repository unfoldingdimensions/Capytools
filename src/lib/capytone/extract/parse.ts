/**
 * The Extract parser — static source in, colour occurrences out.
 *
 * Colours are read from a css-tree AST (plan §3.5: no regex false positives)
 * and normalised through culori. Alpha≈0 colours and `transparent` are
 * dropped; everything else is flattened to a solid sRGB hex (formatHex).
 * Functional notations are re-sliced from the original source text via the
 * AST's position data, so rgb()/hsl()/oklch()/color() pass through exactly
 * as written, while colour-bearing functions culori cannot parse (e.g.
 * color-mix) still contribute their inner literals via the child walk.
 *
 * HTML structure (meta/link/style/style-attributes) is scanned with small
 * tag-scoped regexes — the regexes only ever find markup, never colours;
 * every colour decision still belongs to css-tree + culori.
 */

import { parse as cssParse, type CssNode } from "css-tree";
import { colorsNamed as NAMED_COLOUR_TABLE, formatHex, parse as parseColour } from "culori";

export interface ColourOccurrence {
  hex: string;
  /** Where the occurrence was read from: "stylesheet" or "inline". */
  source: string;
}

/** CSS functional notations that carry colours as arguments. */
const COLOUR_FUNCTIONS = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "device-cmyk",
  "color-mix",
]);

const NAMED_COLOURS = new Set([...Object.keys(NAMED_COLOUR_TABLE), "transparent"]);

/** Normalise one candidate into a hex occurrence, or null. */
function toOccurrence(candidate: string, source: string): ColourOccurrence | null {
  const colour = parseColour(candidate.trim());
  if (!colour) return null;
  if ((colour.alpha ?? 1) < 0.01) return null; // alpha≈0 / transparent
  const hex = formatHex(colour);
  return hex ? { hex, source } : null;
}

function isNode(value: unknown): value is CssNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

/** Depth-first walk over every node the parsed AST links to. css-tree keeps
 * subtrees in named properties (prelude, block, value…) as well as children
 * lists, so the walk follows both shapes. */
function walk(node: CssNode, enter: (node: CssNode) => void): void {
  enter(node);
  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) if (isNode(item)) walk(item, enter);
    } else if (isNode(child)) {
      walk(child, enter);
    } else if (
      typeof child === "object" &&
      child !== null &&
      typeof (child as { forEach?: unknown }).forEach === "function"
    ) {
      (child as { forEach(cb: (item: CssNode) => void): void }).forEach((item) =>
        walk(item, enter),
      );
    }
  }
}

function collectColours(
  node: CssNode,
  sourceText: string,
  source: string,
  out: ColourOccurrence[],
): void {
  // css-tree 3.x spells hex colours "Hash" (selector ids share the type, but
  // this walk only ever sees declaration values).
  if (node.type === "Hash" && typeof node.value === "string") {
    const hit = toOccurrence(`#${node.value}`, source);
    if (hit) out.push(hit);
  } else if (node.type === "Function" && typeof node.name === "string") {
    if (COLOUR_FUNCTIONS.has(node.name.toLowerCase()) && node.loc) {
      const hit = toOccurrence(sourceText.slice(node.loc.start.offset, node.loc.end.offset), source);
      if (hit) out.push(hit);
    }
  } else if (node.type === "Identifier" && typeof node.name === "string") {
    const name = node.name.toLowerCase();
    if (NAMED_COLOURS.has(name)) {
      const hit = toOccurrence(name, source);
      if (hit) out.push(hit);
    }
  }
  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) if (isNode(item)) collectColours(item, sourceText, source, out);
    } else if (isNode(child)) {
      collectColours(child, sourceText, source, out);
    } else if (
      typeof child === "object" &&
      child !== null &&
      typeof (child as { forEach?: unknown }).forEach === "function"
    ) {
      (child as { forEach(cb: (item: CssNode) => void): void }).forEach((item) =>
        collectColours(item, sourceText, source, out),
      );
    }
  }
}

/** Parse CSS and pull every colour-bearing declaration. `context` is
 * "declarationList" for inline style="…" attributes, "stylesheet" otherwise.
 * Malformed CSS yields an empty list, never a throw — a broken stylesheet
 * must not sink the page. */
export function extractFromCss(
  cssText: string,
  source: string,
  context: "stylesheet" | "declarationList" = "stylesheet",
): ColourOccurrence[] {
  let ast: CssNode;
  try {
    ast = cssParse(cssText, {
      context,
      positions: true,
      parseValue: true,
      parseCustomProperty: true,
    });
  } catch {
    return [];
  }
  const out: ColourOccurrence[] = [];
  walk(ast, (node) => {
    if (node.type !== "Declaration") return;
    if (typeof node.value === "string" || !isNode(node.value)) return;
    collectColours(node.value, cssText, source, out);
  });
  return out;
}

export interface ThemeColour {
  hex: string;
  /** The meta element's media query, when it had one. */
  media: string | null;
  from: "meta" | "manifest";
}

export interface PageStats {
  htmlBytes: number;
  styleBlocks: number;
  inlineStyles: number;
  stylesheetsFetched: number;
  stylesheetsFailed: number;
  stylesheetsSkipped: number;
  cssBytes: number;
  colourValues: number;
}

export interface PageExtraction {
  occurrences: ColourOccurrence[];
  themeColors: ThemeColour[];
  stats: PageStats;
}

export const MAX_STYLESHEETS = 5;

/** An href that points back over http(s) and can be guarded; everything
 * else (data:, javascript:, fragment-only) is out of fetch scope. */
function resolvableHref(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.href;
  } catch {
    return null;
  }
}

function getAttr(tag: string, name: string): string | null {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const hit = tag.match(pattern);
  if (!hit) return null;
  return hit[1] ?? hit[2] ?? hit[3] ?? "";
}

/** The pure half of the HTML extraction: locate signals, fetch nothing. */
export function scanHtml(
  html: string,
  baseUrl: string,
): {
  styleBodies: string[];
  inlineStyles: string[];
  stylesheetHrefs: string[];
  manifestHref: string | null;
  metaThemeColors: ThemeColour[];
} {
  const styleBodies: string[] = [];
  for (const hit of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    styleBodies.push(hit[1]);
  }

  const inlineStyles: string[] = [];
  for (const hit of html.matchAll(/style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const body = hit[1] ?? hit[2] ?? hit[3];
    if (body) inlineStyles.push(body);
  }

  const stylesheetHrefs: string[] = [];
  let manifestHref: string | null = null;
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (getAttr(tag[0], "rel") ?? "").toLowerCase();
    const href = getAttr(tag[0], "href");
    if (!href || rel === "") continue;
    const rels = rel.split(/\s+/);
    const resolved = resolvableHref(href, baseUrl);
    if (!resolved) continue;
    if (rels.includes("stylesheet")) stylesheetHrefs.push(resolved);
    if (rels.includes("manifest") && manifestHref === null) manifestHref = resolved;
  }

  const metaThemeColors: ThemeColour[] = [];
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = (getAttr(tag[0], "name") ?? getAttr(tag[0], "property") ?? "").trim().toLowerCase();
    if (name !== "theme-color") continue;
    const content = getAttr(tag[0], "content");
    if (!content) continue;
    const colour = parseColour(content.trim());
    if (!colour || (colour.alpha ?? 1) < 0.01) continue;
    const hex = formatHex(colour);
    if (!hex) continue;
    const media = (getAttr(tag[0], "media") ?? "").trim();
    metaThemeColors.push({ hex, media: media === "" ? null : media, from: "meta" });
  }

  return { styleBodies, inlineStyles, stylesheetHrefs, manifestHref, metaThemeColors };
}

/** The manifest only ever contributes two keys, and only its JSON shape is
 * read — the body is never stored or echoed. */
function coloursFromManifest(manifest: unknown): ThemeColour[] {
  if (typeof manifest !== "object" || manifest === null) return [];
  const record = manifest as Record<string, unknown>;
  const out: ThemeColour[] = [];
  for (const key of ["theme_color", "background_color"] as const) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const colour = parseColour(value.trim());
    if (!colour || (colour.alpha ?? 1) < 0.01) continue;
    const hex = formatHex(colour);
    if (hex) out.push({ hex, media: null, from: "manifest" });
  }
  return out;
}

const textBytes = (text: string): number => new TextEncoder().encode(text).length;

/**
 * The HTML half of the plan's extraction scope (§7b.2): the document's style
 * blocks and inline styles, meta theme-color (with media), then — through
 * the injected, already-guarded fetchers — the top ≤5 stylesheets and the
 * manifest. A failed stylesheet or manifest is a stat, not an error.
 */
export async function extractFromHtml(
  html: string,
  baseUrl: string,
  deps: {
    fetchStylesheet(href: string): Promise<{ text: string; bytes: number } | null>;
    fetchManifest(href: string): Promise<unknown | null>;
  },
): Promise<PageExtraction> {
  const scan = scanHtml(html, baseUrl);

  const occurrences: ColourOccurrence[] = [];
  for (const body of scan.styleBodies) {
    occurrences.push(...extractFromCss(body, "stylesheet"));
  }
  for (const body of scan.inlineStyles) {
    occurrences.push(...extractFromCss(body, "inline", "declarationList"));
  }

  let stylesheetsFetched = 0;
  let stylesheetsFailed = 0;
  let cssBytes = 0;
  const candidates = scan.stylesheetHrefs.slice(0, MAX_STYLESHEETS);
  for (const href of candidates) {
    const sheet = await deps.fetchStylesheet(href);
    if (!sheet) {
      stylesheetsFailed += 1;
      continue;
    }
    stylesheetsFetched += 1;
    cssBytes += sheet.bytes;
    occurrences.push(...extractFromCss(sheet.text, "stylesheet"));
  }

  const themeColors = [...scan.metaThemeColors];
  if (scan.manifestHref) {
    const manifest = await deps.fetchManifest(scan.manifestHref);
    if (manifest !== null) themeColors.push(...coloursFromManifest(manifest));
  }

  return {
    occurrences,
    themeColors,
    stats: {
      htmlBytes: textBytes(html),
      styleBlocks: scan.styleBodies.length,
      inlineStyles: scan.inlineStyles.length,
      stylesheetsFetched,
      stylesheetsFailed,
      stylesheetsSkipped: Math.max(0, scan.stylesheetHrefs.length - MAX_STYLESHEETS),
      cssBytes,
      colourValues: occurrences.length,
    },
  };
}
