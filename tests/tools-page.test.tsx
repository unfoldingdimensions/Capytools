import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ToolsPage, { metadata } from "@/app/tools/page";
import { Header } from "@/components/header";
import { ToolsGrid } from "@/components/tools/ToolsGrid";
import sitemap from "@/app/sitemap";
import { SUITE } from "@/lib/capytools/suite";
import { SITE_URL } from "@/lib/utils";

/**
 * The index page. Its whole reason to exist is that it cannot fall behind
 * the registry, so every assertion here is driven off SUITE rather than a
 * list — a twelfth tool is covered by the row that ships it.
 */

const html = () => renderToStaticMarkup(<ToolsPage />);

describe("/tools lists the whole suite", () => {
  it("names every tool and links to it", () => {
    const markup = html();
    for (const tool of SUITE) {
      expect(markup, tool.name).toContain(tool.name);
      expect(markup, tool.href).toContain(`href="${tool.href}"`);
    }
  });

  it("carries the one-liner for each, not the catalog blurb", () => {
    // React escapes apostrophes and ampersands on the way out, so compare
    // against decoded text rather than asserting on the entity spelling.
    const markup = renderToStaticMarkup(<ToolsGrid />)
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&");
    for (const tool of SUITE) {
      // `line` is what the tool does; `blurb` is the marketing sentence.
      expect(markup, tool.name).toContain(tool.line);
    }
  });

  it("is a grid, not a table", () => {
    const markup = html();
    expect(markup).toContain("grid-cols-1");
    expect(markup).not.toContain("<table");
  });

  it("offers a labelled search field", () => {
    const markup = html();
    expect(markup).toContain('type="search"');
    expect(markup).toContain('for="tool-search"');
  });

  it("marks the desktop exception as such, and nothing else", () => {
    const markup = renderToStaticMarkup(<ToolsGrid />);
    const desktop = SUITE.filter((t) => t.cat === "desktop").length;
    expect(markup.match(/>Desktop</g) ?? []).toHaveLength(desktop);
    expect(markup.match(/>Browser</g) ?? []).toHaveLength(SUITE.length - desktop);
  });
});

/**
 * The search is only as good as what it can match on. The prose fields are
 * written to read well, which is not the same as being searchable — the
 * first build returned NOTHING for "exif", the one word anyone hunting
 * CapyStrip would type, because no prose field contains it.
 */
describe("the terms people actually type reach the right tool", () => {
  const find = (query: string) => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return SUITE.filter((tool) => {
      const hay =
        `${tool.name} ${tool.line} ${tool.blurb} ${tool.badge} ${tool.cat} ${tool.keywords.join(" ")}`.toLowerCase();
      return terms.every((term) => hay.includes(term));
    }).map((t) => t.name);
  };

  it.each([
    ["exif", "CapyStrip"],
    ["metadata", "CapyStrip"],
    ["favicon", "CapyResize"],
    ["tokenizer", "CapyToken"],
    ["wifi", "CapyQR"],
    ["open graph", "CapyOG"],
    ["dither", "CapyPixel"],
    ["palette", "CapyTone"],
    ["budget", "CapyExpense"],
    ["github", "CapyWrapped"],
    ["image", "CapyResize"],
    ["image", "CapyPixel"],
    ["image", "CapyStrip"],
  ])("%s finds %s", (query, expected) => {
    expect(find(query)).toContain(expected);
  });

  it("narrows on every term rather than widening", () => {
    expect(find("qr wifi")).toEqual(["CapyQR"]);
  });

  it("no single-letter keyword — it could only ever match a bare letter", () => {
    for (const tool of SUITE) {
      for (const word of tool.keywords) expect(word.length, `${tool.name}: "${word}"`).toBeGreaterThan(1);
    }
  });

  it("every tool carries at least three search terms", () => {
    for (const tool of SUITE) {
      expect(tool.keywords.length, tool.name).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("/tools is reachable from the chrome", () => {
  it("is linked from every tool page's header, twice — the row and the panel", () => {
    const markup = renderToStaticMarkup(<Header tool="CapyQR" />);
    // Inline row and the disclosure it folds into both carry it, and both
    // are in the markup whichever one the width ends up showing.
    expect(markup.match(/href="\/tools"/g) ?? []).toHaveLength(2);
    expect(markup).toContain(">All Tools<");
  });

  it("is the switcher: the masthead carries All Tools and Notes, nothing else", () => {
    // It carried all eleven tools by name, needed ~1,370px, and folded into
    // the menu at every common laptop width.
    const markup = renderToStaticMarkup(<Header tool="CapyQR" />);
    const row = markup.match(/<nav class="lp-nav-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    const labels = [...row.matchAll(/>([^<>]+)<\/a>/g)].map((m) => m[1]);
    expect(labels).toEqual(["All Tools", "Notes"]);
  });

  it("marks itself as the current page on /tools", () => {
    const markup = renderToStaticMarkup(<ToolsPage />);
    expect(markup).toContain('<a class="is-active" aria-current="page" href="/tools">');
  });

  it("carries no persistent CTA — All Tools already reaches the suite", () => {
    const markup = renderToStaticMarkup(<Header />);
    expect(markup).not.toContain("lp-nav-cta");
    expect(markup).not.toContain("Explore our tools");
  });
});

describe("/tools is findable", () => {
  it("is in the sitemap", () => {
    expect(sitemap().map((e) => e.url)).toContain(`${SITE_URL}/tools`);
  });

  it("declares its own canonical and share card", () => {
    expect(metadata.alternates?.canonical).toBe("/tools");
    expect((metadata.openGraph as { url?: string })?.url).toBe(`${SITE_URL}/tools`);
    expect(metadata.openGraph?.title).toBe(metadata.title);
  });
});

describe("the /tools empty state points the right way", () => {
  it("offers to clear the search, and never says the tools are above it", () => {
    const src = readFileSync(join(process.cwd(), "src/components/tools/ToolsGrid.tsx"), "utf8");
    expect(src).not.toContain("listed above");
    expect(src).toContain("clear search");
  });
});
