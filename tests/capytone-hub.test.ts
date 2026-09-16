/**
 * CapyTone Phase B — the hub modes (plan §6 + §6b).
 *
 * The §6b.7 test plan: harmony offset table, per-(L,H) clamp vectors,
 * harmony determinism, contrast enforcement on generated pairs, WCAG
 * goldens, APCA goldens from the library, gradient CSS emission goldens,
 * and the Check verdict logic table.
 */

import { describe, expect, it } from "vitest";

import { APCAcontrast, sRGBtoY } from "apca-w3";

import {
  gamutClamp,
  harmonyPalette,
  HARMONIES,
  HARMONY_MAP,
} from "@/lib/capytone/harmony";
import { checkGuardrails } from "@/lib/capytone/engine/generate";
import { contrastRatio, toOklchOrNull, hueDistance } from "@/lib/capytone/engine/color";
import { apcaBandOf, checkPair, WCAG_THRESHOLDS } from "@/lib/capytone/check";
import { gradientCss, type GradientSpec, INTERP_MAP } from "@/lib/capytone/blend";

/** Shortest circular hue distance, degrees (mirrors the engine's helper). */
const dist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe("the harmony offset table (§6b.1) — the offsets are the product", () => {
  it("pins every rule's exact hue deltas", () => {
    expect(HARMONY_MAP.complementary.offsets).toEqual([0, 180]);
    expect(HARMONY_MAP.split.offsets).toEqual([0, 150, 210]);
    expect(HARMONY_MAP.analogous.offsets).toEqual([0, -30, 30]);
    expect(HARMONY_MAP.triadic.offsets).toEqual([0, 120, 240]);
    expect(HARMONY_MAP.tetradic.offsets).toEqual([0, 60, 180, 240]);
    expect(HARMONY_MAP.mono.offsets).toEqual([0]);
    // Every rule is reachable from the picker's list, and the list only
    // holds these six.
    expect(HARMONIES.map((r) => r.id)).toEqual([
      "complementary",
      "split",
      "analogous",
      "triadic",
      "tetradic",
      "mono",
    ]);
  });

  it("every chromatic role lands on base + an exact offset (both fields, across the wheel)", () => {
    // Tolerance scales with chroma: 8-bit hex quantisation bends a measured
    // hue by ~±1° at healthy chroma but by 3–5° near the lightness poles,
    // where the hue is barely conditioned. A role on the WRONG offset
    // misses by ≥ 25° (analogous), so even the loose end catches real drift.
    const CHROMATIC = 0.008;
    const toleranceOf = (c: number) => (c < 0.04 ? 5 : 2.5);
    for (const base of [0, 75, 145, 200, 264, 331]) {
      for (const rule of HARMONIES) {
        for (const field of ["light", "deep"] as const) {
          const p = harmonyPalette({ baseHue: base, harmony: rule.id, field, seed: "t1" });
          for (const role of ["bg", "mid", "accent", "surface", "ink"] as const) {
            const o = toOklchOrNull(p[role])!;
            if (o.c < CHROMATIC) continue;
            const onOffset = rule.offsets.some(
              (offset) => dist(o.h, (base + offset + 360) % 360) <= toleranceOf(o.c),
            );
            expect(
              onOffset,
              `${rule.id}/${field} base ${base} role ${role}: hue ${o.h.toFixed(1)} (c ${o.c.toFixed(3)}) off the offsets [${rule.offsets}]`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("complementary's accent measures ≈180° from the base — the harmony rule, not a nudge", () => {
    for (const base of [20, 145, 290]) {
      for (const field of ["light", "deep"] as const) {
        const p = harmonyPalette({ baseHue: base, harmony: "complementary", field, seed: "t1" });
        const accent = toOklchOrNull(p.accent)!;
        expect(dist(accent.h, (base + 180) % 360)).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it("monochromatic keeps every chromatic role on the single base hue", () => {
    const p = harmonyPalette({ baseHue: 145, harmony: "mono", field: "deep", seed: "t1" });
    for (const role of ["bg", "mid", "accent", "surface", "ink"] as const) {
      const o = toOklchOrNull(p[role])!;
      if (o.c < 0.008) continue;
      expect(dist(o.h, 145)).toBeLessThanOrEqual(2.5);
    }
  });

  it("§6b.1: the mood engine's hue-spread guardrail does NOT apply — a complementary palette fails it, by definition", () => {
    // The families stay separate: run the mood check over a harmony palette
    // and the 180° spread trips the ±30° clause. This pins that nobody later
    // "unifies" the two rulebooks.
    const p = harmonyPalette({ baseHue: 145, harmony: "complementary", field: "light", seed: "t1" });
    const g = checkGuardrails(p);
    expect(g.harmonyOk).toBe(false);
    // While the clauses harmony mode DOES honour — contrast, field chroma,
    // accent chroma — hold.
    expect(g.contrast).toBeGreaterThanOrEqual(4.5);
    expect(g.fieldChromaOk).toBe(true);
    expect(g.accentChromaOk).toBe(true);
  });
});

describe("per-(L,H) gamut clamping (§6b.4) — culori, not the hand-rolled search", () => {
  it("bisects chroma at the colour's own (L, H); lightness and hue pass through untouched", () => {
    // Measured vectors — all four start far outside sRGB at their (L, H).
    const vectors = [
      { in: { l: 0.5, c: 0.37, h: 30 }, wantC: 0.2005 },
      { in: { l: 0.7, c: 0.3, h: 140 }, wantC: 0.2253 },
      { in: { l: 0.3, c: 0.25, h: 264 }, wantC: 0.174 },
      { in: { l: 0.9, c: 0.15, h: 20 }, wantC: 0.0519 },
    ] as const;
    for (const v of vectors) {
      const out = gamutClamp({ ...v.in });
      expect(out.c, `L${v.in.l} H${v.in.h}`).toBeCloseTo(v.wantC, 3);
      expect(out.l, "lightness untouched").toBe(v.in.l);
      expect(out.h, "hue untouched").toBe(v.in.h);
    }
  });

  it("leaves in-gamut colours byte-identical", () => {
    const inside = { l: 0.7, c: 0.05, h: 140 };
    expect(gamutClamp(inside)).toEqual(inside);
  });
});

describe("harmony determinism (§6b.2) — same triple, same palette", () => {
  it("same (hue, harmony, seed) reproduces the palette exactly", () => {
    for (const rule of HARMONIES) {
      const a = harmonyPalette({ baseHue: 145, harmony: rule.id, field: "deep", seed: "t1" });
      const b = harmonyPalette({ baseHue: 145, harmony: rule.id, field: "deep", seed: "t1" });
      expect(a).toEqual(b);
    }
  });

  it("a different jitter seed shifts the palette but keeps the family and contrast", () => {
    const a = harmonyPalette({ baseHue: 145, harmony: "triadic", field: "light", seed: "j1" });
    const b = harmonyPalette({ baseHue: 145, harmony: "triadic", field: "light", seed: "j2" });
    expect(a.bg).not.toBe(b.bg);
    expect(contrastRatio(a.ink, a.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(b.ink, b.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("the output is a MoodPalette — it re-enters the poster render and every export surface unchanged", () => {
    const p = harmonyPalette({ baseHue: 145, harmony: "split", field: "light", seed: "t1" });
    for (const key of ["mood", "slug", "seed", "bg", "mid", "accent", "surface", "ink", "grain"] as const) {
      expect(p, `role ${key}`).toHaveProperty(key);
      expect(typeof p[key]).toBe("number" === typeof p.grain && key === "grain" ? "number" : "string");
    }
    expect(p.grain).toBeGreaterThanOrEqual(0);
    expect(p.grain).toBeLessThanOrEqual(1);
    for (const role of ["bg", "mid", "accent", "surface", "ink"] as const) {
      expect(p[role]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("contrast enforcement on harmony palettes — ink-vs-bg ≥ 4.5 always", () => {
  it("holds across the wheel, all six rules, both fields", () => {
    for (let hue = 0; hue < 360; hue += 15) {
      for (const rule of HARMONIES) {
        for (const field of ["light", "deep"] as const) {
          const p = harmonyPalette({ baseHue: hue, harmony: rule.id, field, seed: "sw" });
          const ratio = contrastRatio(p.ink, p.bg);
          expect(
            ratio,
            `${rule.id}/${field} at ${hue}°: ${ratio.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(4.5);
          expect(p.ink.toLowerCase(), `${rule.id}/${field} at ${hue}°`).not.toBe(p.bg.toLowerCase());
        }
      }
    }
  });
});

describe("wcag goldens — the conformance standard", () => {
  it("black on white is exactly 21:1; identical colours are 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
  });

  it("matches a hand-computed non-trivial pair: #767676 on #ffffff", () => {
    // Hand-check: sRGB 118/255 = 0.462745 → ((0.462745 + 0.055) / 1.055)^2.4
    // ≈ 0.181084; all channels equal, so L = 0.181084. Ratio =
    // (1 + 0.05) / (0.181084 + 0.05) = 1.05 / 0.231084 ≈ 4.5422 — the
    // classic "lightest AA-passing grey on white".
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.5422, 3);
  });

  it("the house pair (sage field, ink text) clears AA comfortably", () => {
    expect(contrastRatio("#141412", "#8e9b7e")).toBeCloseTo(6.2712, 3);
  });

  it("the thresholds are the standard's numbers", () => {
    expect(WCAG_THRESHOLDS.aaNormal).toBe(4.5);
    expect(WCAG_THRESHOLDS.aaLarge).toBe(3);
    expect(WCAG_THRESHOLDS.aaaNormal).toBe(7);
    expect(WCAG_THRESHOLDS.aaaLarge).toBe(4.5);
  });
});

describe("apca goldens — pinned to apca-w3 0.1.9, guidance only", () => {
  it("reproduces the library's own golden pairs", () => {
    // The library's luminances and Lc, measured directly from apca-w3.
    // (Its three coefficients sum to 1.0000001, so white's Y is a hair
    // over 1 — pinned at the precision that matters.)
    expect(sRGBtoY([0, 0, 0])).toBeCloseTo(0, 8);
    expect(sRGBtoY([255, 255, 255])).toBeCloseTo(1, 4);
    expect(APCAcontrast(sRGBtoY([0, 0, 0]), sRGBtoY([255, 255, 255]))).toBeCloseTo(106.04, 2);
    expect(APCAcontrast(sRGBtoY([255, 255, 255]), sRGBtoY([0, 0, 0]))).toBeCloseTo(-107.88, 2);
  });

  it("checkPair carries polarity honestly — swapping the pair flips the sign", () => {
    const dark = checkPair("#000000", "#ffffff")!;
    const light = checkPair("#ffffff", "#000000")!;
    expect(dark.apcaLc).toBeCloseTo(106.04, 2);
    expect(light.apcaLc).toBeCloseTo(-107.88, 2);
    expect(light.apcaLc).toBeLessThan(0);
  });

  it("measures the house pair and a failing pair at plausible Lc", () => {
    // Dark ink on the sage field: positive (dark text, light ground), in
    // the large-text band.
    const house = checkPair("#141412", "#8e9b7e")!;
    expect(house.apcaLc).toBeCloseTo(47.18, 2);
    expect(house.apcaBand).toBe("large");
    // Mid grey on near-dark: below every text band, non-text only.
    const dim = checkPair("#777777", "#444444")!;
    expect(dim.apcaLc).toBeCloseTo(-19.47, 2);
    expect(dim.apcaBand).toBe("non-text");
  });

  it("returns null for unparseable input instead of a fake verdict", () => {
    expect(checkPair("nope", "#ffffff")).toBeNull();
    expect(checkPair("#000000", "also nope")).toBeNull();
  });
});

describe("check verdict logic table", () => {
  const CASES: [string, string, boolean, boolean, boolean, boolean][] = [
    // fg, bg, aaNormal, aaLarge, aaaNormal, aaaLarge
    ["#000000", "#ffffff", true, true, true, true],
    ["#767676", "#ffffff", true, true, false, true], // 4.54:1 — AA normal scrapes in
    ["#777777", "#444444", false, false, false, false], // 2.17:1 — nothing passes
    ["#8e9b7e", "#141412", true, true, false, true], // 6.27:1 — AA only
  ];
  it.each(CASES)("checkPair(%s, %s) → AA:%p/%p AAA:%p/%p", (fg, bg, aan, aal, aaan, aaal) => {
    const r = checkPair(fg, bg)!;
    expect(r.wcag.aaNormal).toBe(aan);
    expect(r.wcag.aaLarge).toBe(aal);
    expect(r.wcag.aaaNormal).toBe(aaan);
    expect(r.wcag.aaaLarge).toBe(aaal);
  });

  it("the guidance band table reads |Lc|", () => {
    expect(apcaBandOf(106)).toBe("preferred-body");
    expect(apcaBandOf(71.6)).toBe("body-min");
    expect(apcaBandOf(50)).toBe("large");
    expect(apcaBandOf(31)).toBe("text-min");
    expect(apcaBandOf(16)).toBe("non-text");
    expect(apcaBandOf(5)).toBe("none");
    expect(apcaBandOf(0)).toBe("none");
    expect(apcaBandOf(-80)).toBe("preferred-body"); // polarity never changes the band
  });
});

describe("gradient CSS emission goldens (§6) — exact strings, deterministic", () => {
  it("linear in oklab emits the in-syntax string and the dense hex fallback", () => {
    const g = gradientCss({
      type: "linear",
      angle: 135,
      stops: ["#8e9b7e", "#c07952"],
      interp: "oklab",
    });
    expect(g.css).toBe("linear-gradient(135deg in oklab, #8e9b7e 0%, #c07952 100%)");
    expect(g.fallback).toBe(
      "linear-gradient(135deg, #8e9b7e 0%, #93987b 8.33%, #989677 16.67%, #9d9374 25%, " +
        "#a19170 33.33%, #a58e6c 41.67%, #aa8b69 50%, #ae8865 58.33%, #b28561 66.67%, " +
        "#b5825e 75%, #b97f5a 83.33%, #bd7c56 91.67%, #c07952 100%)",
    );
  });

  it("conic in oklch longer hue takes the long way round — in both strings", () => {
    const g = gradientCss({
      type: "conic",
      angle: 45,
      stops: ["#8e9b7e", "#d9a441", "#5f7a72"],
      interp: "oklch-longer",
    });
    expect(g.css).toBe(
      "conic-gradient(from 45deg in oklch longer hue, #8e9b7e 0%, #d9a441 50%, #5f7a72 100%)",
    );
    expect(g.fallback).toBe(
      "conic-gradient(from 45deg, #8e9b7e 0%, #71a69a 8.33%, #6ea6c3 16.67%, #9a9bd7 25%, " +
        "#ce8dbe 33.33%, #ea8d81 41.67%, #d9a441 50%, #e18972 58.33%, #c981a1 66.67%, " +
        "#9e83b7 75%, #7287af 83.33%, #5b8491 91.67%, #5f7a72 100%)",
    );
    // The fallback honours the longer hue: sage (≈127°) walks AWAY from gold
    // (≈85°) through blue before arriving — the mid sample is far from both.
    expect(g.fallback).toContain("#9a9bd7");
  });

  it("radial carries no angle; srgb is spelled the css way", () => {
    const g = gradientCss({
      type: "radial",
      angle: 0,
      stops: ["#121212", "#8e9b7e"],
      interp: "srgb",
    });
    expect(g.css).toBe("radial-gradient(in srgb, #121212 0%, #8e9b7e 100%)");
    expect(INTERP_MAP.srgb.css).toBe("in srgb");
  });

  it("is deterministic and normalises angles into 0..359", () => {
    const spec: GradientSpec = {
      type: "linear",
      angle: 395,
      stops: ["#121212", "#8e9b7e"],
      interp: "oklab",
    };
    const a = gradientCss(spec);
    const b = gradientCss(spec);
    expect(a).toEqual(b);
    expect(a.css).toBe(gradientCss({ ...spec, angle: 35 }).css);
    expect(gradientCss({ ...spec, angle: -30 }).css).toBe(
      gradientCss({ ...spec, angle: 330 }).css,
    );
  });

  it("needs two or three stops, and real colours", () => {
    expect(() =>
      gradientCss({ type: "linear", angle: 0, stops: ["#121212"], interp: "oklab" }),
    ).toThrow();
    expect(() =>
      gradientCss({
        type: "linear",
        angle: 0,
        stops: ["#121212", "nope"],
        interp: "oklab",
      }),
    ).toThrow();
  });
});

describe("hueDistance engine helper (shared by the hub's tests and the mood check)", () => {
  it("measures the short way round, signed", () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(-20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(0, 181)).toBe(-179);
  });
});
