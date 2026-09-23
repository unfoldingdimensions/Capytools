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
import { CTA, EXTERNAL, HERO, HERO_JOBS, LABS, LANDING_FOOTER, PLATES, PROOF } from "../src/lib/capytools/landing";
import {
  SUITE,
  SUITE_INDEX,
  SUITE_WORD,
  gridColumns,
  numberWord,
  countByCategory,
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
    // list, the footer's Suite column. A sixth tool
    // made all of them wrong at once. They read the registry now.
    expect(SUITE_INDEX).toBe(String(SUITE.length).padStart(2, "0"));
    expect(HERO.ix).toContain(SUITE_INDEX);
    // The hero names jobs, and counts the rest from the registry.
    expect(HERO.lead).toContain(`${numberWord(SUITE.length - HERO_JOBS.length)} more small jobs`);
    expect(HERO.lead).toContain(`${numberWord(countByCategory("browser"))} of them done right in your browser`);
    expect(HERO.stats[0].value).toBe(SUITE_INDEX);
    expect(LABS.meta[1]).toBe(`${SUITE_INDEX} of ${SUITE_INDEX} shipped`);
    expect(LABS.foot).toBe(`${SUITE_INDEX} / ${SUITE_INDEX} TOOLS`);
    expect(LABS.residence.ring).toBe(SUITE_INDEX);
    expect(LABS.pills[0].count).toBe(SUITE_INDEX);
    expect(LABS.tools).toHaveLength(SUITE.length);
    expect(LABS.tools.map((tool) => tool.href)).toEqual(SUITE.map((tool) => tool.href));
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
    expect(text).toContain("Eleven so far");
    expect(text).not.toContain("Eight so far");
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
    // Same component as the tool pages: same container, same brand mark. The
    // landing only swaps in section anchors.
    expect(html).toContain("lp-nav-inner");
    expect(html).toContain("lp-brand-glyph");
    expect(html).toContain('href="/tools"');
    for (const anchor of ["#proof", "#labs", "#method"]) {
      expect(html).toContain(`href="${anchor}"`);
    }
  });

  it("routes natively — the one external href is the proof band's source link", () => {
    const external = html.match(/href="http[^"]*"/g) ?? [];
    expect(external).toEqual([`href="${PROOF.source.href}"`]);
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
    expect(readme).toContain("Eleven so far");
    expect(readme).toContain("## 5. CapyExpense");
    expect(readme).toContain("## 6. CapyOG");
    expect(readme).toContain("## 7. CapyQR");
    expect(readme).toContain("## 8. CapyResize");
    expect(readme).toContain("## 9. CapyToken");
    expect(readme).toContain("## 10. CapyPixel");
    expect(readme).toContain("## 11. CapyTone");
  });

  // The same sentence lives in three places; the colophon and the README were
  // already pinned to each other, and package.json was the one free copy — it
  // still said "Five so far" three tools later.
  it("keeps package.json's description on the same count", () => {
    const pkg = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const count = /A home for small, quiet tools\. (\w+) so far/.exec(
      readFileSync(join(process.cwd(), "README.md"), "utf8"),
    );
    expect(count?.[1], "README should carry the count sentence").toBeTruthy();
    expect(pkg).toContain(`A home for small, quiet tools. ${count?.[1]} so far`);
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

describe("above-the-fold paint (LCP)", () => {
  // LCP ignores an element rendered at opacity 0. The hero used to ship its
  // headline, lead and plate invisible and fade them in after hydration, which
  // meant the metric could not fire until JS had downloaded, hydrated and run a
  // 0.25s-delayed animation — measured at 2.5s p50, 3.7s p75 in the field.
  //
  // The entrances still animate; they animate transform and blur, which a
  // painted element can do. If someone reintroduces an opacity fade up here,
  // the number silently regresses and nothing else would catch it.
  // The hero is the first <section>; everything after it is below the fold and
  // may still fade on scroll, which costs nothing because LCP has already fired.
  const heroMarkup = () => {
    const rendered = renderToStaticMarkup(<Landing />);
    const end = rendered.indexOf("</section>");
    expect(end).toBeGreaterThan(0);
    return rendered.slice(0, end);
  };

  it("renders nothing above the fold at opacity 0", () => {
    expect(heroMarkup()).not.toContain("opacity:0");
  });

  it("still animates the headline — blur, not fade", () => {
    // The feel is kept: the words unblur. Only the property LCP punishes is gone.
    expect(heroMarkup()).toContain("filter:blur(6px)");
  });
});

/**
 * The distill pass (Sep 2026 design critique). Each assertion is one cut the
 * critique asked for; a regression here means the clutter grew back.
 */
describe("the landing has one primary action and lists the suite less", () => {
  it("offers exactly one 'Explore our tools' — the hero's, not a header twin", () => {
    // It used to appear twice, in two high-emphasis styles, both to #labs.
    expect(html.match(/Explore our tools/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("lp-nav-cta");
  });

  it("demotes CapyExpense from a hero button to a quiet link", () => {
    expect(html).toContain('class="lp-hero-aside"');
    expect(html).not.toContain("lp-btn-ghost\" href=\"/capyexpense");
  });

  it("sends every whole-suite promise to the index", () => {
    expect(CTA.primary.href).toBe("/tools");
    expect(html).toContain(`>${LABS.cta}<`);
    // Labs' button promised the suite and opened one tool.
    expect(html).not.toMatch(/href="\/capywrapped"[^>]*lp-btn-primary/);
  });

  it("cuts the sections that restated the promises and repeated the catalog", () => {
    expect(html).not.toContain('id="about"');
    expect(html).not.toContain('id="work"');
    expect(html).not.toContain('href="#work"');
  });

  it("drops the Colophon glyph grid and the fake progress dots", () => {
    expect(html).not.toContain("lp-partners");
    expect(html).not.toContain("lp-progress");
  });
});

/**
 * The clarify pass. The copy says one thing once, in the visitor's words,
 * and only what is true on the page it is printed on.
 */
describe("the landing speaks in jobs, one noun per idea", () => {
  it("leads with jobs a first-timer recognises, each one a real tool", () => {
    for (const row of HERO_JOBS) {
      expect(HERO.lead).toContain(row.job);
      expect(SUITE.some((tool) => tool.href === row.href)).toBe(true);
    }
    // Eleven invented product names in a row told a newcomer nothing.
    const namesInLead = SUITE.filter((tool) => HERO.lead.includes(tool.name));
    expect(namesInLead).toHaveLength(0);
  });

  it("does not claim the desktop tool runs in the browser", () => {
    expect(HERO.lead).not.toMatch(/all of them|every one of them|entirely in your browser and keep/i);
  });

  it("gives every whole-suite promise one label and one destination", () => {
    const label = `See all ${SUITE_WORD} tools`;
    expect(LABS.cta).toBe(label);
    expect(CTA.primary).toEqual({ label, href: "/tools" });
  });

  it("names landing sections for what they are", () => {
    // The nav row only — the footer's "Suite" column title is a fine label.
    const nav = html.match(/<nav class="lp-nav-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    expect(nav).not.toBe("");
    for (const vague of [">Suite<", ">Method<", ">Work<"]) expect(nav).not.toContain(vague);
    expect(nav).toContain('href="#proof"');
  });

  it("keeps plain words in the footer's in-page column", () => {
    const column = LANDING_FOOTER.columns.find((col) => col.links.some((link) => link.href === "#readme"));
    expect(column?.title).toBe("On this page");
    expect(column?.links.map((link) => link.label)).not.toContain("First line");
  });
});
