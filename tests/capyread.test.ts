import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { metadata } from "@/app/capyread/page";
import {
  UNREADABLE_MARKER,
  WORD_UNREADABLE,
  assembleParagraph,
  confidenceBucket,
  isHyphenBreak,
  pageConfidence,
  paragraphsToText,
} from "@/lib/capyread/clean";
import { DEMO_RUN } from "@/lib/capyread/demo";
import { disposeEngine } from "@/lib/capyread/engine";
import { bucketLabel, confidenceLabel, formatMs } from "@/lib/capyread/format";
import { buildTxtBlob, docxParagraphs, exportName } from "@/lib/capyread/export";
import { LANGUAGES, DEFAULT_LANG, cacheKey, findLang, langPath, langUrl, pinFor } from "@/lib/capyread/langs";
import { FREE_PAGE_LIMIT, imageScale, pagePlan, pdfScale } from "@/lib/capyread/raster";
import { TOOL_GUIDES } from "@/lib/capytools/guides";
import { SUITE } from "@/lib/capytools/suite";

/**
 * CapyRead's units: the pure cleaner that turns tesseract's words into
 * honest text, the language pins the build re-verifies, the pure cap and
 * scale maths, the exports, and the registration parity the recipe demands.
 * (The boundaries live in tests/capyread-boundaries.test.ts.)
 */

const line = (...words: Array<[string, number]>) => ({
  words: words.map(([text, confidence]) => ({ text, confidence })),
});

describe("clean.ts — the honest text", () => {
  it("joins a paragraph's lines with single spaces", () => {
    const assembled = assembleParagraph([
      line(["The", 95], ["quick", 94], ["brown", 96]),
      line(["fox", 93], ["jumps.", 95]),
    ]);
    expect(assembled?.block.text).toBe("The quick brown fox jumps.");
  });

  it("de-hyphenates a word broken across a line break", () => {
    const assembled = assembleParagraph([
      line(["an", 95], ["exam-", 90]),
      line(["ple", 92], ["of", 95], ["print.", 94]),
    ]);
    expect(assembled?.block.text).toBe("an example of print.");
  });

  it("keeps a dash that is punctuation, not a break", () => {
    expect(isHyphenBreak("well-", "Being")).toBe(false);
    expect(isHyphenBreak("-", "and")).toBe(false);
    expect(isHyphenBreak("co-", "operate")).toBe(true);
  });

  it("marks below-threshold words instead of printing them wrong", () => {
    const assembled = assembleParagraph([line(["readable", 90], ["mumbl", WORD_UNREADABLE - 1])]);
    expect(assembled?.block.text).toBe(`readable ${UNREADABLE_MARKER}`);
    expect(assembled?.unreadable).toBe(1);
  });

  it("keeps a word exactly at the threshold", () => {
    const assembled = assembleParagraph([line(["borderline", WORD_UNREADABLE])]);
    expect(assembled?.block.text).toBe("borderline");
    expect(assembled?.unreadable).toBe(0);
  });

  it("drops empty lines and empty paragraphs", () => {
    expect(assembleParagraph([line(), line(["word", 90])])?.block.text).toBe("word");
    expect(assembleParagraph([line()])).toBeNull();
  });

  it("scores a paragraph by the words it actually read", () => {
    // 90 and 92 kept; the marker word's score is not averaged in.
    const assembled = assembleParagraph([line(["good", 90], ["good", 92], ["bad", 10])]);
    expect(assembled?.block.confidence).toBe(91);
  });

  it("buckets confidence into the three words the badge shows", () => {
    expect(confidenceBucket(95)).toBe("high");
    expect(confidenceBucket(85)).toBe("high");
    expect(confidenceBucket(84)).toBe("fair");
    expect(confidenceBucket(65)).toBe("fair");
    expect(confidenceBucket(64)).toBe("unsure");
    expect(confidenceBucket(null)).toBe("none");
  });

  it("joins a page's paragraphs with a blank line and scores the page", () => {
    const text = paragraphsToText([
      { text: "one", confidence: 90 },
      { text: "two", confidence: 80 },
    ]);
    expect(text).toBe("one\n\ntwo");
    expect(pageConfidence([])).toBeNull();
    expect(pageConfidence([{ text: "x", confidence: 0 }])).toBeNull();
    expect(pageConfidence([{ text: "a", confidence: 88 }])).toBe(88);
  });
});

describe("langs.ts — the pins the build re-verifies", () => {
  it("every language row carries a real pin, and English carries both", () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(18);
    for (const lang of LANGUAGES) {
      expect(lang.fast.bytes).toBeGreaterThan(0);
      expect(lang.fast.sha256).toMatch(/^[0-9a-f]{64}$/);
      if (lang.standard) {
        expect(lang.standard.bytes).toBeGreaterThan(lang.fast.bytes);
        expect(lang.standard.sha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
    expect(DEFAULT_LANG.id).toBe("eng");
    expect(DEFAULT_LANG.standard).toBeDefined();
  });

  it("defaults to English fast, and only English offers the standard model", () => {
    expect(findLang("eng")).toBe(DEFAULT_LANG);
    expect(findLang("klingon")).toBe(DEFAULT_LANG);
    expect(pinFor(findLang("eng"), "fast")).toBe(DEFAULT_LANG.fast);
    expect(pinFor(findLang("eng"), "standard")).toBe(DEFAULT_LANG.standard);
    // A language without the standard model falls back to fast rather than undefined.
    expect(pinFor(findLang("deu"), "standard")).toBe(findLang("deu").fast);
  });

  it("serves the models same-origin and downloads them from the pinned drop", () => {
    expect(langPath("fast")).toBe("/ocr/tessdata/fast");
    expect(langPath("standard")).toBe("/ocr/tessdata/standard");
    expect(langUrl("eng", "fast")).toBe("https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz");
    expect(langUrl("eng", "standard")).toBe("https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz");
  });

  it("keeps the two English models apart in tesseract's cache", () => {
    expect(cacheKey("eng", "fast")).toBe("eng-fast");
    expect(cacheKey("eng", "standard")).toBe("eng-standard");
  });
});

describe("format.ts — small honest numbers", () => {
  it("formats durations the way the status lines read them", () => {
    expect(formatMs(340)).toBe("340 ms");
    expect(formatMs(8400)).toBe("8.4 s");
    expect(formatMs(96_000)).toBe("1.6 min");
  });

  it("the badge words match the buckets, and carry the number", () => {
    expect(bucketLabel("high")).toBe("high");
    expect(bucketLabel("unsure")).toBe("unsure");
    expect(bucketLabel("none")).toBe("nothing read");
    expect(confidenceLabel(81)).toBe("81% sure");
    expect(confidenceLabel(null)).toBe("no words");
  });
});

describe("raster.ts — the pure maths of a big document", () => {
  it("caps pages and reports the skip honestly", () => {
    expect(FREE_PAGE_LIMIT).toBeGreaterThan(0);
    expect(pagePlan(3)).toEqual({ render: 3, skipped: 0 });
    expect(pagePlan(FREE_PAGE_LIMIT)).toEqual({ render: FREE_PAGE_LIMIT, skipped: 0 });
    expect(pagePlan(FREE_PAGE_LIMIT + 7)).toEqual({ render: FREE_PAGE_LIMIT, skipped: 7 });
    expect(pagePlan(0)).toEqual({ render: 0, skipped: 0 });
  });

  it("rasterises PDF pages up to the long edge, images only ever down", () => {
    // pdf.js is 72 dpi — an A4 page (595×842) must reach ~2000 px.
    expect(pdfScale(595, 842)).toBeCloseTo(2000 / 842, 5);
    expect(pdfScale(200, 100)).toBe(4); // never absurd canvases
    expect(imageScale(4000, 3000)).toBeCloseTo(3000 / 4000, 5);
    expect(imageScale(1200, 900)).toBe(1); // never upscaled
  });
});

describe("export.ts — the files a run becomes", () => {
  it("names exports after the source, without its extension", () => {
    expect(exportName("scan.pdf", "txt")).toBe("read-scan.txt");
    expect(exportName("receipt final.PNG", "docx")).toBe("read-receipt final.docx");
    expect(exportName("", "txt")).toBe("read-page.txt");
  });

  it("splits paragraphs the way the words card shows them", () => {
    expect(docxParagraphs("one\n\ntwo\n\n\nthree")).toEqual(["one", "two", "three"]);
    expect(docxParagraphs("  spaced  ")).toEqual(["spaced"]);
    expect(docxParagraphs("")).toEqual([]);
  });

  it("the txt blob is the text, encoded as plain text", async () => {
    const blob = buildTxtBlob("hello\n\npage two");
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(await blob.text()).toBe("hello\n\npage two");
  });
});

describe("demo.ts — the idle card teaches with the real pipeline", () => {
  it("is assembled by clean.ts and carries an unsure block and a marker", () => {
    expect(DEMO_RUN.pages).toHaveLength(1);
    const page = DEMO_RUN.pages[0];
    expect(page.blocks.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_RUN.text).toContain(UNREADABLE_MARKER);
    expect(page.confidence).not.toBeNull();
    // The demo's confidence must sit in a bucket the badges can show.
    expect(["high", "fair", "unsure"]).toContain(confidenceBucket(DEMO_RUN.confidence));
  });
});

describe("engine.ts — the worker lifecycle", () => {
  it("disposing with no engine is a no-op, not a throw", async () => {
    await expect(disposeEngine()).resolves.toBeUndefined();
  });
});

describe("registration — the suite knows CapyRead", () => {
  it("SUITE row 14 is CapyRead at /capyread, with its plate", () => {
    const row = SUITE[SUITE.length - 1];
    expect(row.name).toBe("CapyRead");
    expect(row.short).toBe("Read");
    expect(row.href).toBe("/capyread");
    expect(row.cat).toBe("browser");
    expect(row.appCategory).toBe("UtilitiesApplication");
    expect(row.plate).toEqual({ src: "/plates/lab-14.webp", width: 896, height: 1200 });
  });

  it("the page's metadata carries the tool name and the promise", () => {
    const description = metadata.description ?? "";
    expect(metadata.title).toContain("CapyRead");
    expect(description).toContain("100% in your browser");
  });

  it("has a guide, like every browser tool", () => {
    expect(TOOL_GUIDES.CapyRead).toBeDefined();
  });
});

describe("the fetch script and the registry agree", () => {
  it("the script imports its pins from langs.ts, not a second copy", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "fetch-capyread-assets.ts"), "utf8");
    expect(script).toContain('from "../src/lib/capyread/langs"');
    // And it keeps Cloudflare's cap honest even though nothing here is big.
    expect(script).toContain("MAX_ASSET_BYTES");
  });
});
