import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SUITE } from "../src/lib/capytools/suite";
import { DEMO_CARD } from "../src/lib/capyog/demo";
import { buildExportOptions, buildFileName } from "../src/lib/capyog/export";
import { DEFAULT_SIZE_ID, SIZE_PRESETS } from "../src/lib/capyog/sizes";
import {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_IDS,
  TEMPLATE_PRESETS,
} from "../src/lib/capyog/templates";
import { accentTokens } from "../src/lib/capyog/themes";
import type { OgAccent, OgFieldKey, OgVariant } from "../src/lib/capyog/types";

const FIELD_KEYS: OgFieldKey[] = [
  "eyebrow",
  "title",
  "titleEm",
  "subtitle",
  "big",
  "attribution",
  "tag",
];

describe("CapyOG sizes", () => {
  it("ships the six documented presets, uniquely identified", () => {
    expect(SIZE_PRESETS).toHaveLength(6);
    expect(new Set(SIZE_PRESETS.map((preset) => preset.id)).size).toBe(6);
  });

  it("uses positive integer dimensions", () => {
    for (const preset of SIZE_PRESETS) {
      expect(Number.isInteger(preset.width)).toBe(true);
      expect(Number.isInteger(preset.height)).toBe(true);
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
    }
  });

  it("defaults to the 1200×630 link card", () => {
    expect(DEFAULT_SIZE_ID).toBe("link");
    const link = SIZE_PRESETS.find((preset) => preset.id === "link");
    expect(link?.width).toBe(1200);
    expect(link?.height).toBe(630);
  });

  it("every preset carries its honest calibration note", () => {
    for (const preset of SIZE_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.platforms.length).toBeGreaterThan(0);
      expect(preset.note.length).toBeGreaterThan(0);
    }
  });
});

describe("CapyOG templates", () => {
  it("only declares known field keys, in every schema", () => {
    for (const id of TEMPLATE_IDS) {
      expect(TEMPLATE_PRESETS[id].fields.length).toBeGreaterThan(0);
      for (const field of TEMPLATE_PRESETS[id].fields) {
        expect(FIELD_KEYS).toContain(field);
      }
    }
  });

  it("the demo card satisfies every template's schema", () => {
    for (const id of TEMPLATE_IDS) {
      for (const field of TEMPLATE_PRESETS[id].fields) {
        expect(DEMO_CARD[field].length, `${id} needs a filled ${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("the default template exists in the registry", () => {
    expect(TEMPLATE_IDS).toContain(DEFAULT_TEMPLATE_ID);
    expect(DEFAULT_TEMPLATE_ID).toBe("statement");
  });
});

describe("CapyOG themes", () => {
  const ACCENTS: OgAccent[] = ["sage", "clay", "water", "gold"];
  const VARIANTS: OgVariant[] = ["light", "dark"];

  it("resolves all 4 accents × 2 variants", () => {
    for (const accent of ACCENTS) {
      for (const variant of VARIANTS) {
        const theme = accentTokens(accent, variant);
        for (const key of ["bg", "ink", "muted", "border", "accent", "accentInk", "track"]) {
          expect(theme[key as keyof typeof theme].length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("accent values match the design tokens", () => {
    expect(accentTokens("sage", "light").accent).toBe("#8e9b7e");
    expect(accentTokens("sage", "dark").accent).toBe("#9aab8d");
    expect(accentTokens("clay", "light").accent).toBe("#c07952");
    expect(accentTokens("clay", "dark").accent).toBe("#d68f66");
    expect(accentTokens("water", "light").accent).toBe("#5f7a72");
    expect(accentTokens("water", "dark").accent).toBe("#7fa9a3");
    expect(accentTokens("gold", "light").accent).toBe("#d9a441");
    expect(accentTokens("gold", "dark").accent).toBe("#e3b25e");
  });

  it("surfaces mirror CardArt's palette", () => {
    expect(accentTokens("sage", "light").bg).toBe("#ffffff");
    expect(accentTokens("sage", "light").ink).toBe("#1a1a1a");
    expect(accentTokens("sage", "light").border).toBe("#e7e4dd");
    expect(accentTokens("sage", "dark").bg).toBe("#1e1e1e");
    expect(accentTokens("sage", "dark").ink).toBe("#e8e6e2");
    expect(accentTokens("sage", "dark").border).toBe("#2e2d2a");
  });

  it("the ink on an accent is always the dark ink — never white (WCAG)", () => {
    for (const accent of ACCENTS) {
      for (const variant of VARIANTS) {
        expect(accentTokens(accent, variant).accentInk).toBe("#141412");
      }
    }
  });
});

describe("CapyOG export naming and options", () => {
  it("builds the golden filenames", () => {
    expect(
      buildFileName({ template: "statement", width: 1200, height: 630, scale: 2, format: "png" }),
    ).toBe("capyog-statement-1200x630@2x.png");
    expect(
      buildFileName({ template: "quote", width: 1080, height: 1920, scale: 1, format: "jpeg" }),
    ).toBe("capyog-quote-1080x1920@1x.jpg");
    expect(
      buildFileName({ template: "stat", width: 1000, height: 1500, scale: 3, format: "png" }),
    ).toBe("capyog-stat-1000x1500@3x.png");
  });

  it("png carries the pixel ratio and no flattening background", () => {
    expect(
      buildExportOptions({ width: 1200, height: 630, scale: 3, format: "png", filename: "x.png" }),
    ).toEqual({ format: "png", width: 1200, height: 630, pixelRatio: 3, cacheBust: true });
  });

  it("jpeg carries the quality slider and the card's own background", () => {
    const opts = buildExportOptions({
      width: 1280,
      height: 720,
      scale: 2,
      format: "jpeg",
      quality: 0.6,
      background: "#1e1e1e",
      filename: "x.jpg",
    });
    expect(opts.format).toBe("jpeg");
    expect(opts.pixelRatio).toBe(2);
    expect(opts.quality).toBe(0.6);
    expect(opts.backgroundColor).toBe("#1e1e1e");
  });

  it("jpeg quality defaults to 0.92", () => {
    const opts = buildExportOptions({
      width: 1200,
      height: 630,
      scale: 1,
      format: "jpeg",
      filename: "x.jpg",
    });
    expect(opts.quality).toBe(0.92);
    expect(opts.backgroundColor).toBe("#ffffff");
  });
});

describe("CapyOG registration", () => {
  it("CapyOG is tool no. 6 in the suite registry", () => {
    const at = SUITE.findIndex((tool) => tool.href === "/capyog");
    expect(at).toBe(5);
    expect(SUITE[at].name).toBe("CapyOG");
    // The plan's scope: a browser tool — no server route, no storage.
    expect(SUITE[at].cat).toBe("browser");
  });

  it("the README carries the tool's section and the count", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    expect(readme).toContain("## 6. CapyOG");
    expect(readme).toContain("Six so far");
  });
});
