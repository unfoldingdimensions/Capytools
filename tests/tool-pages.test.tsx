import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import CapyCreatorPage from "@/app/capycreator/page";
import CapyExpensePage from "@/app/capyexpense/page";
import CapyImaginePage from "@/app/capyimagine/page";
import CapyStripPage from "@/app/capystrip/page";
import CapyWrappedPage from "@/app/capywrapped/page";
import { Header } from "@/components/header";
import { CapyExpenseShowcase } from "@/components/tool/CapyExpenseShowcase";
import { EXPENSE_RESEARCH } from "@/lib/capytools/capyexpense-page";

const markup = (ui: ReactElement) => renderToStaticMarkup(ui);

describe("tool pages — editorial shell", () => {
  const pages = [
    [CapyWrappedPage, "CapyWrapped · tool no. 1", "in a calm little card", "Nº 01 / 05"],
    [CapyImaginePage, "CapyImagine · tool no. 2", "rendering", "Nº 02 / 05"],
    [CapyCreatorPage, "CapyCreator · tool no. 3", "for your model", "Nº 03 / 05"],
    [CapyStripPage, "CapyStrip · tool no. 4", "This one helps them forget", "Nº 04 / 05"],
    [CapyExpensePage, "CapyExpense · tool no. 5", "It just never talks back", "Nº 05 / 05"],
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
      expect(html).toContain('href="/"');
      expect(html).toContain("back to the suite");
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
    expect(html).toContain("Open the tools");
    // One brand mark for the whole site (the interim capybara seal).
    expect(html).toContain("lp-brand-glyph");
    // An app surface has to say which room you are standing in.
    expect(html).toContain('aria-current="page"');
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
    expect(html).toContain("Open the tools");
    // The tool page marks the current tool; the landing has no current tool.
    expect(html).toContain('aria-current="page"');
  });

  it("expense showcase keeps its a11y switcher contract", () => {
    const html = markup(<CapyExpenseShowcase />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="capyexpense-demo"');
    expect(html).toContain("lp-corner-tl");
  });
});
