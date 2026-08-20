import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CapyMark } from "../src/components/mascot/CapyMark";
import { CapyScene } from "../src/components/mascot/CapyScene";
import { CAPY_POSE, HEAD_PIVOT } from "../src/lib/capytools/mascot";
import { capyMarkDataUri } from "../src/lib/capytools/sparkline";

describe("CapyMark (app logo)", () => {
  it("is stroke-only so it inherits the theme colour", () => {
    const html = renderToStaticMarkup(<CapyMark />);
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toMatch(/fill="(?!none)[^"]+"/); // no hard-coded fills
    expect(html).toContain('aria-hidden');
  });

  it("is static — no animation classes on the logo", () => {
    expect(renderToStaticMarkup(<CapyMark />)).not.toMatch(/capy-|animate/);
  });
});

// CapyScene is kept as scaffolding to fill in later; it is not wired into any
// page right now, and its animation classes were removed with the logo revert.
describe("CapyScene (three-pose rig)", () => {
  const poses = ["loaf", "friends", "nap"] as const;

  it("renders every pose without morphing a path", () => {
    for (const pose of poses) {
      const html = renderToStaticMarkup(<CapyScene pose={pose} />);
      // Same drawing every time — only transforms/opacity differ.
      expect(html).toContain(CAPY_POSE.body);
      expect(html).toContain(CAPY_POSE.head);
      expect(html).toContain(CAPY_POSE.bird);
    }
  });

  it("hides the bird and steam except in the friends pose", () => {
    const opacityOf = (html: string, d: string) => {
      const g = html.slice(0, html.indexOf(d));
      const matches = [...g.matchAll(/opacity:([\d.]+)/g)];
      return Number(matches[matches.length - 1]?.[1]);
    };
    expect(opacityOf(renderToStaticMarkup(<CapyScene pose="friends" />), CAPY_POSE.bird)).toBe(1);
    expect(opacityOf(renderToStaticMarkup(<CapyScene pose="loaf" />), CAPY_POSE.bird)).toBe(0);
    expect(opacityOf(renderToStaticMarkup(<CapyScene pose="nap" />), CAPY_POSE.bird)).toBe(0);
  });

  it("tips the head about the documented pivot when napping", () => {
    const html = renderToStaticMarkup(<CapyScene pose="nap" />);
    expect(html).toContain("rotate(-4deg)");
    expect(html).toContain(`${HEAD_PIVOT.x}px ${HEAD_PIVOT.y}px`);
    // loaf keeps the head level
    expect(renderToStaticMarkup(<CapyScene pose="loaf" />)).toContain("rotate(0deg)");
  });

  it("exposes an accessible name only when given one", () => {
    expect(renderToStaticMarkup(<CapyScene pose="nap" />)).toContain('aria-hidden');
    const named = renderToStaticMarkup(<CapyScene pose="nap" title="Napping capybara" />);
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Napping capybara"');
  });
});

describe("capyMarkDataUri", () => {
  it("stays a flat static head for the card watermark", () => {
    const uri = capyMarkDataUri("#123456");
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodeURIComponent(uri.slice("data:image/svg+xml,".length));
    expect(svg).toContain("#123456");
    expect(svg).toContain("M15 25 C15 13 22 7 32 7"); // original head contour
    // A PNG cannot hold motion, and Satori cannot parse inline <svg> animation.
    expect(svg).not.toMatch(/animate|animation|capy-/);
  });
});
