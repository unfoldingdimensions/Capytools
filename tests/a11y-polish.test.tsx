import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CapyQRPage from "@/app/capyqr/page";
import { Landing } from "@/components/landing/Landing";
import { SUITE } from "@/lib/capytools/suite";
import { BACKGROUND_SWATCHES, CODE_SWATCHES, EYES_SWATCHES, SWATCH_NAMES } from "@/lib/capyqr/presets";

/**
 * The polish pass's accessibility fixes, each one found by the Sep 2026
 * critique and each a regression a screen-reader or keyboard user would feel.
 */
const src = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const levels = (html: string) => [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));

describe("headings form an outline, not a flat page", () => {
  it("a tool page's stages are h2s under its h1", () => {
    const html = renderToStaticMarkup(<CapyQRPage />);
    expect(html).toMatch(/<h2[^>]*>01 · The payload<\/h2>/);
    expect(html).toMatch(/<h2[^>]*>03 · The code<\/h2>/);
  });

  it("the landing never skips a level (it jumped h2 -> h4)", () => {
    const seen = levels(renderToStaticMarkup(<Landing />));
    expect(seen).not.toContain(4);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i] - seen[i - 1], `h${seen[i - 1]} -> h${seen[i]}`).toBeLessThanOrEqual(1);
    }
  });
});

describe("names and descriptions reach assistive tech", () => {
  it("a Labs card is named by its title and described by its blurb", () => {
    const html = renderToStaticMarkup(<Landing />);
    // aria-label="Open X" replaced everything inside the link, blurb included.
    expect(html).not.toMatch(/class="lp-lab"[^>]*aria-label=/);
    for (const tool of SUITE) {
      const id = `lab-${tool.href.slice(1)}`;
      expect(html).toContain(`aria-labelledby="${id}"`);
      expect(html).toContain(`aria-describedby="${id}-blurb"`);
      expect(html).toContain(`id="${id}-blurb"`);
    }
  });

  it("CapyQR announces the scan result when a restyle changes it", () => {
    expect(src("src/components/tool/CapyQR.tsx")).toContain('<div className="mt-4 text-center" aria-live="polite">');
  });
});

describe("focus and small text stay visible", () => {
  it("both focus rules mix the ring toward the ink (plain light sage is 2.9:1)", () => {
    expect(src("src/app/globals.css")).toContain("outline: 2px solid color-mix(in oklab, var(--ring) 70%, var(--foreground))");
    expect(src("src/components/landing/landing.css")).toContain(
      "outline: 2px solid color-mix(in oklab, var(--primary) 70%, var(--foreground))",
    );
  });

  it("the 11px read-more link carries a fifth of ink (water alone was 3.98:1)", () => {
    const rule = src("src/components/landing/landing.css").match(/\.lp-read-more \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("color: color-mix(in oklab, var(--water) 80%, var(--foreground))");
  });
});

describe("the tool number has one source", () => {
  it("no page hand-types its eyebrow number any more", () => {
    for (const tool of SUITE) {
      expect(src(`src/app${tool.href}/page.tsx`), tool.name).not.toMatch(/tool no\. \d/);
    }
  });
});

describe("the second critique's harden pass", () => {
  const landing = renderToStaticMarkup(<Landing />);
  const text = (markup: string) => markup.replace(/<[^>]+>/g, "");

  it("keeps a word space between stacked heading lines", () => {
    const heads = [...landing.matchAll(/<div class="lp-card">[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)].map((m) => m[1]);
    expect(heads.length).toBeGreaterThan(0);
    // A block line that ends flush against the next one reads as one word.
    for (const head of heads) expect(head).not.toMatch(/\S<\/span><span/);
    expect(text(heads[0])).toMatch(/ /);
  });

  it("puts no link inside the moving ticker", () => {
    const wire = landing.match(/<section class="lp-wire"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(wire).not.toBe("");
    expect(wire).not.toContain("<a ");
  });

  it("lets a reveal at the very end of a page fire", () => {
    const reveal = readFileSync(join(process.cwd(), "src/components/landing/ScrollReveal.tsx"), "utf8");
    expect(reveal).not.toMatch(/margin: "0px 0px -/);
  });
});

describe("CapyQR prints its verdict as a sentence", () => {
  it("never uppercases the scan note, which carries the decoded payload", () => {
    const html = renderToStaticMarkup(<CapyQRPage />);
    const note = html.match(/<p class="([^"]*)">scanning the render…<\/p>/);
    expect(note).not.toBeNull();
    expect(note![1]).not.toContain("uppercase");
    expect(note![1]).toContain("text-[13px]");
  });
});

describe("the third critique's harden pass", () => {
  const landing = renderToStaticMarkup(<Landing />);

  it("names each capability link for the tool it opens, uniquely", () => {
    const names = [...landing.matchAll(/class="lp-arrow-mark" aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(names.length).toBe(4);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(SUITE.some((tool) => name === `See it in ${tool.name}`)).toBe(true);
  });

  it("labels the landing's nav as sections, not tools", () => {
    expect(landing).toContain('aria-label="On this page"');
    expect(landing).not.toContain('<nav class="lp-nav-links" aria-label="Tools"');
  });

  it("gives every QR swatch a spoken colour name", () => {
    for (const hex of [...CODE_SWATCHES, ...EYES_SWATCHES, ...BACKGROUND_SWATCHES]) {
      expect(SWATCH_NAMES[hex], hex).toBeTruthy();
    }
  });
});
