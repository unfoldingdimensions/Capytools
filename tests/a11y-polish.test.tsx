import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CapyQRPage from "@/app/capyqr/page";
import { Landing } from "@/components/landing/Landing";
import { SUITE } from "@/lib/capytools/suite";

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
