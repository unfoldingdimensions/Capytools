import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ToolGuideSection } from "../src/components/tool/ToolGuideSection";
import { TOOL_GUIDES } from "../src/lib/capytools/guides";
import { faqPageLd } from "../src/lib/capytools/structured-data";
import { SUITE_NAMES } from "../src/lib/capytools/suite";

describe("tool guides", () => {
  // A misspelt key renders no guide and no error — the page just stays thin.
  it("are keyed by real SUITE names", () => {
    for (const name of Object.keys(TOOL_GUIDES)) expect(SUITE_NAMES).toContain(name);
  });

  // The point is text in the HTML a crawler reads, FAQ answers included even
  // while their <details> are closed.
  it("render every step and every answer into the server HTML", () => {
    for (const guide of Object.values(TOOL_GUIDES)) {
      const html = renderToStaticMarkup(<ToolGuideSection guide={guide} width="max-w-4xl" />);
      expect(html).toContain("<h2");
      for (const text of [...guide.steps, ...guide.faq.map((f) => f.a)]) {
        expect(html).toContain(text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;"));
      }
    }
  });
});

describe("FAQPage JSON-LD", () => {
  // Google's FAQ guidelines: marked-up Q&A must be visible on the page. The
  // schema is built from the same guide the page renders, so they cannot drift.
  it("marks up exactly the questions and answers the guide shows", () => {
    for (const guide of Object.values(TOOL_GUIDES)) {
      const ld = faqPageLd(guide);
      expect(ld["@type"]).toBe("FAQPage");
      expect(ld.mainEntity.map((e) => [e.name, e.acceptedAnswer.text])).toEqual(
        guide.faq.map((f) => [f.q, f.a]),
      );
    }
  });
});
