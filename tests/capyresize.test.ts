import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { metadata } from "../src/app/capyresize/page";
import { buildIco } from "../src/lib/capyresize/ico";
import { HEAD_SNIPPET, ICO_SIZES, PACK_SPECS, buildManifest, maskableBox } from "../src/lib/capyresize/pack";
import {
  CanvasRefusedError,
  extensionFor,
  formatBytes,
  isWebpFallback,
  outputRefused,
  resizeFilename,
  savingsPercent,
} from "../src/lib/capyresize/render";
import { isAnimatedGif, sniffImageKind } from "../src/lib/capyresize/sniff";
import { centerSquare, fitWithin, halveSteps, isUpscale, scaleToWidth } from "../src/lib/capyresize/steps";
import { SUITE } from "../src/lib/capytools/suite";

/**
 * CapyResize's pure layers, node-tested: the halving math, the byte-exact ICO
 * writer, the pack manifest, the sniffer, and render.ts's decision helpers.
 * The browser functions themselves (decode/draw/encode/zip) stay thin — the
 * rules they follow are the helpers tested here.
 */

describe("steps — progressive halving", () => {
  it("4000 → 500 halves 2000, 1000, then the exact final step", () => {
    expect(halveSteps(4000, 3000, 500, 375)).toEqual([
      { w: 2000, h: 1500 },
      { w: 1000, h: 750 },
      { w: 500, h: 375 },
    ]);
  });

  it("1024 → 1000 is one exact step — no halving inside 2×", () => {
    expect(halveSteps(1024, 1024, 1000, 1000)).toEqual([{ w: 1000, h: 1000 }]);
  });

  it("an extreme downscale rounds intermediates and never touches 1", () => {
    const steps = halveSteps(4000, 4000, 16, 16);
    expect(steps[steps.length - 1]).toEqual({ w: 16, h: 16 });
    for (const step of steps.slice(0, -1)) {
      expect(step.w).toBeGreaterThanOrEqual(1);
      expect(step.h).toBeGreaterThanOrEqual(1);
    }
    // The last intermediate must be within 2× of the target — the final
    // draw is a small fractional step, not another cliff.
    const last = steps[steps.length - 2];
    expect(last.w).toBeLessThanOrEqual(32);
  });

  it("an upscale skips halving — one smoothing step up", () => {
    expect(halveSteps(500, 500, 1000, 1000)).toEqual([{ w: 1000, h: 1000 }]);
    expect(isUpscale(500, 1000)).toBe(true);
    expect(isUpscale(1000, 1000)).toBe(false);
  });

  it("aspect math: fitWithin never grows, scaleToWidth locks the height", () => {
    expect(fitWithin(2000, 1000, 500, 500)).toEqual({ w: 500, h: 250 });
    expect(fitWithin(400, 300, 500, 500)).toEqual({ w: 400, h: 300 });
    expect(scaleToWidth(3000, 2000, 600)).toEqual({ w: 600, h: 400 });
    expect(scaleToWidth(1, 3, 2)).toEqual({ w: 2, h: 6 });
  });

  it("centerSquare crops a portrait through its middle", () => {
    expect(centerSquare(600, 900)).toEqual({ size: 600, sx: 0, sy: 150 });
    expect(centerSquare(900, 600)).toEqual({ size: 600, sx: 150, sy: 0 });
    expect(centerSquare(512, 512)).toEqual({ size: 512, sx: 0, sy: 0 });
  });
});

describe("ico — the golden bytes", () => {
  // Fixture payloads — opaque to buildIco, which only writes container bytes.
  const png16 = [0xaa, 0xbb];
  const png256 = [0xcc];

  it("writes ICONDIR, both entries and contiguous payloads exactly", () => {
    const ico = buildIco([
      { size: 16, png: new Uint8Array(png16) },
      { size: 256, png: new Uint8Array(png256) },
    ]);

    // 6-byte ICONDIR + 2×16 entries + payloads.
    expect(ico.length).toBe(6 + 32 + 2 + 1);

    // ICONDIR: reserved=0, type=1, count=2 (little-endian u16s).
    expect([...ico.slice(0, 6)]).toEqual([0x00, 0x00, 0x01, 0x00, 0x02, 0x00]);

    // Entry 0: 16×16, planes=1, bitCount=32, 2 bytes at offset 38.
    expect([...ico.slice(6, 22)]).toEqual([
      0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x02, 0x00, 0x00, 0x00, 0x26, 0x00, 0x00, 0x00,
    ]);

    // Entry 1: 256 encodes as the 0 byte, 1 byte at offset 40.
    expect([...ico.slice(22, 38)]).toEqual([
      0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x01, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00,
    ]);

    // Payloads contiguous, in frame order.
    expect([...ico.slice(38, 40)]).toEqual(png16);
    expect([...ico.slice(40, 41)]).toEqual(png256);
  });

  it("stores a 192 px frame literally and lays three frames out in order", () => {
    const ico = buildIco([
      { size: 48, png: new Uint8Array([1]) },
      { size: 192, png: new Uint8Array([2]) },
      { size: 32, png: new Uint8Array([3, 4]) },
    ]);

    expect(ico[6]).toBe(48);
    expect(ico[6 + 16]).toBe(192); // under 256, stored as-is
    expect(ico[6 + 32]).toBe(32);
    // Offsets: 6 + 3×16 = 54, then 55, then 56.
    const view = new DataView(ico.buffer);
    expect(view.getUint32(6 + 12, true)).toBe(54);
    expect(view.getUint32(6 + 16 + 12, true)).toBe(55);
    expect(view.getUint32(6 + 32 + 12, true)).toBe(56);
    expect([...ico.slice(54)]).toEqual([1, 2, 3, 4]);
  });
});

describe("pack — the traced file set", () => {
  it("carries exactly the rasters the manifest names, plus ico frames", () => {
    expect(PACK_SPECS.map((spec) => spec.file)).toEqual([
      "apple-touch-icon.png",
      "icon-192.png",
      "icon-512.png",
      "icon-maskable-512.png",
    ]);
    expect(PACK_SPECS.map((spec) => spec.size)).toEqual([180, 192, 512, 512]);
    expect(PACK_SPECS.every((spec) => spec.opaque)).toBe(true);
    expect(ICO_SIZES).toEqual([16, 32, 48]);
    // The ZIP's full manifest: ico + the four rasters + manifest + snippet
    // (+ favicon.svg when the input is one) — 7 files from a raster input.
    expect(2 + PACK_SPECS.length).toBe(6);
  });

  it("buildManifest parses, types every icon, keeps maskable separate", () => {
    const manifest = JSON.parse(buildManifest("Capytools", "Capytools")) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };
    expect(manifest.name).toBe("Capytools");
    expect(manifest.short_name).toBe("Capytools");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toHaveLength(3);
    for (const icon of manifest.icons) {
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
      expect(icon.type).toBe("image/png");
    }
    expect(manifest.icons[0].src).toBe("/icon-192.png");
    expect(manifest.icons[1].src).toBe("/icon-512.png");
    expect(manifest.icons[2]).toMatchObject({ src: "/icon-maskable-512.png", purpose: "maskable" });
    const masked = manifest.icons.filter((icon) => icon.purpose === "maskable");
    expect(masked).toHaveLength(1);
  });

  it("the head snippet is exactly the four traced lines", () => {
    expect(HEAD_SNIPPET).toBe(
      [
        '<link rel="icon" href="/favicon.ico" sizes="32x32">',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/manifest.webmanifest">',
      ].join("\n"),
    );
  });

  it("maskableBox restates the 40% safe zone as an 80% fit", () => {
    expect(maskableBox(512)).toBe(410);
    expect(maskableBox(180)).toBe(144);
  });
});

describe("sniff — magic bytes over extensions", () => {
  const kind = (bytes: number[], reported = "") => sniffImageKind(new Uint8Array(bytes), reported);

  it("reads every decodable format from its first bytes", () => {
    expect(kind([0xff, 0xd8, 0xff, 0xe0, 0x00])).toBe("jpeg");
    expect(kind([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).toBe("png");
    expect(kind([...new TextEncoder().encode("GIF89a")] )).toBe("gif");
    expect(kind([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")])).toBe("webp");
    expect(kind([0x42, 0x4d, 0x00, 0x00])).toBe("bmp");
    expect(kind([...new TextEncoder().encode("....ftypavif....")])).toBe("avif");
    expect(kind([0x00, 0x00, 0x01, 0x00, 0x00])).toBe("ico");
    expect(kind([...new TextEncoder().encode("<svg xmlns=")])).toBe("svg");
    expect(kind([0xef, 0xbb, 0xbf, 0x3c, 0x3f, 0x78, 0x6d, 0x6c], "text/plain")).toBe("svg"); // BOM + <?xml
    expect(kind([0x01, 0x02, 0x03])).toBe("unknown");
    // A reported type alone never promotes real bytes.
    expect(kind([0x01, 0x02, 0x03], "image/png")).toBe("unknown");
    // ISOBMFF but not AVIF — HEIC is not decodable in most browsers.
    expect(kind([...new TextEncoder().encode("....ftypheic....")])).toBe("unknown");
  });

  it("counts GIF frame extensions for the first-frame hint", () => {
    const one = [0x21, 0xf9, 0x04, 0x00];
    const still = [...new TextEncoder().encode("GIF89a"), ...one];
    const animated = [...new TextEncoder().encode("GIF89a"), ...one, ...one];
    expect(isAnimatedGif(new Uint8Array(still))).toBe(false);
    expect(isAnimatedGif(new Uint8Array(animated))).toBe(true);
  });
});

describe("render — the decision helpers", () => {
  it("flags the Safari WebP fallback off the blob's real type", () => {
    expect(isWebpFallback("webp", "image/png")).toBe(true);
    expect(isWebpFallback("webp", "image/webp")).toBe(false);
    expect(isWebpFallback("png", "image/png")).toBe(false);
    expect(isWebpFallback("jpeg", "image/jpeg")).toBe(false);
  });

  it("refuses outputs the canvas would fail silently", () => {
    expect(outputRefused(8192, 100)).toBe(false); // at the side cap, small area
    expect(outputRefused(8193, 100)).toBe(true); // past the side cap
    expect(outputRefused(4096, 4097)).toBe(true); // 16.8 M px, past the iOS area cap
    expect(outputRefused(4096, 4000)).toBe(false); // 16.4 M px, inside it
  });

  it("formats bytes and savings the way the proof line reads them", () => {
    expect(formatBytes(8)).toBe("8 B");
    expect(formatBytes(340 * 1024)).toBe("340 kB");
    expect(formatBytes(1.2 * 1024 * 1024)).toBe("1.2 MB");
    expect(savingsPercent(1000, 420)).toBe(58);
    expect(savingsPercent(1000, 1200)).toBe(-20); // a loss is a loss, shown plainly
    expect(savingsPercent(0, 100)).toBe(0);
  });

  it("names downloads and extensions the house way", () => {
    expect(extensionFor("jpeg")).toBe("jpg");
    expect(extensionFor("png")).toBe("png");
    expect(resizeFilename("photo.JPG", 500, "webp")).toBe("photo-500w.webp");
    expect(resizeFilename("no-extension", 1200, "jpeg")).toBe("no-extension-1200w.jpg");
  });

  it("throws the typed refused error, and only the browser fns need a window", () => {
    expect(new CanvasRefusedError()).toBeInstanceOf(Error);
    expect(String(new CanvasRefusedError())).toContain("smaller size");
  });
});

describe("CapyResize registration", () => {
  it("sits eighth in the SUITE with its plate", () => {
    expect(SUITE).toHaveLength(8);
    const row = SUITE[7];
    expect(row.name).toBe("CapyResize");
    expect(row.href).toBe("/capyresize");
    expect(row.cat).toBe("browser");
    expect(row.plate).toEqual({ src: "/plates/lab-8.webp", width: 896, height: 1200 });
  });

  it("has a page exporting the metadata the suite expects", () => {
    expect(existsSync(join(process.cwd(), "src", "app", "capyresize", "page.tsx"))).toBe(true);
    expect(metadata.title).toContain("CapyResize");
    expect(metadata.description).toContain("100% in your browser");
  });
});
