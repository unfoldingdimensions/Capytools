import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import sitemap from "../src/app/sitemap";
import { INTENT_PAGES } from "../src/lib/capytools/intents";
import { SUITE } from "../src/lib/capytools/suite";
import { SITE_URL } from "../src/lib/utils";

const smoke = readFileSync(join(__dirname, "../scripts/smoke.mjs"), "utf8");

describe("intent pages", () => {
  // A row without its page file is a sitemap URL that 404s.
  it.each(INTENT_PAGES.map((p) => [p.href, p]))("%s is served, crawlable and smoke-tested", (href, page) => {
    expect(existsSync(join(__dirname, `../src/app${href}/page.tsx`))).toBe(true);
    expect(SUITE.map((t) => t.name)).toContain(page.tool);
    expect(sitemap().map((e) => e.url)).toContain(`${SITE_URL}${href}`);
    expect(smoke).toContain(`"${href}"`);
  });

  it("never shadows a tool page or each other", () => {
    const hrefs = INTENT_PAGES.map((p) => p.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const tool of SUITE) expect(hrefs).not.toContain(tool.href);
  });
});
