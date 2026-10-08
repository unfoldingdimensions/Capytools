import { TEMPLATE_LIST } from "../templates";
import { COUNTRY_PAGES } from "./countries";
import { ROLE_PAGES } from "./roles";

/**
 * Every CapyResume guide page under /capyresume, derived from the same copy the
 * pages render from — so the sitemap can never list a page that does not exist,
 * or miss one that does. The tool page itself comes from its SUITE row.
 */
export const CAPYRESUME_GUIDE_PATHS: readonly string[] = [
  "/capyresume/templates",
  ...TEMPLATE_LIST.map((spec) => `/capyresume/templates/${spec.id}`),
  "/capyresume/resume-templates",
  ...ROLE_PAGES.map((page) => `/capyresume/resume-templates/${page.slug}`),
  "/capyresume/free-cv-builder",
  ...COUNTRY_PAGES.map((page) => `/capyresume/free-cv-builder/${page.slug}`),
  "/capyresume/ats-resume-format",
];
