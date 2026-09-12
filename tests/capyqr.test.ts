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

import { capacityNote, moduleCountFor, versionForModuleCount } from "../src/lib/capyqr/matrix";
import { buildPayload, escapeWifiValue } from "../src/lib/capyqr/payloads";
import { CAPY_PRESETS } from "../src/lib/capyqr/presets";
import type { PayloadFields, PayloadKind } from "../src/lib/capyqr/types";
import { verifyPixels } from "../src/lib/capyqr/verify";
import {
  PAPER_COLOR,
  buildEngineOptions,
  fileExtensionFor,
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

describe("CapyQR render decision helpers — pure, table-tested", () => {
  it("flattens transparent backgrounds onto paper for JPEG only", () => {
    expect(PAPER_COLOR).toBe("#ffffff");
    expect(jpegFillNeeded("transparent")).toBe(true);
    expect(jpegFillNeeded(undefined)).toBe(true);
    expect(jpegFillNeeded("#f9f9f7")).toBe(false);
  });

  it("blocks SVG export exactly when a logo is set", () => {
    expect(svgExportBlocked(true)).toBe(true);
    expect(svgExportBlocked(false)).toBe(false);
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
    qr.addData(value, "Byte");
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
    expect(SUITE).toHaveLength(8);
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
