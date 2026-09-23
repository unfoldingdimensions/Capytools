import { describe, expect, it } from "vitest";

import sitemap from "../src/app/sitemap";
import { SUITE } from "../src/lib/capytools/suite";
import { SITE_URL } from "../src/lib/utils";

/**
 * A Search Console finding that was invisible from inside the app: the
 * sitemap claimed every page changed on every read. (Its sibling — the site
 * answering on two schemes — is now the zone's "Always Use HTTPS" rule, not
 * code, so it has nothing here to test.)
 */

describe("sitemap lastmod is a date, not a clock reading", () => {
  /**
   * The bug: `new Date()` inside the handler, on a route that is dynamic on
   * Workers — so two fetches a second apart reported two different
   * modification times for all fifteen URLs. Google drops `lastmod` entirely
   * once it decides the value is unreliable.
   */
  it("is identical across calls", () => {
    const a = sitemap();
    const b = sitemap();
    expect(a.map((e) => String(e.lastModified))).toEqual(b.map((e) => String(e.lastModified)));
  });

  it("is a plain YYYY-MM-DD, not a timestamp", () => {
    for (const entry of sitemap()) {
      expect(String(entry.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("still lists the homepage and every tool", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(SITE_URL);
    for (const tool of SUITE) expect(urls).toContain(`${SITE_URL}${tool.href}`);
  });
});
