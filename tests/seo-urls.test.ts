import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import sitemap from "../src/app/sitemap";
import { proxy } from "../src/proxy";
import { SUITE } from "../src/lib/capytools/suite";
import { SITE_URL } from "../src/lib/utils";

/**
 * Two Search Console findings, both of which were invisible from inside the
 * app: the site answered on two schemes, and the sitemap claimed every page
 * changed on every read.
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

describe("http is redirected, so the site is one copy and not two", () => {
  const req = (url: string, proto?: string) =>
    new NextRequest(url, { headers: proto ? { "x-forwarded-proto": proto } : {} });

  it("301s an http page to the same path on https", () => {
    const res = proxy(req("https://capytools.app/capyqr", "http"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://capytools.app/capyqr");
  });

  it("keeps the query string, so a campaign link still lands", () => {
    const res = proxy(req("https://capytools.app/capyqr?utm_source=x", "http"));
    expect(res.headers.get("location")).toBe("https://capytools.app/capyqr?utm_source=x");
  });

  /**
   * The failure mode worth a test of its own: guessing "http" for a request
   * that is already https redirects every page to itself, forever. So an
   * https request, and a request with no header at all, must both pass
   * straight through.
   */
  it("does not touch an https request", () => {
    const res = proxy(req("https://capytools.app/capyqr", "https"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  /**
   * `next dev` sets `x-forwarded-proto: http` on everything it serves, so
   * without this exemption every local page 301s to https://localhost:PORT,
   * where nothing is listening. Shipped once, caught on the dev server.
   */
  it("leaves localhost alone — there is no https there to upgrade to", () => {
    for (const host of ["localhost:3024", "127.0.0.1:3024", "[::1]:3024"]) {
      const res = proxy(req(`http://${host}/tools`, "http"));
      expect(res.status, host).toBe(200);
      expect(res.headers.get("location"), host).toBeNull();
    }
  });

  it("does nothing when the header is absent, rather than guessing", () => {
    const res = proxy(req("https://capytools.app/capyqr"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("leaves the rate limiter to the API surface only", () => {
    // 40 page views, well past MAX_REQUESTS — none may be refused.
    for (let i = 0; i < 40; i++) {
      expect(proxy(req(`https://capytools.app/capyqr?i=${i}`, "https")).status).toBe(200);
    }
  });
});
