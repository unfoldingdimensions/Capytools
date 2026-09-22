import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CapyMark } from "../src/components/mascot/CapyMark";
import { capyMarkDataUri } from "../src/lib/capytools/sparkline";

/**
 * `CapyScene` and its `CAPY_POSE` path data were deleted with this file's
 * other half: a three-pose rig that animated a head about a pivot, kept as
 * scaffolding for artwork that never arrived. The real artwork did arrive —
 * flat, full-colour, single-layer — as `CapyArt`, which the rig could not
 * drive and did not need to. Two mascot systems is one too many.
 *
 * `CapyMark` stays. It is no longer the brand mark (BrandMark carries the
 * traced logo now), but `capyMarkDataUri` re-draws it inline for the share
 * card, where Satori cannot parse a React <svg> — so this file is what keeps
 * those two copies honest.
 */

describe("CapyMark (share-card glyph)", () => {
  it("is stroke-only so it inherits the theme colour", () => {
    const html = renderToStaticMarkup(<CapyMark />);
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toMatch(/fill="(?!none)[^"]+"/); // no hard-coded fills
    expect(html).toContain("aria-hidden");
  });

  it("is static — no animation classes on it", () => {
    expect(renderToStaticMarkup(<CapyMark />)).not.toMatch(/capy-|animate/);
  });

  it("the card's inline copy draws the same paths as the component", () => {
    // Satori cannot parse the React component, so the card re-states the paths
    // as a string. This is the only thing stopping the two from drifting.
    const html = renderToStaticMarkup(<CapyMark />);
    const uri = decodeURIComponent(capyMarkDataUri("#000000"));
    for (const d of [...html.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])) {
      expect(uri).toContain(d);
    }
  });
});
