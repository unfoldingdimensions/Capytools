import { describe, expect, it } from "vitest";

import { FILL_WARNING, checkCorners } from "../src/lib/capypassport/background";
import { photoFilename, sheetFilename } from "../src/lib/capypassport/compose";
import { DEMO_FACE, demoFit } from "../src/lib/capypassport/demo";
import { formatBytes, formatMm, mmToPx, pxToMm } from "../src/lib/capypassport/format";
import {
  DEFAULT_TWEAK,
  crownYOf,
  fitCrop,
  flag,
  headHeightPx,
  targetHeadMm,
  type FaceGeometry,
} from "../src/lib/capypassport/geometry";
import { DEFAULT_SPEC, SPECS, specById } from "../src/lib/capypassport/specs";
import { SHEET_PX, maxCopies, sheetLayout } from "../src/lib/capypassport/sheet";

// ——— format: the millimetre is the same millimetre everywhere ———

describe("format — mm and px", () => {
  it("converts at the stated dpi, rounding to whole pixels", () => {
    expect(mmToPx(50.8, 300)).toBe(600); // 2 in
    expect(mmToPx(35, 300)).toBe(413);
    expect(mmToPx(45, 300)).toBe(531);
  });

  it("round-trips within a twentieth of a millimetre", () => {
    for (const mm of [25.4, 29, 34, 34.925, 35, 45, 50.8]) {
      expect(Math.abs(pxToMm(mmToPx(mm, 300), 300) - mm)).toBeLessThan(0.05);
    }
  });

  it("formats for humans", () => {
    expect(formatMm(34.925)).toBe("34.9");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 kB");
    expect(formatBytes(1_572_864)).toBe("1.5 MB");
  });
});

// ——— specs: the data that is the product, each number pinned ———

describe("specs — provenance and sanity", () => {
  it("every row carries a source, a checked date, and a sane head band", () => {
    for (const spec of SPECS) {
      expect(spec.sourceUrl, spec.id).toMatch(/^https?:\/\//);
      expect(spec.verifiedOn, spec.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(spec.head.minMm, spec.id).toBeLessThan(spec.head.maxMm);
      expect(spec.head.minMm, spec.id).toBeGreaterThan(0);
      expect(spec.head.maxMm, spec.id).toBeLessThan(spec.physical.hMm);
      expect(["fetched", "surfaced"]).toContain(spec.provenance);
    }
  });

  it("US passport: 2 × 2 in, head 25.4–34.925 mm, eye line band, 600 × 600", () => {
    const us = specById("us-passport")!;
    expect(us.physical).toEqual({ wMm: 50.8, hMm: 50.8 });
    expect(us.head).toEqual({ minMm: 25.4, maxMm: 34.925 });
    expect(us.eyeLineFromBottom).toEqual({ minMm: 28.575, maxMm: 34.925 });
    expect(us.px).toEqual({ w: 600, h: 600 });
    expect(us.background).toBe("white");
  });

  it("UK passport: 35 × 45 mm, head 29–34 mm, digital file over both minimums", () => {
    const uk = specById("uk-passport")!;
    expect(uk.physical).toEqual({ wMm: 35, hMm: 45 });
    expect(uk.head).toEqual({ minMm: 29, maxMm: 34 });
    // gov.uk asks at least 600 × 750; the crop keeps the print aspect.
    expect(uk.digitalMin).toEqual({ w: 600, h: 750, minKB: 50, maxMB: 10 });
    expect(uk.px.w).toBeGreaterThanOrEqual(uk.digitalMin.w);
    expect(uk.px.h).toBeGreaterThanOrEqual(uk.digitalMin.h);
    // Integer pixels land within half a percent of the 35:45 aspect.
    expect(Math.abs(uk.px.w / uk.px.h - 35 / 45)).toBeLessThan(0.005);
    expect(uk.verifiedOn).toBe("2026-10-08");
    expect(uk.provenance).toBe("fetched");
  });

  it("Schengen visa: 35 × 45 mm, head 32–36 mm, 413 × 531 at 300 dpi", () => {
    const schengen = specById("schengen-visa")!;
    expect(schengen.physical).toEqual({ wMm: 35, hMm: 45 });
    expect(schengen.head).toEqual({ minMm: 32, maxMm: 36 });
    expect(schengen.px).toEqual({ w: mmToPx(35, 300), h: mmToPx(45, 300) });
  });

  it("fills offered are only what the guidance allows", () => {
    expect(specById("us-passport")!.allowedFills).toHaveLength(1);
    expect(specById("uk-passport")!.allowedFills.length).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_SPEC.id).toBe("us-passport");
  });
});

// ——— geometry: the honest fit ———

const face: FaceGeometry = {
  chinY: 0.75,
  eyeY: 0.55,
  hairlineY: 0.4,
  centerX: 0.5,
  minX: 0.35,
  maxX: 0.65,
};

describe("geometry — the crown estimate", () => {
  it("sits above the hairline landmark and below the eyes", () => {
    const crown = crownYOf(face);
    expect(crown).toBeLessThan(face.hairlineY);
    expect(crown).toBeGreaterThan(0);
    expect(crown).toBeLessThan(face.eyeY);
  });

  it("is monotonic: a higher chin, hairline or eye raises the crown", () => {
    const base = crownYOf(face);
    expect(crownYOf({ ...face, hairlineY: face.hairlineY - 0.05 })).toBeLessThan(base);
    expect(crownYOf({ ...face, chinY: face.chinY + 0.05 })).toBeLessThan(base);
  });

  it("headHeightPx follows the crown, and stays positive on odd inputs", () => {
    expect(headHeightPx(face, 1000)).toBeCloseTo((face.chinY - crownYOf(face)) * 1000, 6);
    expect(headHeightPx(face, 1000)).toBeGreaterThan(0);
  });
});

describe("geometry — targets reach past the band so the flags can fail", () => {
  it("defaults aim mid-band; extremes overshoot by a fifth of the band", () => {
    const uk = specById("uk-passport")!;
    expect(targetHeadMm(uk, 0.5)).toBeCloseTo((uk.head.minMm + uk.head.maxMm) / 2, 6);
    const band = uk.head.maxMm - uk.head.minMm;
    expect(targetHeadMm(uk, 0)).toBeCloseTo(uk.head.minMm - 0.2 * band, 6);
    expect(targetHeadMm(uk, 1)).toBeCloseTo(uk.head.maxMm + 0.2 * band, 6);
  });
});

describe("geometry — fitCrop", () => {
  it("returns a window of the spec's aspect at any photo shape", () => {
    for (const spec of SPECS) {
      for (const [w, h] of [[3000, 4000], [4000, 3000], [1200, 1600]]) {
        const fit = fitCrop(spec, face, w, h, DEFAULT_TWEAK);
        expect(fit.crop.w / fit.crop.h).toBeCloseTo(spec.physical.wMm / spec.physical.hMm, 2);
        expect(fit.crop.x).toBeGreaterThanOrEqual(0);
        expect(fit.crop.y).toBeGreaterThanOrEqual(0);
        expect(fit.crop.x + fit.crop.w).toBeLessThanOrEqual(w);
        expect(fit.crop.y + fit.crop.h).toBeLessThanOrEqual(h);
      }
    }
  });

  it("realizes the target head size when the photo has room", () => {
    const uk = specById("uk-passport")!;
    const target = targetHeadMm(uk, DEFAULT_TWEAK.headT);
    const fit = fitCrop(uk, face, 3000, 4000, DEFAULT_TWEAK);
    expect(fit.clamped).toBe(false);
    expect(fit.headMm).toBeCloseTo(target, 1);
  });

  it("centres the head band vertically by default", () => {
    const uk = specById("uk-passport")!;
    const fit = fitCrop(uk, face, 3000, 4000, DEFAULT_TWEAK);
    const bottom = uk.physical.hMm - (fit.topMarginMm + fit.headMm);
    expect(bottom).toBeCloseTo(fit.topMarginMm, 1);
  });

  it("slides honestly: the vertical slider moves the crown, the head slider zooms", () => {
    const uk = specById("uk-passport")!;
    const low = fitCrop(uk, face, 3000, 4000, { headT: 0.5, marginT: 0 });
    const high = fitCrop(uk, face, 3000, 4000, { headT: 0.5, marginT: 1 });
    expect(high.topMarginMm).toBeGreaterThan(low.topMarginMm);
    const small = fitCrop(uk, face, 3000, 4000, { headT: 0, marginT: 0.5 });
    const big = fitCrop(uk, face, 3000, 4000, { headT: 1, marginT: 0.5 });
    expect(big.headMm).toBeGreaterThan(small.headMm);
  });

  it("a photo taken too close clamps inside itself and says so", () => {
    const uk = specById("uk-passport")!;
    // A face filling almost the whole frame cannot be framed outward.
    const tight: FaceGeometry = { ...face, chinY: 0.98, hairlineY: 0.3, eyeY: 0.6 };
    const fit = fitCrop(uk, tight, 800, 1000, DEFAULT_TWEAK);
    expect(fit.clamped).toBe(true);
    expect(fit.crop.x).toBeGreaterThanOrEqual(0);
    expect(fit.crop.y).toBeGreaterThanOrEqual(0);
    expect(fit.crop.x + fit.crop.w).toBeLessThanOrEqual(800);
    expect(fit.crop.y + fit.crop.h).toBeLessThanOrEqual(1000);
  });

  it("reports the eye line above the bottom edge", () => {
    const us = specById("us-passport")!;
    const fit = fitCrop(us, face, 3000, 4000, DEFAULT_TWEAK);
    expect(fit.eyeLineMm).not.toBeNull();
    expect(fit.eyeLineMm!).toBeGreaterThan(0);
    expect(fit.eyeLineMm!).toBeLessThan(us.physical.hMm);
  });
});

describe("geometry — the flag carries a word", () => {
  it("inside, near, and out — each with its word, never colour alone", () => {
    expect(flag(31.5, 29, 34)).toEqual({ level: "pass", word: "within the range" });
    const near = flag(28.7, 29, 34);
    expect(near.level).toBe("near");
    expect(near.word).toMatch(/\S/);
    const far = flag(20, 29, 34);
    expect(far.level).toBe("fail");
    expect(far.word).toMatch(/\S/);
    // Near is a NARROW band (0.4 mm here): just past the edge, not a second
    // class of pass.
    expect(flag(34.3, 29, 34).level).toBe("near");
    expect(flag(34.6, 29, 34).level).toBe("fail");
  });
});

// ——— sheet: exact physical pixels ———

describe("sheet — the 4 × 6 grid", () => {
  it("the sheet is 1200 × 1800 px — exactly 4 × 6 in at 300 dpi", () => {
    expect(SHEET_PX).toEqual({ w: 1200, h: 1800 });
  });

  it("six US 2 × 2 photos fill the sheet edge to edge", () => {
    const us = specById("us-passport")!;
    const layout = sheetLayout(us, 6)!;
    expect(layout).not.toBeNull();
    expect(layout.cells).toHaveLength(6);
    expect(layout.cell).toEqual({ w: 600, h: 600 });
    for (const cell of layout.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x + cell.w).toBeLessThanOrEqual(SHEET_PX.w);
      expect(cell.y + cell.h).toBeLessThanOrEqual(SHEET_PX.h);
    }
    // 2 × 3: every cell lands on the half-inch grid.
    const xs = new Set(layout.cells.map((c) => c.x));
    expect(xs.size).toBe(2);
  });

  it("cells never overlap, for every spec and count", () => {
    for (const spec of SPECS) {
      for (let n = 1; n <= maxCopies(spec); n++) {
        const layout = sheetLayout(spec, n)!;
        expect(layout.cells).toHaveLength(n);
        for (let a = 0; a < layout.cells.length; a++) {
          for (let b = a + 1; b < layout.cells.length; b++) {
            const p = layout.cells[a];
            const q = layout.cells[b];
            const apart = q.x >= p.x + p.w || p.x >= q.x + q.w || q.y >= p.y + p.h || p.y >= q.y + q.h;
            expect(apart, `${spec.id} ×${n}: cells ${a} and ${b} overlap`).toBe(true);
          }
        }
      }
    }
  });

  it("cell size is the spec's physical size at its dpi", () => {
    const uk = specById("uk-passport")!;
    const layout = sheetLayout(uk, 6)!;
    expect(layout.cell).toEqual({ w: mmToPx(35, 300), h: mmToPx(45, 300) });
    expect(layout.cell.w).toBe(413);
    expect(layout.cell.h).toBe(531);
  });

  it("caps copies at what fits, and refuses what cannot", () => {
    const us = specById("us-passport")!;
    expect(maxCopies(us)).toBe(6);
    expect(sheetLayout(us, 6)).not.toBeNull();
    // More than fits returns null — the UI clamps its stepper to maxCopies,
    // so this never happens by accident.
    expect(sheetLayout(us, 7)).toBeNull();
  });

  it("cut guides deduplicate to cell edges", () => {
    const us = specById("us-passport")!;
    const layout = sheetLayout(us, 6)!;
    expect(layout.cutsX).toEqual([0, 600, 1200]);
    expect(layout.cutsY).toEqual([0, 600, 1200, 1800]);
  });
});

// ——— background: the corner question ———

function frameOf(painter: (data: Uint8ClampedArray, w: number, h: number) => void): { data: Uint8ClampedArray; w: number; h: number } {
  const w = 200;
  const h = 300;
  const data = new Uint8ClampedArray(w * h * 4);
  painter(data, w, h);
  return { data, w, h };
}

function fillFlat(data: Uint8ClampedArray, r: number, g: number, b: number): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
}

describe("background — corner sampling", () => {
  it("a plain light wall reads plain and light, with nothing to say", () => {
    const { data } = frameOf((d) => fillFlat(d, 235, 234, 228));
    const verdict = checkCorners(data, 200, 300);
    expect(verdict.plain).toBe(true);
    expect(verdict.light).toBe(true);
    expect(verdict.note).toBeNull();
  });

  it("a plain dark wall warns without crying busy", () => {
    const { data } = frameOf((d) => fillFlat(d, 60, 70, 65));
    const verdict = checkCorners(data, 200, 300);
    expect(verdict.plain).toBe(true);
    expect(verdict.light).toBe(false);
    expect(verdict.note).toMatch(/light/);
  });

  it("a busy corner warns plainly", () => {
    const { data } = frameOf((d, w, h) => {
      // Flat base...
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 230;
        d[i + 1] = 229;
        d[i + 2] = 224;
        d[i + 3] = 255;
      }
      // ...with bookshelf noise in the bottom-right corner.
      for (let y = Math.round(h * 0.8); y < h; y++) {
        for (let x = Math.round(w * 0.8); x < w; x++) {
          const at = (y * w + x) * 4;
          const v = (x * 7 + y * 13) % 255;
          d[at] = v;
          d[at + 1] = v;
          d[at + 2] = v;
        }
      }
    });
    const verdict = checkCorners(data, 200, 300);
    expect(verdict.plain).toBe(false);
    expect(verdict.note).toMatch(/busy/);
  });

  it("the fill warning is the plan's verbatim line about unaltered photos", () => {
    expect(FILL_WARNING).toMatch(/unaltered/);
    expect(FILL_WARNING).toMatch(/only fill the background if your official guidance allows it/);
  });
});

// ——— the demo teaches through the real engine ———

describe("demo — the drawn face reads mid-band", () => {
  it("every spec's readout of the demo face lands inside the band", () => {
    for (const spec of SPECS) {
      const fit = demoFit(spec);
      expect(fit.headMm, spec.id).toBeGreaterThanOrEqual(spec.head.minMm);
      expect(fit.headMm, spec.id).toBeLessThanOrEqual(spec.head.maxMm);
      expect(fit.clamped).toBe(false);
    }
  });

  it("the demo face uses the same shape detection produces", () => {
    expect(Object.keys(DEMO_FACE).sort()).toEqual(["centerX", "chinY", "eyeY", "hairlineY", "maxX", "minX"]);
  });
});

// ——— export names ———

describe("names — the downloads introduce themselves", () => {
  it("names carry the document and the size", () => {
    expect(photoFilename("us-passport", 600, 600)).toBe("passport-photo-us-passport-600x600.jpg");
    expect(sheetFilename("uk-passport")).toBe("passport-sheet-uk-passport.png");
  });
});
