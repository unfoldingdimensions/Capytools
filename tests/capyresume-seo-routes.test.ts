import { describe, expect, it } from "vitest";
import type { Metadata } from "next";

import sitemap from "@/app/sitemap";
import * as toolPage from "@/app/capyresume/page";
import * as atsResumeFormat from "@/app/capyresume/(guides)/ats-resume-format/page";
import * as freeCvBuilderHub from "@/app/capyresume/(guides)/free-cv-builder/page";
import * as resumeTemplatesHub from "@/app/capyresume/(guides)/resume-templates/page";
import * as templatesIndex from "@/app/capyresume/(guides)/templates/page";
import { CAPYRESUME_GUIDE_PATHS } from "@/lib/capyresume/seo/routes";
import { CAPYRESUME_GUIDES_LIVE } from "@/lib/capyresume/seo/live";
import GuidesLayout from "@/app/capyresume/(guides)/layout";
import { COUNTRY_PAGES } from "@/lib/capyresume/seo/countries";
import { ROLE_PAGES } from "@/lib/capyresume/seo/roles";
import { TEMPLATE_LIST } from "@/lib/capyresume/templates";
import { SITE_URL } from "@/lib/utils";

describe("CapyResume routes on Capytools", () => {
  it("lists the guide pages in the sitemap only once they are live", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/capyresume`);
    for (const path of CAPYRESUME_GUIDE_PATHS) {
      expect(urls.includes(`${SITE_URL}${path}`)).toBe(CAPYRESUME_GUIDES_LIVE);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("answers 404 on every guide route while they are held back", () => {
    // The (guides) layout is the one gate in front of all of them.
    if (CAPYRESUME_GUIDES_LIVE) return;
    expect(() => GuidesLayout({ children: null })).toThrow();
  });

  it("derives the guide list from the copy the pages render", () => {
    expect(CAPYRESUME_GUIDE_PATHS).toHaveLength(
      4 + TEMPLATE_LIST.length + ROLE_PAGES.length + COUNTRY_PAGES.length,
    );
    // Everything lives under the tool's own path: no root-level /templates that
    // would read as a Capytools-wide page.
    for (const path of CAPYRESUME_GUIDE_PATHS) expect(path.startsWith("/capyresume/")).toBe(true);
  });

  it("declares a self-canonical on every static route", () => {
    const table: [string, Metadata["alternates"]][] = [
      ["/capyresume", toolPage.metadata.alternates],
      ["/capyresume/templates", templatesIndex.metadata.alternates],
      ["/capyresume/ats-resume-format", atsResumeFormat.metadata.alternates],
      ["/capyresume/resume-templates", resumeTemplatesHub.metadata.alternates],
      ["/capyresume/free-cv-builder", freeCvBuilderHub.metadata.alternates],
    ];
    for (const [route, alternates] of table) {
      expect({ route, canonical: alternates?.canonical }).toEqual({ route, canonical: route });
    }
  });
});
