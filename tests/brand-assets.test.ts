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
  { file: "public/brand/logo-dark.svg", disc: "#121212", animal: "#f9f9f7" },
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
