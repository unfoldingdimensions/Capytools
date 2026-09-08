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
import { LABS, PLATES } from "../src/lib/capytools/landing";

const html = renderToStaticMarkup(<Landing />);
const text = html.replace(/<[^>]+>/g, " ");

describe("Landing", () => {
  it("links all five tools by their internal routes", () => {
    for (const tool of LABS.tools) {
      expect(html).toContain(`href="${tool.href}"`);
    }
    // CapyExpense is one of the five — the suite count is not aspirational.
    expect(text).toContain("CapyWrapped");
    expect(text).toContain("CapyImagine");
    expect(text).toContain("CapyCreator");
    expect(text).toContain("CapyStrip");
    expect(text).toContain("CapyExpense");
  });

  it("has exactly one h1", () => {
    expect(html.match(/<h1/g)?.length).toBe(1);
  });

  it('quotes the README as "Five so far" — verbatim means current', () => {
    expect(text).toContain("Five so far");
    expect(text).not.toContain("Four so far");
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
    expect(readme).toContain("Five so far");
    expect(readme).toContain("## 5. CapyExpense");
  });
});
