import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { CardArt } from "../src/components/card/CardArt";
import { DEMO_STATS } from "../src/lib/capytools/demo";

/**
 * Satori (behind ImageResponse) supports a strict CSS subset and throws on
 * anything outside it — `transform: none`, percentage translates, and a
 * multi-child div without an explicit `display` have each silently broken the
 * OG image in the past, and a broken OG image means a shared link posts with no
 * card. This renders the real card and fails if Satori rejects any style.
 */
describe("OG image rendering", () => {
  async function render(format: "wide" | "square", variant: "light" | "dark") {
    const res = new ImageResponse(
      <CardArt stats={DEMO_STATS} variant={variant} format={format} />,
      format === "wide" ? { width: 1200, height: 630 } : { width: 1080, height: 1080 },
    );
    return Buffer.from(await res.arrayBuffer());
  }

  it("renders the wide card to a PNG", async () => {
    const png = await render("wide", "light");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }, 30_000);

  it("renders the square card to a PNG", async () => {
    const png = await render("square", "dark");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1080);
  }, 30_000);

  it("renders the no-activity card", async () => {
    const stats = {
      ...DEMO_STATS,
      activity: { ...DEMO_STATS.activity, chartSeries: [], monthTicks: [], empty: true },
    };
    const res = new ImageResponse(<CardArt stats={stats} format="wide" />, {
      width: 1200,
      height: 630,
    });
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  }, 30_000);
});
