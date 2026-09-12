import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";

import { OgCard } from "../src/components/card/og/OgCard";
import { DEMO_CARD } from "../src/lib/capyog/demo";
import type { OgTemplateId } from "../src/lib/capyog/types";

/**
 * Same discipline as og-render.test.tsx: Satori (behind ImageResponse) rejects
 * any style outside its CSS subset, and a rejected style means a future share
 * route renders no card at all. No OG route ships with CapyOG v1, so this
 * smoke is the mechanical guarantee that the card subset stays Satori-ready —
 * every template, and the two tall frames where overflow would bite first.
 */
describe("CapyOG OG rendering", () => {
  const templates: OgTemplateId[] = ["statement", "quote", "stat", "announcement"];

  for (const template of templates) {
    it(`renders the ${template} card to a 1200×630 PNG`, async () => {
      const res = new ImageResponse(
        <OgCard
          data={DEMO_CARD}
          template={template}
          accent="sage"
          variant="light"
          width={1200}
          height={630}
        />,
        { width: 1200, height: 630 },
      );
      const png = Buffer.from(await res.arrayBuffer());
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
    }, 30_000);
  }

  it("renders the 1080×1920 story frame", async () => {
    const res = new ImageResponse(
      <OgCard
        data={DEMO_CARD}
        template="statement"
        accent="water"
        variant="dark"
        width={1080}
        height={1920}
      />,
      { width: 1080, height: 1920 },
    );
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
  }, 30_000);

  /**
   * Overlong copy used to grow past the frame and get silently cropped by the
   * export; every block is clamped now. Satori is strict about `-webkit-box`,
   * so render the worst case through it — all four templates, every slot far
   * too long — and the smoke fails if a clamp is ever spelled in a way Satori
   * rejects.
   */
  const TOO_LONG = "an overlong line ".repeat(24).trim();

  for (const template of templates) {
    it(`clamps the ${template} card instead of overflowing it`, async () => {
      const res = new ImageResponse(
        <OgCard
          data={{
            eyebrow: TOO_LONG,
            title: TOO_LONG,
            titleEm: TOO_LONG,
            subtitle: TOO_LONG,
            big: TOO_LONG,
            attribution: TOO_LONG,
            tag: TOO_LONG,
          }}
          template={template}
          accent="gold"
          variant="light"
          width={1200}
          height={630}
        />,
        { width: 1200, height: 630 },
      );
      const png = Buffer.from(await res.arrayBuffer());
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
    }, 30_000);
  }

  it("renders the 1000×1500 pin frame", async () => {
    const res = new ImageResponse(
      <OgCard
        data={DEMO_CARD}
        template="stat"
        accent="clay"
        variant="dark"
        width={1000}
        height={1500}
      />,
      { width: 1000, height: 1500 },
    );
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1000);
    expect(png.readUInt32BE(20)).toBe(1500);
  }, 30_000);
});
