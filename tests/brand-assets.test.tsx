import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The brand mark, as files.
 *
 * Every failure these catch is silent in a browser: an icon that 404s just
 * shows the default globe, a logo whose viewBox went missing renders at a
 * fixed size and nobody notices until it is in a listing, and a colour that
 * drifted off-token is only wrong next to the rest of the site.
 */

const svg = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const VARIANTS = [
  { file: "public/brand/logo.svg", disc: "#8e9b7e", animal: "#f9f9f7" },
  { file: "public/brand/logo-dark.svg", disc: "#f9f9f7", animal: "#121212" },
];

describe("brand SVGs", () => {
  for (const { file, disc, animal } of VARIANTS) {
    it(`${file} uses the brand tokens, not sampled approximations`, () => {
      const s = svg(file);
      expect(s).toContain(disc);
      expect(s).toContain(animal);
    });
  }

  it("the mono mark carries no disc and one ink colour", () => {
    const s = svg("public/brand/logo-mono.svg");
    expect(s).not.toContain("<circle");
    expect(s).toContain("#121212");
    expect(s).not.toContain("#8e9b7e");
  });

  for (const file of [...VARIANTS.map((v) => v.file), "public/brand/logo-mono.svg"]) {
    it(`${file} has a viewBox, so it can scale at all`, () => {
      // VTracer does not emit one. Without it the mark renders at its
      // intrinsic size and every CSS width is ignored.
      expect(svg(file)).toMatch(/viewBox="[-\d. ]+"/);
    });

    it(`${file} carries no raster payload`, () => {
      expect(svg(file)).not.toContain("data:image");
    });
  }

  it("each file matches the tokens the rendered mark uses in that theme", () => {
    // The files and BrandMark are two statements of one logo. `logo-dark.svg`
    // drifted once already: it was charcoal-on-charcoal, which is invisible on
    // the charcoal page it was named for, and nothing rendered it so nothing
    // noticed. This binds them.
    const tokens = readFileSync(join(process.cwd(), "src/app/tokens.css"), "utf8");
    // Split on the BLOCK OPENERS, not the selector names: ".dark" also appears
    // in a comment and in the @custom-variant line above both blocks.
    const light = tokens.slice(tokens.indexOf(":root {"), tokens.indexOf(".dark {"));
    const dark = tokens.slice(tokens.indexOf(".dark {"));
    const value = (block: string, name: string) =>
      // `[^#]*` rather than a backslash class: this is a template literal, and
      // `\s` in one is just the letter s.
      new RegExp(`--${name}:[^#]*(#[0-9a-fA-F]{6})`).exec(block)?.[1].toLowerCase();

    expect(value(light, "brand-disc")).toBe("#8e9b7e");
    expect(value(light, "brand-ink")).toBe("#f9f9f7");
    expect(value(dark, "brand-disc")).toBe("#f9f9f7");
    expect(value(dark, "brand-ink")).toBe("#121212");

    expect(svg("public/brand/logo.svg")).toContain(value(light, "brand-disc")!);
    expect(svg("public/brand/logo-dark.svg")).toContain(value(dark, "brand-disc")!);
  });

  it("the dark mark is visible on the dark page it is for", () => {
    // The bug this replaces: a #121212 disc on a #121212 canvas is a 1.00:1
    // disc — the animal floated with no container at all.
    expect(svg("public/brand/logo-dark.svg")).not.toMatch(/<circle[^>]*fill="#121212"/);
  });

  it("the two disc variants are the same drawing, only recoloured", () => {
    // If these ever diverge, the light and dark favicons are different animals.
    const strip = (s: string) => s.replace(/#[0-9a-fA-F]{6}/g, "");
    expect(strip(svg("public/brand/logo.svg"))).toBe(strip(svg("public/brand/logo-dark.svg")));
  });
});

describe("generated icons", () => {
  const files = [
    "src/app/favicon.ico",
    "src/app/icon.svg",
    "src/app/apple-icon.png",
    "public/brand/logo-512.png",
  ];

  for (const f of files) {
    it(`${f} exists and is not empty`, () => {
      const p = join(process.cwd(), f);
      expect(existsSync(p), f).toBe(true);
      expect(statSync(p).size).toBeGreaterThan(512);
    });
  }

  it("icon.svg is the sage mark, byte-identical to the public copy", () => {
    // Two files, one drawing. A hand-edit to either is the drift this catches.
    expect(svg("src/app/icon.svg")).toBe(svg("public/brand/logo.svg"));
  });
});

describe("BrandMark, the inline copy", () => {
  it("draws every path the file draws — two copies of a logo silently drift", async () => {
    const { BRAND_PATHS, BRAND_VIEWBOX } = await import("../src/lib/capytools/brand-paths");
    const file = svg("public/brand/logo.svg");
    expect(BRAND_PATHS).toHaveLength(5);
    for (const d of BRAND_PATHS) expect(file).toContain(d);
    expect(file).toContain(`viewBox="${BRAND_VIEWBOX}"`);
  });

  it("renders the disc and all five paths, themed by token", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { BrandMark } = await import("../src/components/brand-mark");
    const html = renderToStaticMarkup(<BrandMark />);

    expect(html).toContain("<circle");
    expect((html.match(/<path/g) ?? []).length).toBe(5);
    // evenodd is load-bearing: without it the eye and the toe gaps fill solid.
    expect(html).toContain('fill-rule="evenodd"');
    // Tokens, not literals — the sage lifts in dark mode, the ink does not.
    expect(html).toContain("var(--brand-disc)");
    expect(html).toContain("var(--brand-ink)");
    expect(html).toContain('aria-hidden="true"');
  });

  it("no longer draws the placeholder line glyph", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { BrandMark } = await import("../src/components/brand-mark");
    // CapyMark strokes with currentColor; the real mark fills with its own.
    expect(renderToStaticMarkup(<BrandMark />)).not.toContain("currentColor");
  });
});
