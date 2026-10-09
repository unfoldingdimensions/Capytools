import { describe, expect, it } from "vitest";

import {
  ALPHA_MIN,
  clientToPixel,
  colourFormats,
  fitWithin,
  paletteFromPixels,
  rgbToHex,
} from "../src/lib/capytone/image";
import { rankCounts } from "../src/lib/capytone/extract/rank";
import { cssTokens, cssVariables, tailwindColors, tailwindTokens } from "../src/lib/capytone/export";

/** RGBA bytes from [r,g,b,a,count] runs. */
function pixels(...runs: [number, number, number, number, number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [r, g, b, a, n] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return Uint8ClampedArray.from(out);
}

describe("paletteFromPixels", () => {
  it("ranks by coverage and reports each colour's pixel count", () => {
    const { colours, sampled } = paletteFromPixels(
      pixels([255, 0, 0, 255, 60], [0, 0, 255, 255, 30], [0, 255, 0, 255, 10]),
    );
    expect(sampled).toBe(100);
    expect(colours.map((c) => [c.hex, c.count])).toEqual([
      ["#ff0000", 60],
      ["#0000ff", 30],
      ["#00ff00", 10],
    ]);
  });

  it("represents a bin by the mean of its pixels, not a corner of the bin", () => {
    // 0x20 and 0x2f share a 4-bit bin; the swatch is their mean, 0x28 (rounded).
    const { colours } = paletteFromPixels(pixels([0x20, 0x20, 0x20, 255, 1], [0x2f, 0x2f, 0x2f, 255, 1]));
    expect(colours).toHaveLength(1);
    expect(colours[0].hex).toBe(rgbToHex(0x28, 0x28, 0x28));
  });

  it("merges near-identical colours into one swatch", () => {
    const { colours } = paletteFromPixels(pixels([200, 40, 40, 255, 5], [203, 42, 41, 255, 3], [10, 10, 200, 255, 4]));
    expect(colours).toHaveLength(2);
    expect(colours[0].count).toBe(8);
  });

  it("skips see-through pixels instead of counting them as black", () => {
    const { colours, sampled } = paletteFromPixels(pixels([0, 0, 0, 0, 50], [9, 99, 199, ALPHA_MIN, 5]));
    expect(sampled).toBe(5);
    expect(colours).toHaveLength(1);
    expect(colours[0].hex).toBe("#0963c7");
  });

  it("returns nothing for a fully transparent image and for no pixels", () => {
    expect(paletteFromPixels(pixels([1, 2, 3, 0, 20])).colours).toEqual([]);
    expect(paletteFromPixels(new Uint8ClampedArray(0))).toEqual({ colours: [], sampled: 0 });
  });

  it("is deterministic and never returns more than twelve swatches", () => {
    const runs: [number, number, number, number, number][] = [];
    for (let i = 0; i < 40; i++) runs.push([(i * 37) % 256, (i * 91) % 256, (i * 151) % 256, 255, 1 + (i % 5)]);
    const data = pixels(...runs);
    const a = paletteFromPixels(data);
    expect(a).toEqual(paletteFromPixels(data));
    expect(a.colours.length).toBeLessThanOrEqual(12);
  });
});

describe("rankCounts", () => {
  it("orders by merged weight, not by the leader's own count", () => {
    const counts = new Map([
      ["#c82828", { count: 5, source: "t" }],
      ["#0a0ac8", { count: 4, source: "t" }],
      ["#0b0bc7", { count: 3, source: "t" }],
    ]);
    expect(rankCounts(counts).map((c) => [c.hex, c.count])).toEqual([
      ["#0a0ac8", 7],
      ["#c82828", 5],
    ]);
  });
});

describe("clientToPixel", () => {
  const rect = { left: 100, top: 50, width: 300, height: 200 };

  it("maps a click at any displayed size onto the image grid", () => {
    // A 4000×2000 photo shown at 300×200: x scales 13.33×, y 10×.
    expect(clientToPixel(100, 50, rect, 4000, 2000)).toEqual({ x: 0, y: 0 });
    expect(clientToPixel(250, 150, rect, 4000, 2000)).toEqual({ x: 2000, y: 1000 });
    expect(clientToPixel(399.99, 249.99, rect, 4000, 2000)).toEqual({ x: 3999, y: 1999 });
    // The same click on a 30×20 image lands on its own grid.
    expect(clientToPixel(250, 150, rect, 30, 20)).toEqual({ x: 15, y: 10 });
  });

  it("clamps a click on the edge or just outside to a real pixel", () => {
    expect(clientToPixel(400, 250, rect, 4000, 2000)).toEqual({ x: 3999, y: 1999 });
    expect(clientToPixel(90, 40, rect, 4000, 2000)).toEqual({ x: 0, y: 0 });
  });
});

describe("fitWithin", () => {
  it("shrinks by the long side, keeps the aspect and never upscales", () => {
    expect(fitWithin(4032, 3024, 400)).toEqual({ w: 400, h: 300 });
    expect(fitWithin(3024, 4032, 400)).toEqual({ w: 300, h: 400 });
    expect(fitWithin(200, 100, 400)).toEqual({ w: 200, h: 100 });
    expect(fitWithin(10000, 1, 400)).toEqual({ w: 400, h: 1 });
  });
});

describe("colourFormats", () => {
  it("gives hex, rgb() and hsl() for one colour", () => {
    expect(colourFormats("#ff8000")).toEqual({ hex: "#ff8000", rgb: "rgb(255, 128, 0)", hsl: "hsl(30, 100%, 50%)" });
  });
});

describe("token exporters", () => {
  const palette = {
    mood: "Test",
    slug: "test-slug",
    seed: "abc",
    bg: "#111111",
    mid: "#222222",
    accent: "#333333",
    surface: "#444444",
    ink: "#555555",
    grain: 0.5,
  };

  it("keeps the mood palette's output byte for byte", () => {
    expect(cssTokens(palette)).toBe(
      [
        "--capytone-test-slug-bg: #111111;",
        "--capytone-test-slug-mid: #222222;",
        "--capytone-test-slug-accent: #333333;",
        "--capytone-test-slug-surface: #444444;",
        "--capytone-test-slug-ink: #555555;",
        "/* camelCase alias: testSlug */",
      ].join("\n"),
    );
    expect(tailwindTokens(palette)).toBe(
      [
        "// tailwind.config — theme.extend.colors",
        '"test-slug": {',
        '  bg: "#111111",',
        '  mid: "#222222",',
        '  accent: "#333333",',
        '  surface: "#444444",',
        '  ink: "#555555",',
        "},",
      ].join("\n"),
    );
  });

  it("writes the image palette through the same exporters", () => {
    const roles = [
      ["1", "#aa0000"],
      ["2", "#00bb00"],
    ] as const;
    expect(cssVariables("image", roles)).toBe("--capytone-image-1: #aa0000;\n--capytone-image-2: #00bb00;");
    expect(tailwindColors("image", roles)).toContain('  2: "#00bb00",');
  });
});
