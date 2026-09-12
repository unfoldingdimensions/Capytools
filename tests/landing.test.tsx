import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// next/image pulls in the Next runtime config that a bare SSR render doesn't
// have; a plain img stand-in keeps these tests about content, not loaders.
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: { src: string; "aria-hidden"?: boolean }) =>
      createElement("img", {
        src: props.src,
        alt: "",
        "aria-hidden": props["aria-hidden"],
      }),
  };
});

import { Landing } from "../src/components/landing/Landing";
import DesignNotesPage from "../src/app/design/page";
import LicensePage from "../src/app/license/page";
import NotesPage from "../src/app/notes/page";
import { EXTERNAL, LABS, PLATES, COLOPHON, HERO, LANDING_FOOTER } from "../src/lib/capytools/landing";
import {
  SUITE,
  SUITE_INDEX,
  SUITE_LIST,
  SUITE_WORD,
  gridColumns,
} from "../src/lib/capytools/suite";

const html = renderToStaticMarkup(<Landing />);
const text = html.replace(/<[^>]+>/g, " ");

describe("Landing", () => {
  it("links all six tools by their internal routes", () => {
    for (const tool of LABS.tools) {
      expect(html).toContain(`href="${tool.href}"`);
    }
    // CapyExpense is one of the six — the suite count is not aspirational.
    expect(text).toContain("CapyWrapped");
    expect(text).toContain("CapyImagine");
    expect(text).toContain("CapyCreator");
    expect(text).toContain("CapyStrip");
    expect(text).toContain("CapyExpense");
    expect(text).toContain("CapyOG");
  });

  it("has exactly one h1", () => {
    expect(html.match(/<h1/g)?.length).toBe(1);
  });

  it("derives every count and list from the one registry", () => {
    // These were literals in ~15 places before: "05", "05 of 05 shipped",
    // "05 / 05 TOOLS", "Five small tools", "Suite of five", the hero's tool
    // list, the footer's Suite column, the Colophon's partner row. A sixth tool
    // made all of them wrong at once. They read the registry now.
    expect(SUITE_INDEX).toBe(String(SUITE.length).padStart(2, "0"));
    expect(HERO.ix).toContain(SUITE_INDEX);
    expect(HERO.lead).toContain(SUITE_LIST);
    expect(HERO.stats[0].value).toBe(SUITE_INDEX);
    expect(LABS.meta[1]).toBe(`${SUITE_INDEX} of ${SUITE_INDEX} shipped`);
    expect(LABS.foot).toBe(`${SUITE_INDEX} / ${SUITE_INDEX} TOOLS`);
    expect(LABS.residence.ring).toBe(SUITE_INDEX);
    expect(LABS.pills[0].count).toBe(SUITE_INDEX);
    expect(LABS.tools).toHaveLength(SUITE.length);
    expect(LABS.tools.map((tool) => tool.href)).toEqual(SUITE.map((tool) => tool.href));
    expect(COLOPHON.partners.map((partner) => partner.href)).toEqual(SUITE.map((tool) => tool.href));
    expect(LANDING_FOOTER.columns[0].links.map((link) => link.href)).toEqual(
      SUITE.map((tool) => tool.href),
    );
    expect(LANDING_FOOTER.blurb).toContain(`Suite of ${SUITE_WORD}`);
    // The catalog's column count follows the suite's size, so a sixth tool does
    // not tighten every card and strand one alone on the next row.
    expect(gridColumns(3)).toBe(3);
    expect(gridColumns(5)).toBe(5);
    expect(gridColumns(6)).toBe(4);
    expect(gridColumns(9)).toBe(4);
  });

  it("keeps the verbatim README quote out of the derivation", () => {
    expect(text).toContain("Eight so far");
    expect(text).not.toContain("Seven so far");
  });

  it("ships a keyboard-reachable pause for the marquee (WCAG 2.2.2)", () => {
    expect(html).toContain('aria-label="Pause the live ticker"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("renders the filter pills with counts and pressed states", () => {
    expect(html).toContain('aria-pressed="true"'); // All, active by default
    expect(html).toContain('aria-label="Filter tools"');
    expect(text).toContain("Browser");
    expect(text).toContain("Desktop");
  });

  it("carries no OpenDesign chrome or garnish coordinates", () => {
    expect(html).not.toContain("data-od-id");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("FIG. 01");
  });

  it("provides a skip link and a main landmark", () => {
    expect(html).toContain('class="lp-skip-link"');
    expect(html).toContain('id="main"');
  });

  it("uses the one shared masthead, not a landing-only one", () => {
    // Same component as the tool pages: same container, same brand mark, same
    // persistent action. The landing only swaps in section anchors.
    expect(html).toContain("lp-nav-inner");
    expect(html).toContain("lp-brand-glyph");
    expect(html).toContain("Open the tools");
    for (const anchor of ["#labs", "#method", "#work"]) {
      expect(html).toContain(`href="${anchor}"`);
    }
  });

  it("routes everything natively — zero external hrefs on the landing", () => {
    expect(html).not.toContain('href="http');
    // The project-meta targets exist as native editorial pages.
    expect(html).toContain('href="/design"');
    expect(html).toContain('href="/license"');
    expect(html).toContain('href="/notes"');
  });
});

describe("Editorial meta pages", () => {
  it("design notes documents the label voices and the palette", () => {
    const html = renderToStaticMarkup(<DesignNotesPage />);
    expect(html).toContain("Design notes");
    expect(html).toContain("Albert Sans");
    expect(html).toContain("Fraunces");
  });

  it("license page carries the Apache-2.0 grant, rendered from LICENSE", () => {
    const html = renderToStaticMarkup(<LicensePage />);
    expect(html).toContain("Free as in");
    expect(html).toContain("Apache License");
    expect(html).toContain("Version 2.0, January 2004");
    expect(html).toContain("Copyright 2026 unfoldingdimensions");
  });

  it("notes lists the suite and keeps contributions one step off the landing", () => {
    const html = renderToStaticMarkup(<NotesPage />);
    expect(html).toContain('id="issues"');
    for (const tool of LABS.tools) expect(html).toContain(`href="${tool.href}"`);
    // The issue tracker is the one external hop, and it lives here — not on
    // the landing.
    expect(html).toContain(`href="${EXTERNAL.issues}"`);
  });
});

describe("Landing assets", () => {
  it("references only plates that exist on disk", () => {
    for (const name of PLATES) {
      const file = join(process.cwd(), "public", "plates", `${name}.webp`);
      expect(existsSync(file), `${file} should exist`).toBe(true);
    }
    for (const name of PLATES) {
      expect(html).toContain(`/plates/${name}.webp`);
    }
  });

  it("keeps the README quote in sync with the README itself", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    expect(readme).toContain("Eight so far");
    expect(readme).toContain("## 5. CapyExpense");
    expect(readme).toContain("## 6. CapyOG");
    expect(readme).toContain("## 7. CapyQR");
    expect(readme).toContain("## 8. CapyResize");
  });
});

describe("Crawl surface", () => {
  it("sitemap covers every tool the landing links, and nothing that fans out", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const { LABS } = await import("@/lib/capytools/landing");
    const urls = sitemap().map((entry) => entry.url);

    for (const tool of LABS.tools) {
      expect(urls.some((url) => url.endsWith(tool.href))).toBe(true);
    }
    expect(urls.some((url) => url.includes("/api/") || url.includes("/u/"))).toBe(false);
    // Absolute URLs only — a relative loc is an invalid sitemap entry.
    expect(urls.every((url) => url.startsWith("http"))).toBe(true);
  });

  it("robots keeps crawlers off the GitHub-backed fan-out", async () => {
    const { default: robots } = await import("@/app/robots");
    const { rules, sitemap: sitemapUrl } = robots();
    const disallow = Array.isArray(rules) ? [] : [rules.disallow].flat();

    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/u/");
    expect(sitemapUrl).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});
