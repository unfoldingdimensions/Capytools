import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changedUrls } from "../scripts/indexnow.mjs";

const script = readFileSync(join(__dirname, "../scripts/indexnow.mjs"), "utf8");
const key = script.match(/const KEY = "([^"]+)"/)?.[1] ?? "";

describe("IndexNow key", () => {
  // Engines verify ownership by fetching /<key>.txt and comparing its body. A
  // key changed in one place and not the other answers 403 on every deploy.
  it("is a valid key, served from the site root with itself as the body", () => {
    expect(key).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
    const file = join(__dirname, `../public/${key}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(key);
  });
});

describe("IndexNow sends only what changed (D49)", () => {
  const sitemap = (...urls: [string, string][]) =>
    `<?xml version="1.0"?><urlset>${urls
      .map(([loc, lastmod]) => `<url>\n<loc>${loc}</loc>\n<lastmod>${lastmod}</lastmod>\n</url>`)
      .join("\n")}</urlset>`;
  const a = "https://capytools.app/a";
  const b = "https://capytools.app/b";
  const c = "https://capytools.app/c";

  it("sends nothing when nothing moved — a docs-only deploy", () => {
    const xml = sitemap([a, "2026-10-09"], [b, "2026-10-09"]);
    expect(changedUrls(xml, xml)).toEqual({ urls: [], reason: null });
  });

  it("sends a new URL and a URL whose lastmod moved, and nothing else", () => {
    const before = sitemap([a, "2026-10-08"], [b, "2026-10-08"]);
    const after = sitemap([a, "2026-10-09"], [b, "2026-10-08"], [c, "2026-10-09"]);
    expect(changedUrls(before, after).urls).toEqual([a, c]);
  });

  it("does not send a URL that was removed", () => {
    const before = sitemap([a, "2026-10-09"], [b, "2026-10-09"]);
    const after = sitemap([a, "2026-10-09"]);
    expect(changedUrls(before, after).urls).toEqual([]);
  });

  it("sends everything, with a reason, when there is no usable previous sitemap", () => {
    const after = sitemap([a, "2026-10-09"], [b, "2026-10-09"]);
    for (const previous of ["", "not xml", "<urlset></urlset>"]) {
      const result = changedUrls(previous, after);
      expect(result.urls).toEqual([a, b]);
      expect(result.reason).toMatch(/no previous sitemap/);
    }
  });
});
