import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import CapyCreatorPage from "@/app/capycreator/page";
import CapyExpensePage from "@/app/capyexpense/page";
import CapyImaginePage from "@/app/capyimagine/page";
import CapyOGPage from "@/app/capyog/page";
import CapyPixelPage from "@/app/capypixel/page";
import CapyQRPage from "@/app/capyqr/page";
import CapyResizePage from "@/app/capyresize/page";
import CapyStripPage from "@/app/capystrip/page";
import CapyTonePage from "@/app/capytone/page";
import CapyTokenPage from "@/app/capytoken/page";
import CapyWrappedPage from "@/app/capywrapped/page";
import { Header } from "@/components/header";
import { CapyExpenseShowcase } from "@/components/tool/CapyExpenseShowcase";
import { EXPENSE_RESEARCH } from "@/lib/capytools/capyexpense-page";

const markup = (ui: ReactElement) => renderToStaticMarkup(ui);

describe("tool pages — editorial shell", () => {
  const pages = [
    [CapyWrappedPage, "CapyWrapped · tool no. 1", "in a calm little card", "Nº 01 / 11"],
    [CapyImaginePage, "CapyImagine · tool no. 2", "rendering", "Nº 02 / 11"],
    [CapyCreatorPage, "CapyCreator · tool no. 3", "for your model", "Nº 03 / 11"],
    [CapyStripPage, "CapyStrip · tool no. 4", "This one helps them forget", "Nº 04 / 11"],
    [CapyExpensePage, "CapyExpense · tool no. 5", "It just never talks back", "Nº 05 / 11"],
    [CapyOGPage, "CapyOG · tool no. 6", "sharing", "Nº 06 / 11"],
    [CapyQRPage, "CapyQR · tool no. 7", "scanning", "Nº 07 / 11"],
    [CapyResizePage, "CapyResize · tool no. 8", "needs to be", "Nº 08 / 11"],
    [CapyTokenPage, "CapyToken · tool no. 9", "Count before you", "Nº 09 / 11"],
    [CapyPixelPage, "CapyPixel · tool no. 10", "in chunks", "Nº 10 / 11"],
    [CapyTonePage, "CapyTone · tool no. 11", "get a poster", "Nº 11 / 11"],
  ] as const;

  for (const [Page, eyebrow, headline, index] of pages) {
    it(`${eyebrow} — shell furniture, one h1, clay dot, back link`, () => {
      const html = markup(<Page />);

      // AGENTS.md eyebrow contract, carried by .lp-label.
      expect(html).toContain(eyebrow);
      expect(html).toContain('class="lp-label"');
      expect(html.match(/<h1/g)).toHaveLength(1);
      // TextReveal splits words into spans; the intact line lives in aria-label.
      expect(html).toContain(`aria-label="${headline}"`);
      // The landing's clay terminal period.
      expect(html).toContain('class="lp-dot"');
      // Editorial sign-off row: internal back link + index meta.
      // …to the index, where the next tool is — not the landing.
      expect(html).toMatch(/<a[^>]*href="\/tools"[^>]*>← back to the suite/);
      expect(html).toContain(index);
      // The chrome puts a nav in front of the content, so every tool page owes
      // the reader the same bypass the landing has always shipped.
      expect(html).toContain('class="lp-skip-link"');
      expect(html).toContain('id="main"');
    });

    it(`${eyebrow} — external hrefs stay functional-only`, () => {
      const html = markup(<Page />);
      if (Page === CapyExpensePage) {
        // The research section cites its sources, and a claim you cannot check
        // is not evidence. The budget still holds: every external href on the
        // page must be one of those citations, so chrome cannot sneak back in.
        const cited = new Set(
          EXPENSE_RESEARCH.flatMap((item) => item.sources.map((source) => source.href)),
        );
        const externals = html.match(/href="(http[^"]*)"/g) ?? [];
        expect(externals.length).toBe(cited.size);
        for (const raw of externals) {
          expect(cited).toContain(raw.slice(6, -1).replace(/&amp;/g, "&"));
        }
      } else if (Page === CapyStripPage) {
        // The at-rest demo report ships exactly one external link — the
        // OpenStreetMap lookup for its sample coordinates. Functional, not chrome.
        const externals = html.match(/href="http[^"]*/g) ?? [];
        expect(externals).toHaveLength(1);
        expect(externals[0]).toContain("openstreetmap.org");
      } else {
        // Shared chrome is nativised (D18); these surfaces carry no external links.
        expect(html).not.toContain('href="http');
      }
    });
  }

  it("CapyExpense reads as coming soon, and drops the bands", () => {
    const html = markup(<CapyExpensePage />);
    expect(html).toContain("stored on your machine, never ours");
    // No release exists yet, so the page must not offer or imply a download.
    expect(html).toContain("Not out yet");
    expect(html).toContain("nothing to");
    // The four sections the page owes a visitor who cannot download it yet.
    expect(html).toContain("What it is");
    expect(html).toContain("Why typing it out");
    expect(html).toContain("Questions");
    expect(html).toContain("Coming soon");
    expect(html).not.toMatch(/href="[^"]*\.(msi|exe|dmg|AppImage|deb)"/);
    expect(html).not.toContain("Why bother tracking");
    // The expense display is the oversized stacked variant.
    expect(html).toContain("lp-tool-display-lg");
    expect(html).toContain("lp-lead-lg");
    // Screen two is reachable: the switcher's controls exist at rest.
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="capyexpense-demo"');
  });

  it("CapyCreator's fields are labelled, not just visually captioned", () => {
    const html = markup(<CapyCreatorPage />);
    // The primary ask field used to be a <label> with no htmlFor against a
    // <textarea> with no id, so clicking the label did nothing, the field had
    // no accessible name, and keyboard focus showed only a 1px border colour
    // change. It is the shared Textarea now, which carries the house ring.
    expect(html).toContain('id="creator-ask"');
    expect(html).toContain('for="creator-ask"');
    expect(html).toContain('data-slot="textarea"');
  });

  it("corner marks frame the tool's own surface on every tool page", () => {
    // The landing frames every plate with crop marks; the tool-page analogue is
    // the tool's first stage. Three of five carried them and two did not, which
    // made the framing language look arbitrary.
    for (const Page of [
      CapyWrappedPage,
      CapyImaginePage,
      CapyCreatorPage,
      CapyStripPage,
      CapyExpensePage,
      CapyOGPage,
      CapyQRPage,
      CapyResizePage,
      CapyTokenPage,
      CapyPixelPage,
      CapyTonePage,
    ]) {
      expect(markup(<Page />)).toContain("lp-corner-tl");
    }
  });
});

describe("copy register", () => {
  // Client decision, 2026-09-12: the lowercase register is the house voice for
  // UI copy — but titles take sentence case. Four tools were already
  // consistent and two were wrong in opposite directions: CapyStrip's headline
  // was lowercase, CapyExpense's lead was not. The rule itself is written down
  // in DESIGN.md under "Register".
  const pages = [
    ["CapyWrapped", CapyWrappedPage],
    ["CapyImagine", CapyImaginePage],
    ["CapyCreator", CapyCreatorPage],
    ["CapyStrip", CapyStripPage],
    ["CapyExpense", CapyExpensePage],
    ["CapyOG", CapyOGPage],
    ["CapyQR", CapyQRPage],
    ["CapyResize", CapyResizePage],
    ["CapyToken", CapyTokenPage],
    ["CapyPixel", CapyPixelPage],
    ["CapyTone", CapyTonePage],
  ] as const;

  for (const [name, Page] of pages) {
    it(`${name}: sentence-case headline, lowercase lead`, () => {
      const html = markup(<Page />);

      const h1 = html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? "";
      const firstSegment = h1.match(/aria-label="([^"]+)"/)?.[1] ?? "";
      expect(firstSegment, `${name} headline should start uppercase`).toMatch(/^[A-Z]/);

      const lead = html.match(/class="lp-lead[^"]*">([^<]+)</)?.[1] ?? "";
      expect(lead, `${name} lead should start lowercase`).toMatch(/^[a-z]/);
    });
  }
});

describe("shared chrome", () => {
  it("the one header carries the suite, the CTA and no external href", () => {
    const html = markup(<Header tool="CapyWrapped" />);
    expect(html).toContain('href="/notes"');
    // The persistent action is the same on every page, tool pages included.
    expect(html).toContain('href="/tools"');
    expect(html).not.toContain("lp-nav-cta");
    // One brand mark for the whole site (the interim capybara seal).
    expect(html).toContain("lp-brand-glyph");
    // An app surface has to say which room you are standing in: the brand
    // line names the tool, now that the masthead no longer lists every tool.
    expect(html).toContain("· CapyWrapped");
    // The nav collapses rather than disappearing.
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="site-nav-menu"');
    expect(html).not.toContain('href="http');
  });

  it("a tool page and the landing render the same masthead shell", () => {
    // Both go through <Header>, so both must carry its container, mark and
    // action — this is the invariant that stops the two drifting apart again.
    const html = markup(<CapyWrappedPage />);
    expect(html).toContain("lp-nav-inner");
    expect(html).toContain("lp-brand-glyph");
    expect(html).toContain('href="/tools"');
    expect(html).not.toContain("lp-nav-cta");
    // The tool page names the current tool in the brand line.
    expect(html).toContain("· CapyWrapped");
  });

  it("expense showcase keeps its a11y switcher contract", () => {
    const html = markup(<CapyExpenseShowcase />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="capyexpense-demo"');
    expect(html).toContain("lp-corner-tl");
  });
});

describe("the shared footer's claim holds on every page it renders on", () => {
  it("never promises 'nothing stored' — CapyExpense keeps your files on disk", () => {
    const footer = renderToStaticMarkup(<CapyExpensePage />);
    expect(footer).not.toMatch(/capytools — [^<]*nothing stored/i);
    expect(footer).toContain("no signup. no cookies. open source.");
    expect(footer).not.toContain("coming soon</p>");
  });
});

/**
 * The adapt pass. Tap targets reach 44px on coarse pointers only, so desktop
 * keeps its density; and below lg, CapyQR's output follows the thumb.
 */
describe("touch targets and the thumb-reach output bar", () => {
  const css = readFileSync(join(process.cwd(), "src/components/landing/landing.css"), "utf8");

  it("the menu button is 44×44 — it is the only way between pages on a phone", () => {
    const rule = css.match(/\.lp-nav-toggle \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("width: 44px");
    expect(rule).toContain("height: 44px");
  });

  it("CapyQR's pills, swatches and actions grow on coarse pointers", () => {
    const html = markup(<CapyQRPage />);
    expect(html).toContain("pointer-coarse:min-h-11");
    expect(html).toContain("pointer-coarse:size-11");
    expect(html).toContain("pointer-coarse:h-11");
  });

  it("portals the output bar to <body>, and starts it inert and off-screen", () => {
    // A transformed ancestor (the shell's Reveal) re-anchors position: fixed,
    // so the bar must escape the stage entirely — and it only exists once the
    // client mounts, which is why the server markup carries no trace of it.
    const html = markup(<CapyQRPage />);
    expect(html).toContain('id="capyqr-code"');
    expect(html).not.toContain("fixed inset-x-0 bottom-0");
    const src = readFileSync(join(process.cwd(), "src/components/tool/CapyQR.tsx"), "utf8");
    expect(src).toMatch(/createPortal\([\s\S]*?inert=\{codeInView\}[\s\S]*?document\.body/);
    expect(src).toContain('codeInView ? "translate-y-full" : "translate-y-0"');
  });
});

describe("CapyQR keeps its output beside the controls on desktop", () => {
  it("lays out two columns from lg, the code card sticky on the right", () => {
    const html = markup(<CapyQRPage />);
    expect(html).toContain("lg:grid-cols-[minmax(0,1fr)_368px]");
    expect(html).toMatch(/id="capyqr-code"[^>]*lg:sticky/);
  });

  it("keeps DOM order payload → style → code, so focus order matches reading order", () => {
    const html = markup(<CapyQRPage />);
    const at = (title: string) => html.indexOf(title);
    expect(at("The payload")).toBeLessThan(at("The style"));
    expect(at("The style")).toBeLessThan(at("The code"));
  });
});
