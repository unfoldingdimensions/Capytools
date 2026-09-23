import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Landing } from "@/components/landing/Landing";
import CapyQRPage from "@/app/capyqr/page";
import ToolsPage from "@/app/tools/page";

vi.mock("next/font/google", () => {
  const face = () => ({ variable: "--stub", className: "stub", style: {} });
  return { Albert_Sans: face, Fraunces: face, Plus_Jakarta_Sans: face };
});

/**
 * The harden pass. The server markup must be readable before any script runs,
 * because some visitors — and some readers — never run it. Every element the
 * server ships hidden or blurred has to carry `data-reveal`, the hook the
 * no-script rule in globals.css uses to show it.
 */
function hiddenWithoutHook(html: string): string[] {
  const tags = html.match(/<[a-z]+[^>]*style="[^"]*"[^>]*>/g) ?? [];
  return tags.filter((tag) => {
    const style = tag.match(/style="([^"]*)"/)?.[1] ?? "";
    const hidden = /opacity:\s*0(?![.\d])/.test(style) || /blur\(/.test(style);
    return hidden && !tag.includes("data-reveal");
  });
}

describe("nothing on the page needs a script to become readable", () => {
  it("the landing marks every hidden-at-first element", () => {
    const html = renderToStaticMarkup(<Landing />);
    expect(html).toContain("data-reveal");
    expect(hiddenWithoutHook(html)).toEqual([]);
  });

  it("a tool page marks its blurred headline words", () => {
    const html = renderToStaticMarkup(<CapyQRPage />);
    expect(html).toContain("data-reveal");
    expect(hiddenWithoutHook(html)).toEqual([]);
  });

  it("the /tools index marks its blurred headline words", () => {
    expect(hiddenWithoutHook(renderToStaticMarkup(<ToolsPage />))).toEqual([]);
  });

  it("globals.css shows every hooked element when scripting is off", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const rule = css.match(/@media \(scripting: none\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(rule).toContain("[data-reveal]");
    for (const prop of ["opacity: 1 !important", "filter: none !important", "transform: none !important"]) {
      expect(rule).toContain(prop);
    }
  });
});
