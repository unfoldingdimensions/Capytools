import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { sniffImageKind } from "../src/lib/capystrip/detect";
import { HERO, LABS } from "../src/lib/capytools/landing";
import { SUITE, pad2, suiteNumber } from "../src/lib/capytools/suite";
import {
  canvasIsUsable,
  decideOutputMime,
  isVerificationClean,
} from "../src/lib/capystrip/clean";
import {
  digitalSourceLabel,
  dmsToDecimal,
  formatBytes,
  formatExposure,
  formatGpsDms,
  friendlyDate,
} from "../src/lib/capystrip/format";
import {
  findPngChunk,
  parseA1111Parameters,
  readPngText,
  walkPngChunks,
} from "../src/lib/capystrip/png";
import { normalizeGps, scanMarkers } from "../src/lib/capystrip/parse";
import { VERDICT_COPY, buildReport } from "../src/lib/capystrip/report";
import { DEMO_REPORT } from "../src/lib/capystrip/demo";
import type { RawMetadata } from "../src/lib/capystrip/types";

// ---- fixtures -------------------------------------------------------------

function bytesOf(...parts: (number[] | Uint8Array)[]): Uint8Array {
  const flat = parts.map((p) => Array.from(p));
  return new Uint8Array(flat.flat());
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** [4-byte length][4-byte type][data][4-byte CRC] — the walker skips CRCs, so zeros suffice. */
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const length = data.length;
  const typeBytes = [...type].map((c) => c.charCodeAt(0));
  return bytesOf(
    [(length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff],
    typeBytes,
    data,
    [0, 0, 0, 0],
  );
}

const A1111_VALUE = [
  "a serene capybara beside a slow river, golden hour",
  "Negative prompt: blurry, lowres, watermark",
  "Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 123456, Size: 512x512, Model: v1-5-pruned",
].join("\n");

function textChunkData(key: string, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(`${key}\0`);
  return bytesOf(keyBytes, encoder.encode(value));
}

function ztxtChunkData(key: string, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(`${key}\0`);
  // key\0 + compression method 0 (zlib) + deflated stream
  return bytesOf(keyBytes, [0], deflateSync(Buffer.from(value)));
}

/** signature + IHDR + tEXt parameters + zTXt + caBX + IEND */
function buildTestPng(): Uint8Array {
  return bytesOf(
    PNG_SIGNATURE,
    pngChunk("IHDR", bytesOf([0, 0, 0, 1], [0, 0, 0, 1], [8], [6], [0], [0], [0])),
    pngChunk("tEXt", textChunkData("parameters", A1111_VALUE)),
    pngChunk("zTXt", ztxtChunkData("XML:com.adobe.xmp", "<x:xmpmeta>compressed</x:xmpmeta>")),
    pngChunk("caBX", new TextEncoder().encode("jumb")),
    pngChunk("IEND", new Uint8Array(0)),
  );
}

function emptyRaw(overrides: Partial<RawMetadata> = {}): RawMetadata {
  return {
    kind: "png",
    fileName: "test.png",
    byteSize: 1234,
    gps: null,
    iccPresent: false,
    thumbnailPresent: false,
    c2pa: null,
    markers: [],
    ...overrides,
  };
}

// ---- 1. detect ------------------------------------------------------------

describe("sniffImageKind", () => {
  const sniff = (bytes: number[]) => sniffImageKind(new Blob([new Uint8Array(bytes)]));

  it("reads magic bytes, not extensions", async () => {
    expect(await sniff([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])).toBe("jpeg");
    expect(await sniff(PNG_SIGNATURE)).toBe("png");
    expect(
      await sniff([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]),
    ).toBe("webp");
    expect(await sniff([...new TextEncoder().encode("\0\0\0 ftypheic")])).toBe("heic");
    expect(await sniff([...new TextEncoder().encode("\0\0\0 ftypavif")])).toBe("avif");
    expect(await sniff([0x49, 0x49, 0x2a, 0x00])).toBe("tiff"); // II*
    expect(await sniff([0x4d, 0x4d, 0x00, 0x2a])).toBe("tiff"); // MM*
    expect(await sniff([1, 2, 3, 4, 5, 6])).toBe("unknown");
    expect(await sniff([])).toBe("unknown");
  });

  it("does not mistake other ISOBMFF brands (mp4/mov) for HEIC", async () => {
    expect(await sniff([...new TextEncoder().encode("\0\0\0 ftypisom")])).toBe("unknown");
  });
});

// ---- 2. png ----------------------------------------------------------------

describe("png chunk walker", () => {
  const png = buildTestPng();

  it("walks chunks in order and stops at IEND", () => {
    const types = walkPngChunks(png).map((c) => c.type);
    expect(types).toEqual(["IHDR", "tEXt", "zTXt", "caBX", "IEND"]);
  });

  it("returns nothing for non-PNG bytes", () => {
    expect(walkPngChunks(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toEqual([]);
  });

  it("stops before a truncated length rather than trusting it", () => {
    // length field claims 0xFFFFFFFF but the data isn't there
    const evil = bytesOf(PNG_SIGNATURE, [0xff, 0xff, 0xff, 0xff], [..."tEXt"].map((c) => c.charCodeAt(0)));
    expect(walkPngChunks(evil)).toEqual([]);
  });

  it("reads tEXt and zTXt values and finds caBX", async () => {
    const texts = await readPngText(png);
    expect(texts.find((t) => t.key === "parameters")?.value).toBe(A1111_VALUE);
    expect(texts.find((t) => t.key === "parameters")?.chunk).toBe("tEXt");

    const xmp = texts.find((t) => t.key === "XML:com.adobe.xmp");
    expect(xmp?.chunk).toBe("zTXt");

    expect(findPngChunk(png, "caBX")?.type).toBe("caBX");
    expect(findPngChunk(png, "zzZZ")).toBeNull();
  });

  it.runIf(typeof DecompressionStream !== "undefined")(
    "inflates zTXt with DecompressionStream",
    async () => {
      const texts = await readPngText(png);
      expect(texts.find((t) => t.key === "XML:com.adobe.xmp")?.value).toContain("<x:xmpmeta>compressed</x:xmpmeta>");
    },
  );
});

describe("parseA1111Parameters", () => {
  it("splits prompt / negative prompt / settings", () => {
    const parsed = parseA1111Parameters(A1111_VALUE);
    expect(parsed.prompt).toBe("a serene capybara beside a slow river, golden hour");
    expect(parsed.negativePrompt).toBe("blurry, lowres, watermark");
    expect(parsed.settings).toBe(
      "Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 123456, Size: 512x512, Model: v1-5-pruned",
    );
  });

  it("handles a bare one-line prompt", () => {
    const parsed = parseA1111Parameters("just a capybara");
    expect(parsed.prompt).toBe("just a capybara");
    expect(parsed.negativePrompt).toBeNull();
    expect(parsed.settings).toBeNull();
  });

  it("does not mistake a prompt line containing a colon for settings", () => {
    const parsed = parseA1111Parameters("warning: capybaras ahead");
    expect(parsed.prompt).toBe("warning: capybaras ahead");
    expect(parsed.settings).toBeNull();
  });
});

// ---- 3. marker scan ---------------------------------------------------------

describe("scanMarkers", () => {
  const scan = (text: string) => scanMarkers(new TextEncoder().encode(text));

  it("reports AI fingerprints and ignores the JFIF container tag", () => {
    const { markers } = scan("this file carries trainedAlgorithmicMedia, Midjourney traces, c2pa boxes and a JFIF header");
    expect(markers).toContain("trainedAlgorithmicMedia");
    expect(markers).toContain("Midjourney");
    expect(markers).toContain("c2pa");
    expect(markers).not.toContain("JFIF");
  });

  it("never fires on the word 'prompt' alone", () => {
    const { markers, c2pa } = scan("a plain old photo prompt");
    expect(markers).toEqual([]);
    expect(c2pa).toBeNull();
  });

  it("detects C2PA only in real containers, not loose text", () => {
    expect(scan("c2pa jumb contentauth").c2pa).toBeNull();
    const webp = bytesOf(
      [..."RIFF"].map((c) => c.charCodeAt(0)),
      [0, 0, 0, 0],
      [..."WEBP"].map((c) => c.charCodeAt(0)),
      new TextEncoder().encode("...c2pa manifest..."),
    );
    expect(scanMarkers(webp).c2pa).toBe("riff");
  });
});

// ---- 4. format --------------------------------------------------------------

describe("format helpers", () => {
  it("formats exposure as a shutter fraction", () => {
    expect(formatExposure(0.004)).toBe("1/250 s");
    expect(formatExposure(0.5)).toBe("1/2 s");
    expect(formatExposure(2)).toBe("2 s");
  });

  it("round-trips DMS through decimal", () => {
    expect(dmsToDecimal([40, 44, 54.36], "N")).toBeCloseTo(40.74843, 4);
    expect(dmsToDecimal([40, 44, 54.36], "S")).toBeCloseTo(-40.74843, 4);
    expect(dmsToDecimal([3, 42, 13.68], "W")).toBeCloseTo(-3.7038, 4);
    expect(dmsToDecimal([3, 42, 13.68], "E")).toBeCloseTo(3.7038, 4);
  });

  it("labels DMS with hemispheres", () => {
    expect(formatGpsDms(40.7484, "lat")).toBe("40° 44′ 54.2″ N");
    expect(formatGpsDms(-3.7038, "lon")).toBe("3° 42′ 13.7″ W");
  });

  it("covers the IPTC digital-source-type vocabulary", () => {
    expect(digitalSourceLabel("trainedAlgorithmicMedia")).toMatch(/generative AI/);
    expect(digitalSourceLabel("compositeWithTrainedAlgorithmicMedia")).toMatch(/Composite that includes/);
    expect(digitalSourceLabel("algorithmicMedia")).toMatch(/not AI-trained/);
    expect(digitalSourceLabel("compositeSynthetic")).toMatch(/synthetic sources/);
    expect(digitalSourceLabel("digitalCapture")).toMatch(/camera capture/i);
    expect(digitalSourceLabel("minorHumanEdits")).toMatch(/minor edits/);
    expect(digitalSourceLabel("majorHumanEdits")).toMatch(/major edits/);
    expect(digitalSourceLabel("screenCapture")).toMatch(/Screen capture/);
    expect(digitalSourceLabel("digitalArt")).toMatch(/Digital art/);
    expect(digitalSourceLabel("data")).toBe("Data");
    expect(digitalSourceLabel("somethingElse")).toBe("somethingElse");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3_145_728)).toBe("3.0 MB");
    expect(formatBytes(-1)).toBe("—");
  });

  it("formats revived EXIF dates readably", () => {
    expect(friendlyDate(new Date(2024, 4, 1, 12, 34))).toBe("May 1, 2024, 12:34");
  });
});

// ---- 5. report ---------------------------------------------------------------

describe("buildReport", () => {
  const chattyRaw = emptyRaw({
    kind: "png",
    fileName: "IMG_4128.png",
    exif: {
      Make: "Capybara CyberShot Corp.",
      Model: "Capyber-shot DSC-H300",
      BodySerialNumber: "2718281828",
    },
    xmp: { DigitalSourceType: "trainedAlgorithmicMedia" },
    pngText: [{ key: "parameters", value: A1111_VALUE, chunk: "tEXt" }],
    gps: { latitude: 40.4168, longitude: -3.7038 },
    c2pa: "caBX",
    markers: ["c2pa"],
  });

  it("maps privacy, AI and C2PA evidence into critical fields", () => {
    const report = buildReport(chattyRaw, chattyRaw.fileName);
    const byId = Object.fromEntries(report.fields.map((f) => [f.id, f]));

    expect(byId.location.critical).toBe(true);
    expect(byId.location.category).toBe("privacy");
    expect(byId["camera-model"].critical).toBe(true);
    expect(byId["body-serial"].value).toBe("2718281828");
    expect(byId["ai-source"].critical).toBe(true);
    expect(byId["generation-prompt"].category).toBe("software_ai");
    expect(byId.c2pa.critical).toBe(true);
    expect(report.chattyCount).toBeGreaterThanOrEqual(6);
    expect(report.verdict).toBe("chatty");
  });

  it("assembles AI signal sentences, deduplicated", () => {
    const report = buildReport(chattyRaw, chattyRaw.fileName);
    expect(report.aiSignals).toContain("declared AI-generated (IPTC source type: Made with generative AI (model trained on sampled content))");
    expect(report.aiSignals).toContain("carries a Stable Diffusion-style generation prompt (prompt and settings embedded)");
    expect(report.aiSignals).toContain("content credentials present (C2PA)");
    // "c2pa" appears both as a marker and as the container — one sentence only.
    expect(report.aiSignals.filter((s) => s.includes("C2PA"))).toHaveLength(1);
  });

  it("goes quiet, then muted, then blank as evidence disappears", () => {
    const quiet = buildReport(
      emptyRaw({ exif: { ExposureTime: 0.004, FNumber: 2.8, ISO: 200 } }),
      "q.png",
    );
    expect(quiet.verdict).toBe("quiet");
    expect(quiet.chattyCount).toBe(0);

    const muted = buildReport(emptyRaw({ iccPresent: true }), "m.png");
    expect(muted.verdict).toBe("muted");

    const blank = buildReport(emptyRaw(), "b.png");
    expect(blank.verdict).toBe("blank");
    expect(blank.fields).toEqual([]);
  });

  it("pairs the verdict with calm copy", () => {
    expect(VERDICT_COPY.chatty).toMatch(/a lot to say/);
    expect(VERDICT_COPY.blank).toMatch(/secrets/);
  });

  it("keeps the demo report chatty so the idle card teaches", () => {
    expect(DEMO_REPORT.verdict).toBe("chatty");
    expect(DEMO_REPORT.gps).not.toBeNull();
    expect(DEMO_REPORT.aiSignals.length).toBeGreaterThan(0);
    expect(DEMO_REPORT.fields.find((f) => f.id === "camera-model")?.value).toContain("Capyber-shot");
  });
});

// ---- 6. clean (logic only — no canvas in node) ------------------------------

describe("decideOutputMime", () => {
  it("keeps jpeg and png as-is", () => {
    expect(decideOutputMime("jpeg", false)).toEqual({ mimeType: "image/jpeg" });
    expect(decideOutputMime("png", true)).toEqual({ mimeType: "image/png" });
  });

  it("falls back to PNG when WebP encoding is unsupported (Safari)", () => {
    expect(decideOutputMime("webp", true)).toEqual({ mimeType: "image/webp" });
    const fallback = decideOutputMime("webp", false);
    expect(fallback.mimeType).toBe("image/png");
    expect(fallback.note).toMatch(/can't export WebP/);
  });

  it("sends AVIF to PNG with a note", () => {
    const out = decideOutputMime("avif", true);
    expect(out.mimeType).toBe("image/png");
    expect(out.note).toMatch(/AVIF export isn't available/);
  });

  it("refuses TIFF, and doesn't tell other formats they are one", () => {
    expect(() => decideOutputMime("tiff", true)).toThrow(/TIFF/);
    expect(() => decideOutputMime("unknown", true)).toThrow(/can't redraw that format/);
  });

  it("gives HEIC a JPEG target so the decode attempt decides, not the matrix", () => {
    // Safari can decode HEIC. Throwing up front made that branch dead code and
    // told Safari users their browser couldn't do the thing it was doing.
    const out = decideOutputMime("heic", true);
    expect(out.mimeType).toBe("image/jpeg");
    expect(out.note).toMatch(/saved as JPEG/);
  });

  it("verification ignores container headers but not real metadata", () => {
    // A canvas-encoded JPEG carries JFIF version/density tags and, on every
    // browser, a freshly-stamped sRGB ICC profile — encoder plumbing, not
    // user metadata (the source ICC never survives a redraw).
    expect(
      isVerificationClean(
        emptyRaw({
          exif: {
            JFIFVersion: [1, 1],
            ResolutionUnit: 1,
            XResolution: 72,
            YResolution: 72,
            ImageWidth: 8,
            ImageHeight: 8,
            BitDepth: 8,
            ColorType: 6,
            ProfileDescription: "sRGB IEC61966-2.1",
            ProfileClass: "mntr",
            ColorSpaceData: "RGB ",
            DeviceManufacturer: "APPL",
            DeviceModel: undefined,
            PrimaryPlatform: "APPL",
            RenderingIntent: 0,
            MediaWhitePoint: new Uint8Array([1, 2, 3]),
            RedTRC: new Uint8Array([1, 2, 3]),
          },
        }),
      ),
    ).toBe(true);

    expect(isVerificationClean(emptyRaw({ exif: { Make: "capY" } }))).toBe(false);
    expect(isVerificationClean(emptyRaw({ exif: { Artist: "someone" } }))).toBe(false);
    expect(isVerificationClean(emptyRaw({ markers: ["Midjourney"] }))).toBe(false);
    expect(isVerificationClean(emptyRaw({ c2pa: "app11" }))).toBe(false);
    expect(isVerificationClean(emptyRaw({ pngText: [{ key: "parameters", value: "x", chunk: "tEXt" }] }))).toBe(false);
    expect(isVerificationClean(emptyRaw())).toBe(true);
  });
});

// ---- 7. registration parity ---------------------------------------------------

describe("capystrip registration", () => {
  it("is registered in the suite, and every surface derives from that one row", () => {
    const at = SUITE.findIndex((tool) => tool.href === "/capystrip");
    expect(at).toBeGreaterThanOrEqual(0);
    expect(SUITE[at].name).toBe("CapyStrip");
    // The landing catalog, the masthead's switcher, the Colophon's partner row,
    // the footer's Suite column, the notes page and the sitemap all read this
    // array, so its position here is the tool's number everywhere — and adding
    // a tool is one row plus its page, not a scavenger hunt.
    expect(suiteNumber("/capystrip")).toBe(pad2(at + 1));
    expect(LABS.tools.some((tool) => tool.href === "/capystrip")).toBe(true);
    expect(HERO.lead).toContain("CapyStrip");
  });
});

describe("CapyStrip GPS normalisation", () => {
  it("keeps a complete coordinate pair", () => {
    expect(normalizeGps({ latitude: -33.8688, longitude: 151.2093 })).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
    });
    expect(normalizeGps({ latitude: 0, longitude: 0 })).toEqual({ latitude: 0, longitude: 0 });
  });

  it("rejects the partial object exifr returns for a half-written GPS block", () => {
    // exifr resolves truthy whenever the GPS block is non-empty, so a file with
    // only GPSLatitudeRef used to reach report.ts and throw on .toFixed().
    expect(normalizeGps({ latitude: undefined, longitude: undefined })).toBeNull();
    expect(normalizeGps({ latitude: -33.8688 })).toBeNull();
    expect(normalizeGps({ latitude: NaN, longitude: 151.2093 })).toBeNull();
    expect(normalizeGps(undefined)).toBeNull();
    expect(normalizeGps(null)).toBeNull();
  });
});

describe("canvas probe replaces the guessed size cap", () => {
  /** A ctx stub: `paints` false is the silent-failure mode browsers show past their limit. */
  const ctx = (paints: boolean, throws = false) => {
    const calls: string[] = [];
    return {
      calls,
      ctx: {
        fillStyle: "",
        fillRect: () => calls.push("fillRect"),
        clearRect: () => calls.push("clearRect"),
        getImageData: () => {
          if (throws) throw new Error("tainted or oversized");
          return { data: paints ? [255, 0, 0, 255] : [0, 0, 0, 0] };
        },
      } as unknown as CanvasRenderingContext2D,
    };
  };

  it("passes a canvas that really paints, and clears the probe pixel", () => {
    const { ctx: c, calls } = ctx(true);
    expect(canvasIsUsable(c, 6000, 4000)).toBe(true);
    // The probe must not survive into the clean copy.
    expect(calls).toContain("clearRect");
  });

  it("fails a canvas that silently paints nothing", () => {
    expect(canvasIsUsable(ctx(false).ctx, 20000, 20000)).toBe(false);
  });

  it("fails closed when the readback throws", () => {
    expect(canvasIsUsable(ctx(true, true).ctx, 20000, 20000)).toBe(false);
  });

  it("does not judge by size — a 24MP photo is fine on a canvas that works", () => {
    // 6000x4000 = 24 Mpx, over the old hardcoded 16.7 Mpx cap that turned away
    // an ordinary 2.4MB phone JPEG.
    expect(6000 * 4000).toBeGreaterThan(16_777_216);
    expect(canvasIsUsable(ctx(true).ctx, 6000, 4000)).toBe(true);
  });
});
