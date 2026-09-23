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

/**
 * JavaScript that ran but never hydrated is a different failure from no
 * JavaScript at all, and the (scripting: none) rule cannot see it. It
 * happened: opened over the LAN, the dev server refused its own assets and
 * the landing rendered blank below section II.
 */
describe("a page that never hydrates still shows its content", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("the root layout mounts the hydration mark", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("<HydrationMark />");
  });

  it("unhydrated reveals fade in after a grace period", () => {
    expect(css).toMatch(/html:not\(\[data-hydrated\]\) \[data-reveal\] \{\s*animation: reveal-failsafe [^;]* 3s forwards;/);
    const frames = css.match(/@keyframes reveal-failsafe \{[\s\S]*?\n\}/)?.[0] ?? "";
    for (const prop of ["opacity: 1", "filter: none", "transform: none"]) expect(frames).toContain(prop);
  });

  it("the proof band trades its stuck spinner for an honest note", () => {
    const landing = readFileSync(join(process.cwd(), "src/components/landing/landing.css"), "utf8");
    expect(landing).toMatch(/html:not\(\[data-hydrated\]\) \.lp-proof-failsafe \{/);
    expect(landing).toMatch(/\.lp-proof-failsafe \{\s*display: none;/);
  });
});

describe("the dev server serves the LAN", () => {
  it("allows private 192.168/16 origins, so a phone on the network hydrates", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain('allowedDevOrigins: ["192.168.*.*"]');
  });
});

describe("reduced motion never hides content", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("forces every reveal to its finished state under prefers-reduced-motion", () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\[data-reveal\] \{([^}]*)\}/);
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/opacity: 1 !important/);
    expect(block![1]).toMatch(/transform: none !important/);
  });

  it("ScrollReveal renders one tree for everyone, so hydration cannot strand opacity:0", () => {
    const src = readFileSync(join(process.cwd(), "src/components/landing/ScrollReveal.tsx"), "utf8");
    expect(src).not.toMatch(/if \(reduced\)/);
  });
});
