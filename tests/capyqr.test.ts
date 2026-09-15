import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { metadata } from "../src/app/capyqr/page";
import { SUITE } from "../src/lib/capytools/suite";
import {
  CONTRAST_COPY,
  QUIET_COPY,
  contrastBand,
  contrastRatio,
  logoAdvice,
  quietBand,
  quietZonePx,
} from "../src/lib/capyqr/guards";
import qrcode from "qrcode-generator";

import { capacityNote, exportSpecLine, moduleCountFor, versionForModuleCount } from "../src/lib/capyqr/matrix";
import { buildPayload, escapeWifiValue, toIcalStamp } from "../src/lib/capyqr/payloads";
import { frameLayout, type FrameLayout } from "../src/lib/capyqr/frame";
import {
  BACKGROUND_SWATCHES,
  CODE_SWATCHES,
  EYES_SWATCHES,
} from "../src/lib/capyqr/presets";
import { CAPY_PRESETS, randomGuardPassingStyle } from "../src/lib/capyqr/presets";
import type { PayloadFields, PayloadKind } from "../src/lib/capyqr/types";
import { toEngineByteString } from "../src/lib/capyqr/utf8";
import { verifyPixels } from "../src/lib/capyqr/verify";
import {
  PAPER_COLOR,
  buildEngineOptions,
  fileExtensionFor,
  formatKb,
  jpegFillNeeded,
  svgExportBlocked,
  toFill,
  toForeground,
  toGradient,
} from "../src/lib/capyqr/render";

const payloadFor = (kind: PayloadKind, fields: PayloadFields) => buildPayload(kind, fields);

describe("CapyQR payloads — Wi-Fi escaping", () => {
  it("escapes all five schema characters, backslash first", () => {
    expect(escapeWifiValue('foo;bar"baz\\')).toBe('foo\\;bar\\"baz\\\\');
    expect(escapeWifiValue("a,b:c")).toBe("a\\,b\\:c");
    expect(escapeWifiValue("plain ssid")).toBe("plain ssid");
  });

  it("builds the spec-shaped string, SSID and password escaped", () => {
    const result = payloadFor("wifi", {
      wifi: { ssid: 'cafe;guest', password: 'pw:1",2', encryption: "WPA", hidden: false },
    });
    expect(result).toEqual({
      ok: true,
      value: 'WIFI:T:WPA;S:cafe\\;guest;P:pw\\:1\\"\\,2;H:false;;',
    });
  });

  it("marks hidden networks with H:true", () => {
    const result = payloadFor("wifi", {
      wifi: { ssid: "lantern", password: "glow", encryption: "WPA", hidden: true },
    });
    expect(result.ok && result.value.endsWith("H:true;;")).toBe(true);
  });

  it("omits the password field for open networks", () => {
    const result = payloadFor("wifi", {
      wifi: { ssid: "opennet", password: "", encryption: "nopass", hidden: false },
    });
    expect(result).toEqual({ ok: true, value: "WIFI:T:nopass;S:opennet;H:false;;" });
  });

  it("refuses an SSID-less Wi-Fi code with the fix in the sentence", () => {
    const result = payloadFor("wifi", {
      wifi: { ssid: "   ", password: "x", encryption: "WPA", hidden: false },
    });
    expect(!result.ok && result.error).toContain("SSID");
  });
});

describe("CapyQR payloads — contact vCard 3.0", () => {
  it("emits only the fields that exist — no empty lines", () => {
    const result = payloadFor("contact", {
      contact: { first: "Ada", last: "Lovelace", phone: "+61 2 8374 4000" },
    });
    expect(result).toEqual({
      ok: true,
      value: [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Lovelace;Ada;;;",
        "FN:Ada Lovelace",
        "TEL:+61 2 8374 4000",
        "END:VCARD",
      ].join("\n"),
    });
  });

  it("carries a single name into both N and FN", () => {
    const result = payloadFor("contact", { contact: { first: "", last: "Hopper" } });
    expect(result.ok && result.value.includes("N:Hopper;;;;") && result.value.includes("FN:Hopper")).toBe(true);
  });

  it("refuses a nameless contact", () => {
    const result = payloadFor("contact", { contact: { first: " ", last: "" } });
    expect(!result.ok).toBe(true);
  });
});

describe("CapyQR payloads — email and link", () => {
  it("percent-encodes the mailto query per RFC 6068 (spaces are %20, not +)", () => {
    const result = payloadFor("email", {
      email: { to: "hello@capy.tools", subject: "a quiet note", body: "line one\nline two" },
    });
    expect(result).toEqual({
      ok: true,
      value: "mailto:hello@capy.tools?subject=a%20quiet%20note&body=line%20one%0Aline%20two",
    });
  });

  it("omits empty subject and body", () => {
    const result = payloadFor("email", { email: { to: "hi@there.dev", subject: " ", body: "" } });
    expect(result).toEqual({ ok: true, value: "mailto:hi@there.dev" });
  });

  it("refuses an address-less email code", () => {
    const result = payloadFor("email", { email: { to: "" } });
    expect(!result.ok).toBe(true);
  });

  it("keeps schemes intact and passes plain text through", () => {
    expect(payloadFor("link", { link: { text: "https://capy.tools/qr" } })).toEqual({
      ok: true,
      value: "https://capy.tools/qr",
    });
    expect(payloadFor("link", { link: { text: "just some words" } })).toEqual({
      ok: true,
      value: "just some words",
    });
  });

  it("refuses an empty link", () => {
    expect(!payloadFor("link", { link: { text: "  " } }).ok).toBe(true);
  });
});

describe("CapyQR payloads — phone, location, event", () => {
  it("builds tel: with whitespace stripped, everything else intact", () => {
    expect(payloadFor("tel", { tel: { phone: "+61 2 8374 4000" } })).toEqual({
      ok: true,
      value: "tel:+61283744000",
    });
  });

  it("refuses an empty phone code with the fix in the sentence", () => {
    const result = payloadFor("tel", { tel: { phone: "   " } });
    expect(!result.ok && result.error).toContain("add who it dials");
  });

  it("builds geo: from the coordinates as typed", () => {
    expect(payloadFor("geo", { geo: { lat: "-33.8688", long: "151.2093" } })).toEqual({
      ok: true,
      value: "geo:-33.8688,151.2093",
    });
  });

  it("refuses missing, non-numeric and out-of-range coordinates", () => {
    expect(!payloadFor("geo", { geo: { lat: "", long: "" } }).ok).toBe(true);
    expect(!payloadFor("geo", { geo: { lat: "north", long: "1" } }).ok).toBe(true);
    const outOfRange = payloadFor("geo", { geo: { lat: "95", long: "0" } });
    expect(!outOfRange.ok && outOfRange.error).toContain("±90");
    expect(!payloadFor("geo", { geo: { lat: "0", long: "-181" } }).ok).toBe(true);
  });

  it("builds the plain VEVENT with floating-local stamps and omits an empty location", () => {
    expect(
      payloadFor("event", {
        event: { title: "Quiet hours", start: "2026-10-04T18:30", end: "2026-10-04T20:00" },
      }),
    ).toEqual({
      ok: true,
      value: [
        "BEGIN:VEVENT",
        "SUMMARY:Quiet hours",
        "DTSTART:20261004T183000",
        "DTEND:20261004T200000",
        "END:VEVENT",
      ].join("\n"),
    });
  });

  it("carries a location line when the event has one", () => {
    const result = payloadFor("event", {
      event: {
        title: "Café meetup",
        start: "2026-10-04T09:00:00",
        end: "2026-10-04T11:00:00",
        location: "the warm pond",
      },
    });
    expect(result.ok && result.value.includes("LOCATION:the warm pond")).toBe(true);
    expect(result.ok && result.value.includes("DTSTART:20261004T090000")).toBe(true);
  });

  it("refuses a titleless event, missing times, and an end before the start", () => {
    expect(!payloadFor("event", { event: { title: "  ", start: "", end: "" } }).ok).toBe(true);
    const noTimes = payloadFor("event", {
      event: { title: "Quiet hours", start: "not-a-time", end: "2026-10-04T20:00" },
    });
    expect(!noTimes.ok && noTimes.error).toContain("fill both times");
    const backwards = payloadFor("event", {
      event: { title: "Quiet hours", start: "2026-10-04T20:00", end: "2026-10-04T18:30" },
    });
    expect(!backwards.ok && backwards.error).toContain("before the start");
  });

  it("toIcalStamp handles seconds, refuses garbage and impossible dates", () => {
    expect(toIcalStamp("2026-10-04T18:30")).toBe("20261004T183000");
    expect(toIcalStamp("2026-10-04T18:30:45")).toBe("20261004T183045");
    expect(toIcalStamp("  2026-10-04T18:30  ")).toBe("20261004T183000");
    expect(toIcalStamp("not-a-time")).toBeNull();
    expect(toIcalStamp("2026-13-04T18:30")).toBeNull();
    expect(toIcalStamp("2026-10-32T18:30")).toBeNull();
    expect(toIcalStamp("2026-10-04T25:30")).toBeNull();
    expect(toIcalStamp("2026-10-04")).toBeNull();
  });
});

describe("CapyQR matrix oracle", () => {
  it("grows with the payload and is stable for identical input", () => {
    const small = moduleCountFor("a".repeat(10), "M");
    const mid = moduleCountFor("a".repeat(100), "M");
    const big = moduleCountFor("a".repeat(1000), "M");
    expect(small).not.toBeNull();
    expect(mid).not.toBeNull();
    expect(big).not.toBeNull();
    expect(mid as number).toBeGreaterThan(small as number);
    expect(big as number).toBeGreaterThan(mid as number);
    expect(moduleCountFor("a".repeat(100), "M")).toBe(mid);
  });

  it("hands back null — never a throw — when the data will not fit", () => {
    // Version 40-L tops out at 2,953 byte-mode chars.
    expect(moduleCountFor("a".repeat(3200), "L")).toBeNull();
  });

  it("matches the engine's byte-mode sizes for a real-world payload", () => {
    // A v3-M code is 29 modules; this URL is its textbook size.
    expect(moduleCountFor("https://capytools.vercel.app/capyqr", "M")).toBe(29);
  });

  it("reads the version off the module count and says so friendly", () => {
    expect(versionForModuleCount(21)).toBe(1);
    expect(versionForModuleCount(29)).toBe(3);
    expect(versionForModuleCount(25)).toBe(2);
    const note = capacityNote("https://capytools.vercel.app/capyqr", "M");
    expect(note).toContain("29 modules");
    expect(note).toContain("version 3");
    expect(capacityNote("a".repeat(3200), "L")).toContain("quieter style or shorter text");
  });
});

describe("CapyQR export spec line", () => {
  it("prints the whole spec sheet, quiet px rounded", () => {
    expect(
      exportSpecLine({
        ecc: "Q",
        moduleCount: 29,
        quietModules: 4,
        quietPx: (4 * 1024) / 29,
        size: 1024,
        format: "png",
      }),
    ).toBe("error correction Q · 29 modules · quiet zone 4 (≈141 px) · 1024×1024 png");
  });

  it("drops the quiet segment when the slider is at zero", () => {
    expect(
      exportSpecLine({ ecc: "H", moduleCount: 25, quietModules: 0, quietPx: 0, size: 512, format: "jpeg" }),
    ).toBe("error correction H · 25 modules · 512×512 jpg");
  });

  it("names svg and copes with a zero module count", () => {
    expect(
      exportSpecLine({ ecc: "M", moduleCount: 0, quietModules: 2, quietPx: 20, size: 2048, format: "svg" }),
    ).toBe("error correction M · quiet zone 2 (≈20 px) · 2048×2048 svg");
  });

  it("reports measured blob sizes, never estimates", () => {
    expect(formatKb(421888)).toBe("412 KB");
    expect(formatKb(512)).toBe("1 KB");
  });
});

describe("CapyQR guards", () => {
  it("computes the WCAG contrast ratio", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#1a1a1a", "#ffffff")).toBeGreaterThan(12);
    // The mid sage on cream measures ~2.8 — the reason the preset uses sage-deep.
    expect(contrastRatio("#8e9b7e", "#f9f9f7")).toBeGreaterThan(2);
    expect(contrastRatio("#8e9b7e", "#f9f9f7")).toBeLessThan(3);
  });

  it("bands contrast: hard under 2, soft under 3, ok at 3 and above", () => {
    expect(contrastBand(contrastRatio("#c07952", "#8e9b7e"))).toBe("hard");
    expect(contrastBand(contrastRatio("#8e9b7e", "#f9f9f7"))).toBe("soft");
    expect(contrastBand(contrastRatio("#1a1a1a", "#ffffff"))).toBe("ok");
    expect(CONTRAST_COPY.hard).toContain("above 3:1");
    expect(CONTRAST_COPY.soft).toContain("above 3:1");
  });

  it("converts quiet modules to engine pixels at the export size", () => {
    expect(quietZonePx(1024, 29, 4)).toBeCloseTo((4 * 1024) / 29, 6);
    expect(quietZonePx(512, 25, 2)).toBeCloseTo((2 * 512) / 25, 6);
  });

  it("bands the quiet zone at the spec's four modules", () => {
    expect(quietBand(0)).toBe("hard");
    expect(quietBand(1)).toBe("hard");
    expect(quietBand(2)).toBe("soft");
    expect(quietBand(3)).toBe("soft");
    expect(quietBand(4)).toBe("ok");
    expect(quietBand(6)).toBe("ok");
    expect(QUIET_COPY.hard).toContain("slide it back up");
  });

  it("advises on logos: ECC below H, and the H safety line", () => {
    expect(logoAdvice(false, "Q")).toEqual([]);
    const underH = logoAdvice(true, "Q");
    expect(underH).toHaveLength(1);
    expect(underH[0]).toContain("H");

    const atH = logoAdvice(true, "H");
    expect(atH).toHaveLength(1);
    expect(atH[0]).toContain("30%");
  });
});

describe("CapyQR presets — scannable by construction", () => {
  it("ships five, on the house palette", () => {
    expect(CAPY_PRESETS.map((preset) => preset.id)).toEqual([
      "sage",
      "water",
      "clay",
      "gold",
      "mono",
    ]);
  });

  it("every preset clears 4.5:1 on its modules (and corners) and sits at quiet 4", () => {
    for (const preset of CAPY_PRESETS) {
      const { fg, bg, cornerColor, quietModules, ecc } = preset.style;
      expect(bg, `${preset.id} needs a solid background`).not.toBe("transparent");
      const surface = bg === "transparent" ? "#ffffff" : bg;
      expect(fg.mode, preset.id).toBe("solid");
      if (fg.mode !== "solid") continue;
      const ratio = contrastRatio(fg.color, surface);
      expect(ratio, `${preset.id} modules at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      if (cornerColor) {
        expect(
          contrastRatio(cornerColor, surface),
          `${preset.id} corners`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(quietModules, `${preset.id} quiet zone`).toBe(4);
      expect(["Q", "H"]).toContain(ecc);
    }
  });
});

describe("CapyQR swatches + randomize", () => {
  it("ships hex-shaped, non-empty swatch rows on house tokens", () => {
    for (const row of [CODE_SWATCHES, EYES_SWATCHES, BACKGROUND_SWATCHES]) {
      expect(row.length).toBeGreaterThanOrEqual(5);
      for (const hex of row) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
    // Personality colors live in the eyes row too — gold on cream is only
    // ~2.1:1 — and that is exactly what the eyes guard line is for: the
    // component measures cornerColor against the surface and flags anything
    // outside the "ok" band. The contract: every weak pairing is catchable.
    expect(contrastBand(contrastRatio("#d9a441", "#f9f9f7"))).toBe("soft");
    expect(contrastBand(contrastRatio("#1a1a1a", "#f9f9f7"))).toBe("ok");
  });

  it("randomize only ever lands on guard-passing styles", () => {
    // Deterministic LCG so the property holds run over run.
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const pairs = new Set<string>();
    for (let draw = 0; draw < 200; draw++) {
      const style = randomGuardPassingStyle(rng);
      expect(style.fg.mode).toBe("solid");
      expect(style.quietModules).toBe(4);
      expect(style.ecc).toBe("Q");
      expect(style.cornerColor).toBeNull();
      if (style.fg.mode !== "solid") continue;
      expect(contrastBand(contrastRatio(style.fg.color, style.bg))).toBe("ok");
      expect(contrastRatio(style.fg.color, style.bg)).toBeGreaterThanOrEqual(4.5);
      pairs.add(`${style.fg.color}/${style.bg}`);
    }
    // Variety: the sampler must not quietly collapse onto one combination.
    expect(pairs.size).toBeGreaterThanOrEqual(10);
  });
});

describe("CapyQR render decision helpers — pure, table-tested", () => {
  it("flattens transparent backgrounds onto paper for JPEG only", () => {
    expect(PAPER_COLOR).toBe("#ffffff");
    expect(jpegFillNeeded("transparent")).toBe(true);
    expect(jpegFillNeeded(undefined)).toBe(true);
    expect(jpegFillNeeded("#f9f9f7")).toBe(false);
  });

  it("blocks SVG export exactly when a logo is set", () => {
    expect(svgExportBlocked(true, false)).toBe(true);
    expect(svgExportBlocked(false, true)).toBe(true);
    expect(svgExportBlocked(true, true)).toBe(true);
    expect(svgExportBlocked(false, false)).toBe(false);
  });

  it("translates the gradient state into engine shape, degrees into radians", () => {
    const spec = toGradient({
      mode: "gradient",
      gradientType: "radial",
      from: "#4a6741",
      to: "#5f7a72",
      rotation: 90,
    });
    expect(spec.gradient.type).toBe("radial");
    expect(spec.gradient.rotation).toBeCloseTo(Math.PI / 2, 10);
    expect(spec.gradient.colorStops).toEqual([
      { offset: 0, color: "#4a6741" },
      { offset: 1, color: "#5f7a72" },
    ]);
    expect(toForeground({ mode: "solid", color: "#1a1a1a" })).toEqual({ color: "#1a1a1a" });
    expect(toFill("#8e9b7e")).toEqual({ color: "#8e9b7e" });
  });

  it("names the downloads", () => {
    expect(fileExtensionFor("png")).toBe("png");
    expect(fileExtensionFor("jpeg")).toBe("jpg");
    expect(fileExtensionFor("svg")).toBe("svg");
  });

  it("builds engine options that carry the whole style", () => {
    const style = CAPY_PRESETS[0].style;
    const options = buildEngineOptions({
      value: "WIFI:T:WPA;S:test;H:false;;",
      size: 1024,
      style,
      quietPx: 141.24,
      logoUrl: null,
    });
    expect(options.type).toBe("canvas");
    expect(options.width).toBe(1024);
    expect(options.height).toBe(1024);
    expect(options.margin).toBeCloseTo(141.24, 6);
    expect(options.data).toBe("WIFI:T:WPA;S:test;H:false;;");
    expect(options.qrOptions).toEqual({ typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" });
    expect(options.dotsOptions?.type).toBe("square");
    expect(options.backgroundOptions).toEqual({ color: "#f9f9f7" });
    expect(options.image).toBeUndefined();
    expect(options.imageOptions).toEqual({ hideBackgroundDots: true, imageSize: 0.4 });
    // No corner color set: the corners follow the foreground.
    expect(options.cornersSquareOptions).toEqual({ type: "square", color: "#4a6741" });
    expect(options.cornersDotOptions).toEqual({ type: "square", color: "#4a6741" });

    const withCorner = buildEngineOptions({
      value: "x",
      size: 512,
      style: { ...style, cornerColor: "#5f7a72", bg: "transparent", ecc: "H" },
      quietPx: 40,
      logoUrl: "blob:logo",
    });
    expect(withCorner.cornersSquareOptions).toEqual({ type: "square", color: "#5f7a72" });
    expect(withCorner.cornersDotOptions).toEqual({ type: "square", color: "#5f7a72" });
    expect(withCorner.backgroundOptions).toEqual({ color: "transparent" });
    expect(withCorner.qrOptions?.errorCorrectionLevel).toBe("H");
    expect(withCorner.image).toBe("blob:logo");
  });
});

describe("CapyQR utf8 bridge", () => {
  it("turns multibyte text into its own UTF-8 bytes, one Latin-1 char each", () => {
    const acute = toEngineByteString("é");
    expect([...acute].map((ch) => ch.charCodeAt(0))).toEqual([0xc3, 0xa9]);
    // A surrogate pair becomes the standard 4 UTF-8 bytes.
    const horse = toEngineByteString("🐴");
    expect([...horse].map((ch) => ch.charCodeAt(0))).toEqual([0xf0, 0x9f, 0x90, 0xb4]);
  });

  it("passes ASCII through byte-identical", () => {
    const ascii = "https://capytools.vercel.app/capyqr";
    expect(toEngineByteString(ascii)).toBe(ascii);
  });

  it("makes the oracle count UTF-8 bytes, not characters", () => {
    // 500 two-byte é characters occupy the same 1,000 bytes as 1,000 ASCII
    // ones — and strictly more than 500 ASCII characters would.
    const asUtf8 = moduleCountFor("é".repeat(500), "Q");
    const ascii1000 = moduleCountFor("x".repeat(1000), "Q");
    const ascii500 = moduleCountFor("x".repeat(500), "Q");
    expect(asUtf8).not.toBeNull();
    expect(ascii1000).not.toBeNull();
    expect(ascii500).not.toBeNull();
    expect(asUtf8).toBe(ascii1000);
    expect(asUtf8).toBeGreaterThan(ascii500 as number);
  });

  it("refuses oversized multibyte payloads calmly — null, never a throw", () => {
    // 2,000 emoji are 8,000 UTF-8 bytes; version 40-Q tops out far below.
    expect(moduleCountFor("🐴".repeat(2000), "Q")).toBeNull();
  });
});

describe("CapyQR frame layout", () => {
  const SIZE = 1024;
  const base = {
    size: SIZE,
    moduleCount: 29,
    on: true,
    shape: "band" as const,
    color: "#f9f9f7",
    label: "SCAN ME",
    position: "bottom" as const,
  };

  /** The one invariant that matters: no band touches the QR canvas. */
  const bandsClearOfQr = (layout: FrameLayout) => {
    const qr = { x: layout.qrX, y: layout.qrY, s: layout.qrSize };
    for (const band of layout.bands) {
      const overlap =
        band.x < qr.x + qr.s && band.x + band.w > qr.x && band.y < qr.y + qr.s && band.y + band.h > qr.y;
      expect(overlap, `band at ${band.x},${band.y} overlaps the QR canvas`).toBe(false);
    }
    if (layout.ring) {
      expect(layout.ring.inner.x).toBeLessThanOrEqual(layout.qrX);
      expect(layout.ring.inner.y).toBeLessThanOrEqual(layout.qrY);
      expect(layout.ring.inner.x + layout.ring.inner.w).toBeGreaterThanOrEqual(layout.qrX + layout.qrSize);
      expect(layout.ring.inner.y + layout.ring.inner.h).toBeGreaterThanOrEqual(layout.qrY + layout.qrSize);
    }
  };

  it("is the identity when the frame is off", () => {
    const layout = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, on: false } });
    expect(layout).toEqual({
      qrSize: SIZE,
      qrX: 0,
      qrY: 0,
      bands: [],
      ring: null,
      caption: null,
    });
  });

  it("degenerates calmly on impossible sizes", () => {
    expect(frameLayout({ size: 0, moduleCount: 29, frame: { ...base } }).qrSize).toBe(0);
    expect(frameLayout({ size: SIZE, moduleCount: 0, frame: { ...base } }).bands).toEqual([]);
  });

  it("band: four bands clear of the code, caption inside its band", () => {
    const layout = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, shape: "band" } });
    expect(layout.bands).toHaveLength(4);
    bandsClearOfQr(layout);
    expect(layout.qrSize).toBeLessThan(SIZE);
    expect(layout.caption).not.toBeNull();
    expect(layout.caption?.fontSize).toBeGreaterThan(0);
  });

  it("banner: one band on the caption side only", () => {
    const top = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, shape: "banner", position: "top" } });
    expect(top.bands).toHaveLength(1);
    expect(top.bands[0].y).toBe(0);
    expect(top.qrY).toBeGreaterThanOrEqual(top.bands[0].h);
    bandsClearOfQr(top);

    const bottom = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, shape: "banner" } });
    expect(bottom.bands[0].y).toBe(SIZE - bottom.bands[0].h);
    expect(bottom.qrY + bottom.qrSize).toBeLessThanOrEqual(bottom.bands[0].y);
  });

  it("card: an even-odd ring that hugs the code", () => {
    const layout = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, shape: "card" } });
    expect(layout.bands).toEqual([]);
    expect(layout.ring).not.toBeNull();
    bandsClearOfQr(layout);
    expect(layout.ring?.outer.radius).toBeGreaterThan(0);
  });

  it("tab: a centered ribbon, wider than its caption", () => {
    const layout = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, shape: "tab" } });
    expect(layout.bands).toHaveLength(1);
    bandsClearOfQr(layout);
    expect(layout.bands[0].w).toBeLessThan(SIZE);
    expect(layout.bands[0].w).toBeGreaterThan((layout.caption?.maxWidth ?? 0) as number);
  });

  it("an empty caption drops the caption but keeps the shape", () => {
    const layout = frameLayout({ size: SIZE, moduleCount: 29, frame: { ...base, shape: "band", label: "   " } });
    expect(layout.caption).toBeNull();
    expect(layout.bands).toHaveLength(4);
    bandsClearOfQr(layout);
  });
});

describe("CapyQR proof scan", () => {
  /**
   * A real QR rendered to raw pixels, then decoded by the real jsQR — the
   * tool's headline claim, checked without a browser.
   *
   * This is also the regression guard for jsqr@1.4.0's broken "onlyInvert"
   * (it scans a buffer the binarizer never filled and throws), which is why
   * verify.ts inverts the pixels itself.
   */
  const SCALE = 8;
  const QUIET = 4;

  const render = (value: string, inverted: boolean) => {
    const qr = qrcode(0, "Q");
    // The engine eats the UTF-8 byte-string (utf8.ts) — the test renders the
    // exact bytes a phone will decode, not the raw text.
    qr.addData(toEngineByteString(value), "Byte");
    qr.make();
    const modules = qr.getModuleCount();
    const side = (modules + QUIET * 2) * SCALE;
    const pixels = new Uint8ClampedArray(side * side * 4);
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const mx = Math.floor(x / SCALE) - QUIET;
        const my = Math.floor(y / SCALE) - QUIET;
        const dark =
          mx >= 0 && my >= 0 && mx < modules && my < modules && qr.isDark(my, mx);
        const value = (inverted ? !dark : dark) ? 0 : 255;
        const at = (y * side + x) * 4;
        pixels[at] = value;
        pixels[at + 1] = value;
        pixels[at + 2] = value;
        pixels[at + 3] = 255;
      }
    }
    return { pixels, side };
  };

  const URL_PAYLOAD = "https://capytools.vercel.app";

  it("reads an upright code and does not call it inverted", () => {
    const { pixels, side } = render(URL_PAYLOAD, false);
    const result = verifyPixels(pixels, side, side);
    expect(result).toEqual({ ok: true, data: URL_PAYLOAD, inverted: false });
  });

  it("reads a light-on-dark code and flags it as inverted", () => {
    const { pixels, side } = render(URL_PAYLOAD, true);
    const result = verifyPixels(pixels, side, side);
    expect(result).toEqual({ ok: true, data: URL_PAYLOAD, inverted: true });
  });

  it("round-trips multibyte text: encode → render → decode returns the original", () => {
    // The whole point of utf8.ts: what goes in comes back out, accents and
    // emoji intact, because the code carries the UTF-8 bytes phones expect.
    const multibyte = "café 🐴 wifi";
    const { pixels, side } = render(multibyte, false);
    expect(verifyPixels(pixels, side, side)).toEqual({
      ok: true,
      data: multibyte,
      inverted: false,
    });
  });

  it("says no, calmly, when there is no code in the pixels", () => {
    const side = 120;
    const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
    expect(verifyPixels(pixels, side, side)).toEqual({ ok: false });
    expect(verifyPixels(new Uint8ClampedArray(0), 0, 0)).toEqual({ ok: false });
  });

  it("the gold preset is the light-on-dark one — the guard has something to catch", () => {
    const gold = CAPY_PRESETS.find((preset) => preset.id === "gold");
    const fg = gold?.style.fg;
    const modules = fg?.mode === "solid" ? fg.color : "";
    expect(contrastRatio(modules, "#ffffff")).toBeLessThan(
      contrastRatio(gold?.style.bg ?? "", "#ffffff"),
    );
  });
});

describe("CapyQR registration", () => {
  it("sits seventh in the SUITE with its plate", () => {
    expect(SUITE).toHaveLength(10);
    const row = SUITE[6];
    expect(row.name).toBe("CapyQR");
    expect(row.href).toBe("/capyqr");
    expect(row.cat).toBe("browser");
    expect(row.plate).toEqual({ src: "/plates/lab-7.webp", width: 896, height: 1200 });
  });

  it("has a page exporting the metadata the suite expects", () => {
    expect(existsSync(join(process.cwd(), "src", "app", "capyqr", "page.tsx"))).toBe(true);
    expect(metadata.title).toContain("CapyQR");
    expect(metadata.description).toContain("100% in your browser");
  });
});
