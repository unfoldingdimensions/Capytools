import { describe, expect, it } from "vitest";

import { FREE_BATCH_LIMIT, runBatch } from "../src/lib/capystamp/batch";
import { DEMO_SPEC } from "../src/lib/capystamp/demo";
import {
  MAX_TILES,
  SAFE_MARGIN,
  anchorPoint,
  logoBox,
  markBox,
  textFontSize,
  tilePositions,
} from "../src/lib/capystamp/geometry";
import {
  FACES,
  familyListFromVar,
  fontString,
  resolveFamilyList,
} from "../src/lib/capystamp/fonts";
import {
  addPreset,
  loadPresets,
  removePreset,
  MAX_PRESETS,
  PRESETS_KEY,
  type PresetStore,
} from "../src/lib/capystamp/presets";
import {
  DEFAULT_LOGO_SPEC,
  DEFAULT_TEXT_SPEC,
  clampSpec,
  parseSpec,
  serialiseSpec,
} from "../src/lib/capystamp/spec";
import { DecodeFailedError } from "../src/lib/capyresize/render";
import { stampBaseName, stampFilename, zipName } from "../src/lib/capystamp/names";
import type { Anchor, ItemStatus, LogoMark, StampResult, TextMark } from "../src/lib/capystamp/types";

// ——— geometry: the proportional-placement guarantee ———

const squareSpec = (over: Partial<TextMark> = {}): TextMark => ({
  ...DEFAULT_TEXT_SPEC,
  ...over,
});

describe("geometry — anchorPoint", () => {
  const W = 1000;
  const H = 1000;
  const box = { width: 100, height: 100 };
  // Pinned as a literal on purpose: 3% of the 1000px short side. Deriving it
  // from SAFE_MARGIN would make this test agree with whatever the constant
  // says, and the margin could silently become 0.
  const m = 30;

  const cases: Array<[Anchor, number, number]> = [
    ["tl", m, m],
    ["tc", (W - box.width) / 2, m],
    ["tr", W - box.width - m, m],
    ["ml", m, (H - box.height) / 2],
    ["mc", (W - box.width) / 2, (H - box.height) / 2],
    ["mr", W - box.width - m, (H - box.height) / 2],
    ["bl", m, H - box.height - m],
    ["bc", (W - box.width) / 2, H - box.height - m],
    ["br", W - box.width - m, H - box.height - m],
  ];

  it("places all nine anchors inside the safe margin", () => {
    expect(SAFE_MARGIN).toBe(0.03);
    for (const [anchor, x, y] of cases) {
      const placed = anchorPoint(anchor, W, H, box, 0, 0);
      expect(placed.x, anchor).toBeCloseTo(x, 6);
      expect(placed.y, anchor).toBeCloseTo(y, 6);
    }
  });

  it("keeps every anchor's box fully on the canvas", () => {
    for (const anchor of cases.map(([a]) => a)) {
      const placed = anchorPoint(anchor, W, H, box, 0, 0);
      expect(placed.x).toBeGreaterThanOrEqual(0);
      expect(placed.y).toBeGreaterThanOrEqual(0);
      expect(placed.x + box.width).toBeLessThanOrEqual(W);
      expect(placed.y + box.height).toBeLessThanOrEqual(H);
    }
  });

  it("a drag offset moves the box right/down from its anchored default", () => {
    // ml has canvas room in both directions, so the clamp stays out of the way.
    const placed = anchorPoint("ml", W, H, box, 0.1, 0.1);
    const rest = anchorPoint("ml", W, H, box, 0, 0);
    expect(placed.x).toBeCloseTo(rest.x + 0.1 * W, 6);
    expect(placed.y).toBeCloseTo(rest.y + 0.1 * H, 6);
  });

  it("never hangs off the canvas, even on a wild offset", () => {
    const low = anchorPoint("mc", W, H, box, 2, 2);
    expect(low.x).toBe(W - box.width);
    expect(low.y).toBe(H - box.height);
    const high = anchorPoint("mc", W, H, box, -2, -2);
    expect(high.x).toBe(0);
    expect(high.y).toBe(0);
  });

  it("centres a mark larger than the image instead of clamping negative", () => {
    const big = { width: 1400, height: 100 };
    const placed = anchorPoint("br", W, H, big, 0, 0);
    expect(placed.x).toBe((W - big.width) / 2);
  });
});

describe("geometry — one spec lands proportionally on every shape", () => {
  const spec = squareSpec({ size: 0.2, anchor: "br", offset: { x: 0, y: 0 } });

  const placements = [
    { w: 4000, h: 3000 },
    { w: 3000, h: 4000 },
    { w: 1080, h: 1080 },
  ].map(({ w, h }) => {
    const box = logoBox(w, h, spec, 1); // square logo → box scales with the short side
    return { w, h, placed: markBox(w, h, spec, box) };
  });

  it("the mark is the same fraction of the short side everywhere", () => {
    for (const { w, h, placed } of placements) {
      const side = Math.min(w, h);
      expect(placed.width / side).toBeCloseTo(0.2, 6);
      expect(placed.height / side).toBeCloseTo(0.2, 6);
      // distance from the anchored edges, in short-side fractions
      expect((w - placed.x - placed.width) / side).toBeCloseTo(SAFE_MARGIN, 6);
      expect((h - placed.y - placed.height) / side).toBeCloseTo(SAFE_MARGIN, 6);
    }
  });

  it("a drag offset also scales with the image, not the pixel count", () => {
    // 0.02 keeps margin + offset clear of the never-off-canvas clamp on all three.
    const dragged = { ...spec, offset: { x: 0.02, y: 0.02 } };
    for (const { w, h } of placements.map(({ w, h }) => ({ w, h }))) {
      const box = logoBox(w, h, dragged, 1);
      const placed = markBox(w, h, dragged, box);
      const sx = Math.min(w, h) / w;
      const sy = Math.min(w, h) / h;
      expect(placed.x / w).toBeCloseTo(1 - 0.2 * sx - SAFE_MARGIN * sx + 0.02, 6);
      expect(placed.y / h).toBeCloseTo(1 - 0.2 * sy - SAFE_MARGIN * sy + 0.02, 6);
    }
  });

  it("text sizes from the short side too", () => {
    expect(textFontSize(4000, 3000, spec)).toBe(600);
    expect(textFontSize(3000, 4000, spec)).toBe(600);
    expect(textFontSize(1080, 1080, spec)).toBeCloseTo(216, 6);
  });
});

describe("geometry — tilePositions", () => {
  it("no tiling, no tiles", () => {
    expect(tilePositions(1000, 1000, { width: 100, height: 100 }, "none", 0)).toEqual([]);
  });

  it("grid covers the image with the configured gap", () => {
    const box = { width: 100, height: 100 };
    const tiles = tilePositions(1000, 1000, box, "grid", 0);
    expect(tiles).toHaveLength(100); // 10 × 10
    const xs = new Set(tiles.map((t) => t.x));
    const ys = new Set(tiles.map((t) => t.y));
    expect(xs.size).toBe(10);
    expect(ys.size).toBe(10);
    // first centre at half a cell, last a half-cell from the far edge
    expect(tiles[0]).toEqual({ x: 50, y: 50 });
    expect(tiles[tiles.length - 1]).toEqual({ x: 950, y: 950 });
    // a gap shrinks the count: 100px marks with a full-mark gap → 5 × 5
    expect(tilePositions(1000, 1000, box, "grid", 1)).toHaveLength(25);
  });

  it("diagonal marches corner to corner", () => {
    const box = { width: 100, height: 100 };
    const tiles = tilePositions(1000, 1000, box, "diagonal", 0);
    expect(tiles.length).toBeGreaterThan(1);
    for (let i = 1; i < tiles.length; i++) {
      expect(tiles[i].x).toBeGreaterThan(tiles[i - 1].x);
      expect(tiles[i].y).toBeGreaterThan(tiles[i - 1].y);
    }
    expect(tiles[0].x).toBeLessThan(200);
    expect(tiles[tiles.length - 1].x).toBeGreaterThan(800);
  });

  it("a tiny mark at gap 0 hits the tile cap instead of looping forever", () => {
    const tiles = tilePositions(4000, 4000, { width: 5, height: 5 }, "grid", 0);
    expect(tiles.length).toBeLessThanOrEqual(MAX_TILES);
    expect(tiles.length).toBe(MAX_TILES);
  });

  it("non-square images still get full coverage", () => {
    const box = { width: 200, height: 100 };
    const tiles = tilePositions(4000, 1000, box, "grid", 0.5);
    expect(tiles.length).toBeGreaterThan(4);
    const maxX = Math.max(...tiles.map((t) => t.x));
    const maxY = Math.max(...tiles.map((t) => t.y));
    expect(maxX).toBeGreaterThan(4000 * 0.7);
    expect(maxY).toBeGreaterThan(1000 * 0.7);
  });
});

describe("geometry — logoBox", () => {
  it("keeps aspect with the longer side at size × short side", () => {
    const spec = squareSpec({ size: 0.25 });
    const wide = logoBox(2000, 1000, spec, 4);
    expect(wide).toEqual({ width: 250, height: 62.5 });
    const tall = logoBox(2000, 1000, spec, 0.5);
    expect(tall).toEqual({ width: 125, height: 250 });
  });

  it("survives a zero or absurd aspect", () => {
    const spec = squareSpec({ size: 0.25 });
    expect(logoBox(1000, 1000, spec, 0)).toEqual({ width: 250, height: 250 });
    expect(logoBox(1000, 1000, spec, Number.NaN)).toEqual({ width: 250, height: 250 });
  });
});

// ——— spec: defaults, clamps, round-trips ———

describe("spec", () => {
  it("the defaults validate for both kinds", () => {
    expect(parseSpec(structuredClone(DEFAULT_TEXT_SPEC))).toEqual(DEFAULT_TEXT_SPEC);
    expect(parseSpec(structuredClone(DEFAULT_LOGO_SPEC))).toEqual(DEFAULT_LOGO_SPEC);
    expect(parseSpec(structuredClone(DEMO_SPEC))).toEqual(DEMO_SPEC);
  });

  it("clamps size and opacity, wraps rotation", () => {
    const clamped = clampSpec(squareSpec({ size: 5, opacity: 0, rotation: 190, gap: 99 }));
    expect(clamped.size).toBe(0.5);
    expect(clamped.opacity).toBe(0.05);
    expect(clamped.rotation).toBe(-170);
    expect(clamped.gap).toBe(4);
    expect(clampSpec(squareSpec({ rotation: -270 })).rotation).toBe(90);
  });

  it("round-trips through serialise → parse for both kinds", () => {
    const text: TextMark = squareSpec({ text: "© Ada 2026", font: "system-serif", weight: 400, colour: "#1a1a1a", halo: "outline", tiling: "grid" });
    expect(parseSpec(JSON.parse(serialiseSpec(text)))).toEqual(clampSpec(text));
    const logo: LogoMark = { ...DEFAULT_LOGO_SPEC, tiling: "diagonal", rotation: -33.5 };
    expect(parseSpec(JSON.parse(serialiseSpec(logo)))).toEqual(clampSpec(logo));
  });

  it("rejects malformed input instead of repairing it", () => {
    expect(parseSpec(null)).toBeNull();
    expect(parseSpec("stamp")).toBeNull();
    expect(parseSpec({ kind: "wat" })).toBeNull();
    expect(parseSpec({ kind: "text", text: "   " })).toBeNull();
    expect(parseSpec({ kind: "text" })).toBeNull();
  });

  it("repairs what is merely out of range or mislabelled", () => {
    const parsed = parseSpec({
      kind: "text",
      text: "hi",
      size: 99,
      opacity: 42,
      anchor: "xx",
      tiling: "both",
      font: "comic-sans",
      colour: "red",
      weight: 950,
      halo: "glow",
      offset: { x: "no", y: 7 },
    });
    expect(parsed).toEqual(
      clampSpec(squareSpec({ text: "hi", offset: { x: 0, y: 7 }, halo: "none", size: 0.5, opacity: 1 })),
    );
  });
});

// ——— fonts: family lists, font strings, fallbacks ———

describe("fonts", () => {
  it("uses a next/font family list as-is, first name wins by CSS rules", () => {
    const value = "'__Fraunces_1a2b3c', '__Fraunces_Fallback_1a2b3c'";
    expect(familyListFromVar(value, "Georgia, serif")).toBe(value);
  });

  it("falls back when the variable is missing or blank", () => {
    expect(familyListFromVar(null, "system-ui, sans-serif")).toBe("system-ui, sans-serif");
    expect(familyListFromVar("   ", "Georgia, serif")).toBe("Georgia, serif");
  });

  it("resolves house faces from runtime CSS variables and system faces from stacks", () => {
    expect(resolveFamilyList("house-display", { "--font-display": "'Fraunces_X'" })).toBe("'Fraunces_X'");
    expect(resolveFamilyList("house-sans", {})).toBe(FACES["system-sans"].system); // var absent → stack
    expect(resolveFamilyList("system-serif", {})).toBe("Georgia, serif");
    expect(resolveFamilyList("system-mono", {})).toBe("ui-monospace, monospace");
  });

  it("an unknown choice falls back to the safe sans stack", () => {
    expect(resolveFamilyList("comic-sans" as never, {})).toBe(FACES["system-sans"].system);
  });

  it("builds `weight size family` strings", () => {
    expect(fontString(700, 64, "'Fraunces_X'")).toBe("700 64px 'Fraunces_X'");
    expect(fontString(Number.NaN, 0, "system-ui")).toBe("400 16px system-ui");
  });
});

// ——— batch: order, cap, resilience, cancel ———

describe("batch", () => {
  const file = (name: string): File => new File([`bytes-${name}`], name, { type: "image/png" });

  /** The real stampOne's shape minus canvas: names still dedupe through `taken`. */
  function makeFake(failOn?: (file: File) => boolean) {
    const calls: string[] = [];
    const fake = async (
      f: File,
      _spec: unknown,
      _out: unknown,
      _logo: unknown,
      opts?: { taken?: Set<string> },
    ): Promise<StampResult> => {
      if (failOn?.(f)) throw new DecodeFailedError();
      calls.push(f.name);
      return {
        name: stampFilename(f.name, "png", opts?.taken),
        blob: new Blob([`stamped-${f.name}`]),
        mimeType: "image/png",
        width: 10,
        height: 10,
        bytesBefore: f.size,
        bytesAfter: 11,
        notes: [],
      };
    };
    return { fake, calls };
  }

  it("stamps in drop order and reports per-file status", async () => {
    const { fake, calls } = makeFake();
    const events: Array<[number, ItemStatus]> = [];
    const outcome = await runBatch([file("a.jpg"), file("b.jpg")], DEFAULT_TEXT_SPEC, { format: "png", quality: 0.9 }, {
      stampOneImpl: fake,
      yieldBetween: async () => {},
      onItem: (i, status) => events.push([i, status]),
    });
    expect(calls).toEqual(["a.jpg", "b.jpg"]);
    expect(outcome.results.map((r) => r.name)).toEqual(["a-stamped.png", "b-stamped.png"]);
    expect(outcome.failures).toEqual([]);
    expect(outcome.cancelled).toBe(false);
    expect(events).toEqual([
      [0, "stamping"],
      [0, "done"],
      [1, "stamping"],
      [1, "done"],
    ]);
  });

  it("stops at FREE_BATCH_LIMIT and reports the overflow", async () => {
    const { fake } = makeFake();
    const files = Array.from({ length: FREE_BATCH_LIMIT + 5 }, (_, i) => file(`f${i + 1}.jpg`));
    const outcome = await runBatch(files, DEFAULT_TEXT_SPEC, { format: "png", quality: 0.9 }, {
      stampOneImpl: fake,
      yieldBetween: async () => {},
    });
    expect(FREE_BATCH_LIMIT).toBe(20);
    expect(outcome.queued).toBe(20);
    expect(outcome.overflow).toBe(5);
    expect(outcome.results).toHaveLength(20);
  });

  it("one thrown file fails alone; the run continues", async () => {
    const { fake } = makeFake((f) => f.name === "bad.jpg");
    const outcome = await runBatch([file("a.jpg"), file("bad.jpg"), file("c.jpg")], DEFAULT_TEXT_SPEC, { format: "png", quality: 0.9 }, {
      stampOneImpl: fake,
      yieldBetween: async () => {},
    });
    expect(outcome.results.map((r) => r.name)).toEqual(["a-stamped.png", "c-stamped.png"]);
    expect(outcome.failures).toEqual([{ name: "bad.jpg", reason: expect.any(String) }]);
    expect(outcome.failures[0].reason).toContain("HEIC");
  });

  it("duplicate names de-duplicate through the shared set", async () => {
    const { fake } = makeFake();
    const outcome = await runBatch([file("photo.jpg"), file("photo.jpg")], DEFAULT_TEXT_SPEC, { format: "png", quality: 0.9 }, {
      stampOneImpl: fake,
      yieldBetween: async () => {},
    });
    expect(outcome.results.map((r) => r.name)).toEqual(["photo-stamped.png", "photo-stamped-2.png"]);
  });

  it("cancel keeps the finished files", async () => {
    const { fake, calls } = makeFake();
    let stop = false;
    const outcome = await runBatch([file("a.jpg"), file("b.jpg"), file("c.jpg")], DEFAULT_TEXT_SPEC, { format: "png", quality: 0.9 }, {
      stampOneImpl: fake,
      yieldBetween: async () => {
        if (calls.length >= 2) stop = true;
      },
      shouldStop: () => stop,
    });
    expect(outcome.cancelled).toBe(true);
    expect(outcome.results.map((r) => r.name)).toEqual(["a-stamped.png", "b-stamped.png"]);
    expect(calls).not.toContain("c.jpg");
  });
});

// ——— names ———

describe("names", () => {
  it("appends -stamped with the format's extension", () => {
    expect(stampFilename("photo.jpg", "png")).toBe("photo-stamped.png");
    expect(stampFilename("photo.jpg", "jpeg")).toBe("photo-stamped.jpg");
    expect(stampFilename("photo", "webp")).toBe("photo-stamped.webp");
  });

  it("de-duplicates in order", () => {
    const taken = new Set<string>();
    expect(stampFilename("photo.jpg", "jpeg", taken)).toBe("photo-stamped.jpg");
    expect(stampFilename("photo.jpg", "jpeg", taken)).toBe("photo-stamped-2.jpg");
    expect(stampFilename("photo.jpg", "jpeg", taken)).toBe("photo-stamped-3.jpg");
  });

  it("handles odd names: none, dots, unicode", () => {
    expect(stampBaseName("photo.tar.gz")).toBe("photo.tar");
    expect(stampBaseName(".jpg")).toBe("image");
    expect(stampBaseName("")).toBe("image");
    expect(stampFilename(".jpg", "png")).toBe("image-stamped.png");
    expect(stampFilename("水位line.png", "png")).toBe("水位line-stamped.png");
  });

  it("names the batch ZIP", () => {
    expect(zipName(7)).toBe("capystamp-7-images.zip");
    expect(zipName(1)).toBe("capystamp-1-images.zip");
  });
});

// ——— presets ———

function fakeStore(): PresetStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("presets", () => {
  it("round-trips a saved design", () => {
    const store = fakeStore();
    addPreset("shop mark", DEFAULT_TEXT_SPEC, store);
    const loaded = loadPresets(store);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("shop mark");
    expect(loaded[0].spec).toEqual(clampSpec(DEFAULT_TEXT_SPEC));
  });

  it("drops malformed entries on the way out of storage", () => {
    const store = fakeStore();
    store.data.set(
      PRESETS_KEY,
      JSON.stringify([
        "junk",
        { name: "no spec" },
        { name: "bad spec", spec: { kind: "text", text: "   " } },
        { name: "good", spec: DEFAULT_LOGO_SPEC },
      ]),
    );
    const loaded = loadPresets(store);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("good");
    expect(loaded[0].spec.kind).toBe("logo");
  });

  it("caps at 12, newest first", () => {
    const store = fakeStore();
    for (let i = 0; i < MAX_PRESETS + 3; i++) {
      addPreset(`mark ${i}`, DEFAULT_TEXT_SPEC, store);
    }
    const loaded = loadPresets(store);
    expect(loaded).toHaveLength(MAX_PRESETS);
    expect(MAX_PRESETS).toBe(12);
    expect(loaded[0].name).toBe(`mark ${MAX_PRESETS + 2}`);
    expect(loaded[loaded.length - 1].name).toBe(`mark 3`);
  });

  it("never stores logo bytes — a logo preset is a spec, not an image", () => {
    const store = fakeStore();
    const logoSpec: LogoMark = { ...DEFAULT_LOGO_SPEC, anchor: "mc" };
    addPreset("logo mark", logoSpec, store);
    const raw = store.data.get(PRESETS_KEY) ?? "";
    expect(raw).not.toContain("data:");
    expect(raw).not.toMatch(/blob|src|href|bytes/i);
    expect(loadPresets(store)[0].spec).toEqual(logoSpec);
  });

  it("removes by id", () => {
    const store = fakeStore();
    const [first] = addPreset("one", DEFAULT_TEXT_SPEC, store);
    addPreset("two", DEFAULT_TEXT_SPEC, store);
    removePreset(first.id, store);
    const loaded = loadPresets(store);
    expect(loaded.map((p) => p.name)).toEqual(["two"]);
  });

  it("a throwing store reads as empty and never crashes a save", () => {
    const hostile: PresetStore = {
      getItem: () => {
        throw new Error("private mode");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    expect(loadPresets(hostile)).toEqual([]);
    expect(() => addPreset("x", DEFAULT_TEXT_SPEC, hostile)).not.toThrow();
  });
});
