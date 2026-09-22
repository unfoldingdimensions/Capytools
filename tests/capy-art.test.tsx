import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: Record<string, unknown>) =>
      createElement("img", {
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        "aria-hidden": props["aria-hidden"],
        className: props.className,
      }),
  };
});

import { CapyArt, type CapyPoseArt } from "../src/components/mascot/CapyArt";

const POSES: CapyPoseArt[] = ["awake", "asleep", "surprise"];

/**
 * The failure these guard against is the quiet one: a pose whose file was
 * never added renders a broken image and no test notices, because the markup
 * is still perfectly valid.
 */
describe("CapyArt", () => {
  for (const pose of POSES) {
    it(`${pose} points at a file that exists`, () => {
      const html = renderToStaticMarkup(<CapyArt pose={pose} />);
      const src = /src="([^"]+)"/.exec(html)?.[1];
      expect(src).toBe(`/mascot/capy-${pose}.svg`);
      expect(existsSync(join(process.cwd(), "public", src!))).toBe(true);
    });
  }

  it("is hidden from screen readers when it carries no alt", () => {
    expect(renderToStaticMarkup(<CapyArt />)).toContain('aria-hidden="true"');
  });

  it("is announced when given one", () => {
    const html = renderToStaticMarkup(<CapyArt pose="surprise" alt="A startled capybara" />);
    expect(html).toContain('alt="A startled capybara"');
    expect(html).not.toContain("aria-hidden");
  });

  describe("the artwork itself", () => {
    for (const pose of POSES) {
      const svg = () =>
        readFileSync(join(process.cwd(), "public", `mascot/capy-${pose}.svg`), "utf8");

      it(`${pose} shares the common viewBox, so poses do not jump`, () => {
        // All three are the same animal in the same place; a differing box
        // would make a pose swap look like a cut.
        expect(svg()).toContain('viewBox="520 420 1010 1200"');
      });

      it(`${pose} carries no raster payload`, () => {
        // A traced SVG that smuggled in a base64 JPEG would weigh megabytes.
        expect(svg()).not.toContain("data:image");
      });
    }
  });
});
