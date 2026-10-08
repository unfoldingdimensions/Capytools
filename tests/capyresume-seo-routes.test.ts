import { describe, expect, it } from "vitest";
import type { Metadata } from "next";

import sitemap from "@/app/sitemap";
import * as toolPage from "@/app/capyresume/page";
import * as atsResumeFormat from "@/app/capyresume/ats-resume-format/page";
import * as freeCvBuilderHub from "@/app/capyresume/free-cv-builder/page";
import * as resumeTemplatesHub from "@/app/capyresume/resume-templates/page";
import * as templatesIndex from "@/app/capyresume/templates/page";
import { CAPYRESUME_GUIDE_PATHS } from "@/lib/capyresume/seo/routes";
import { COUNTRY_PAGES } from "@/lib/capyresume/seo/countries";
import { ROLE_PAGES } from "@/lib/capyresume/seo/roles";
import { TEMPLATE_LIST } from "@/lib/capyresume/templates";
import { SITE_URL } from "@/lib/utils";

describe("CapyResume routes on Capytools", () => {
  it("puts the tool and every guide page in the sitemap, once each", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/capyresume`);
    for (const path of CAPYRESUME_GUIDE_PATHS) expect(urls).toContain(`${SITE_URL}${path}`);
    expect(new Set(urls).size).toBe(urls.length);
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
