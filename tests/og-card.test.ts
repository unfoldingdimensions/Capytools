import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// layout.tsx calls the font loaders at module scope; outside `next build`
// they are not callable. The metadata this file asserts on does not depend on
// them, so a loader-shaped stub is enough to import the module.
vi.mock("next/font/google", () => {
  const face = () => ({ variable: "--stub", className: "stub", style: {} });
  return { Albert_Sans: face, Fraunces: face, Plus_Jakarta_Sans: face };
});

import {
  OG_CARD_TOOL_COUNT,
  OG_DEFAULTS,
  OG_IMAGE,
  TWITTER_DEFAULTS,
} from "../src/lib/capytools/og";
import { SUITE } from "../src/lib/capytools/suite";
import { metadata as layoutMetadata } from "../src/app/layout";
import { metadata as homeMetadata } from "../src/app/page";

/**
 * A share card fails silently in every direction: a wrong path 404s and the
 * post shows nothing, wrong dimensions crop the art, and — the one that bit
 * this codebase — a page declaring its own `openGraph` REPLACES the layout's,
 * so the card vanishes from exactly the page people share most.
 */

/** Width and height straight out of the PNG's IHDR chunk. */
function pngSize(path: string) {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe("the share card", () => {
  const file = join(process.cwd(), "public", OG_IMAGE.url);

  it("exists", () => {
    expect(existsSync(file)).toBe(true);
  });

  it("is really the size it claims — a lie here crops the art", () => {
    expect(pngSize(file)).toEqual({ width: OG_IMAGE.width, height: OG_IMAGE.height });
  });

  it("is the canonical 1200x630 both Open Graph and X expect", () => {
    // The "1.91:1" everyone quotes is a rounding of 1200/630 = 1.9048. Pin the
    // pixel dimensions, which are what the platforms actually key on.
    expect([OG_IMAGE.width, OG_IMAGE.height]).toEqual([1200, 630]);
    expect(OG_IMAGE.width / OG_IMAGE.height).toBeCloseTo(1.9048, 3);
  });

  it("does not claim a tool count the registry has outgrown", () => {
    // The card reads "ELEVEN TOOLS" in pixels. Every other count on the site
    // derives from SUITE; this one cannot, so it gets a tripwire instead.
    // When this fails, regenerate the card — do not just edit the number.
    expect(OG_CARD_TOOL_COUNT).toBe(SUITE.length);
  });

  it("carries alt text", () => {
    expect(OG_IMAGE.alt.length).toBeGreaterThan(10);
  });
});

describe("metadata wiring", () => {
  it("the layout offers the card", () => {
    expect(layoutMetadata.openGraph?.images).toEqual(OG_DEFAULTS.images);
    expect(layoutMetadata.twitter).toEqual(TWITTER_DEFAULTS);
  });

  it("metadataBase is set, or a relative image is emitted unresolved", () => {
    expect(String(layoutMetadata.metadataBase)).toContain("https://");
  });

  it("the homepage keeps the card despite declaring its own openGraph", () => {
    // Next merges metadata SHALLOWLY: without the spread, this page — the one
    // most likely to be shared — would be the only page with no card.
    expect(homeMetadata.openGraph?.images).toEqual(OG_DEFAULTS.images);
  });

  it("the homepage keeps its own title too", () => {
    expect(homeMetadata.openGraph?.title).toBe("Capytools — calm little tools");
  });

  it("asks for the large card, not the square crop", () => {
    expect(TWITTER_DEFAULTS.card).toBe("summary_large_image");
  });
});
