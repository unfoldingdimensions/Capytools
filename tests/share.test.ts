import { describe, expect, it } from "vitest";
import { shareIntents, shareLine } from "../src/lib/card/export";
import { DEMO_STATS } from "../src/lib/capytools/demo";
import { SITE_URL } from "../src/lib/utils";
import { spreadFrom } from "../src/lib/capytools/reveal";

describe("shareIntents", () => {
  const intents = shareIntents("torvalds");

  it("links to the canonical public origin, never localhost", () => {
    // A localhost link is unreachable by X and LinkedIn: X then renders no card
    // (so the post carries no image) and LinkedIn drops the user on their feed.
    expect(intents.url).toBe(`${SITE_URL}/u/torvalds`);
    expect(intents.url.startsWith("https://")).toBe(true);
    expect(intents.url).not.toContain("localhost");
    expect(decodeURIComponent(intents.x)).not.toContain("localhost");
    expect(decodeURIComponent(intents.x)).toContain(intents.url);
  });

  it("uses the requested share copy", () => {
    const text = decodeURIComponent(new URL(intents.x).searchParams.get("text") ?? "");
    expect(text).toBe("My GitHub year, wrapped in a calm little card. Create your card at");
    expect(text).not.toMatch(/no signup|no tracking|nothing stored/i);
  });

  it("points at the current X post intent", () => {
    expect(intents.x.startsWith("https://x.com/intent/post?")).toBe(true);
  });
});

describe("shareLine", () => {
  it("ends with the create-your-card call to action", () => {
    const line = shareLine(DEMO_STATS, "https://example.com/u/x");
    expect(line).toContain("Create your card at https://example.com/u/x");
    expect(line).not.toMatch(/no tracking/i);
  });

  it("does not mention the busiest weekday", () => {
    expect(shareLine(DEMO_STATS, "https://example.com/u/x")).not.toMatch(/busiest/i);
  });
});

describe("spreadFrom", () => {
  it("reaches past the furthest corner from a top-right origin", () => {
    // Toggle sits top-right; the circle must still cover the bottom-left corner
    // or a wedge of the old theme is left behind at the end of the animation.
    const s = spreadFrom({ left: 1200, top: 20, width: 36, height: 36 }, 1280, 800);
    expect(s.x).toBe(1218);
    expect(s.y).toBe(38);
    expect(s.radius).toBeGreaterThanOrEqual(Math.hypot(s.x, 800 - s.y));
    expect(s.from).toBe("circle(0px at 1218px 38px)");
    expect(s.to).toBe(`circle(${s.radius}px at 1218px 38px)`);
  });

  it("covers every corner wherever the origin sits", () => {
    const vw = 1000;
    const vh = 600;
    for (const [left, top] of [[0, 0], [980, 0], [0, 580], [980, 580], [490, 290]]) {
      const s = spreadFrom({ left, top, width: 20, height: 20 }, vw, vh);
      const corners = [[0, 0], [vw, 0], [0, vh], [vw, vh]];
      for (const [cx, cy] of corners) {
        expect(s.radius + 1e-9).toBeGreaterThanOrEqual(Math.hypot(cx - s.x, cy - s.y));
      }
    }
  });
});

describe("shareIntents shape", () => {
  it("no longer offers LinkedIn", () => {
    // share-offsite only accepts a url and pulls OG tags, so the button could
    // never carry the caption or the image — it was removed.
    expect(Object.keys(shareIntents("x")).sort()).toEqual(["url", "x"]);
  });
});
