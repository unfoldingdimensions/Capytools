/**
 * The site's JSON-LD, built from the registry rather than hand-written per
 * page.
 *
 * Two shapes ship: the homepage carries `Organization` + `WebSite`, and every
 * tool page carries a `SoftwareApplication` for its own tool. All of it derives
 * from `SUITE` and `EXTERNAL`, so a twelfth tool is described to crawlers by
 * the same row that already puts it in the nav, the catalog and the sitemap.
 *
 * Honesty rules this file keeps, because structured data is a claim made to
 * machines that cannot check it:
 * - `price: "0"` is true — every tool is free, and there is nothing to buy.
 * - `operatingSystem` follows the registry's own `cat`. CapyExpense is the
 *   documented desktop exception, so it must not claim to run on the Web.
 * - No `aggregateRating`, no `review`, no `interactionStatistic`. We have no
 *   ratings, and inventing them is exactly the abuse the vocabulary invites.
 * - No `logo` yet. `Organization.logo` wants a real raster or SVG image and the
 *   suite does not have one — only a favicon, which Google does not accept. An
 *   absent property is honest; a broken one is not. Add it here the day the
 *   logotype lands, and nowhere else.
 */

import { EXTERNAL } from "@/lib/capytools/landing";
import { SUITE, type SuiteTool } from "@/lib/capytools/suite";
import { SITE_URL } from "@/lib/utils";

export const SITE_NAME = "Capytools";

/** Matches the root layout's `description` — one claim, one wording. */
export const SITE_DESCRIPTION =
  "Small tools that run in your browser and keep nothing. No signup. No cookies. Nothing stored.";

/**
 * Where else this brand is the same entity. GitHub is currently the only one;
 * adding an X or LinkedIn profile means adding it here, not in a template.
 */
const SAME_AS = [EXTERNAL.repo];

/**
 * The homepage's two entities in ONE block.
 *
 * MEASURED, not assumed: shipped as two sibling `<script>` tags, the schema.org
 * validator parsed `numObjects: 1` — it reported the WebSite and dropped both
 * the Organization and the WebSite's own `publisher` reference to it. Nothing
 * was invalid (0 errors, 0 warnings) and nothing looked wrong in the HTML;
 * the entity simply was not there afterwards. `@graph` is the canonical way to
 * state several related entities, it keeps the `@id` reference resolvable
 * inside one document, and it is what every SEO plugin emits for exactly this
 * reason.
 *
 * The two builders stay separate so each entity can still be read and tested
 * on its own.
 */
export function homepageGraphLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [ORGANIZATION, WEB_SITE],
  };
}

const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  sameAs: SAME_AS,
} as const;

const WEB_SITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": ORGANIZATION["@id"] },
} as const;

export function organizationLd() {
  return { "@context": "https://schema.org", ...ORGANIZATION };
}

export function webSiteLd() {
  return { "@context": "https://schema.org", ...WEB_SITE };
}

/**
 * The desktop exception is a real one: CapyExpense ships as a Tauri binary, so
 * claiming `Web` for it would be a lie told to a crawler.
 */
function operatingSystem(tool: SuiteTool): string {
  return tool.cat === "desktop" ? "Windows, macOS, Linux" : "Web";
}

/**
 * A browser tool is available the moment the page loads. The desktop one is
 * not: CapyExpense has a page and no builds, and `InStock` would tell a crawler
 * it can be had today. `PreOrder` is the closest true value in
 * schema.org's ItemAvailability list. Revisit this the day a binary ships.
 */
function availability(tool: SuiteTool): string {
  return tool.cat === "desktop"
    ? "https://schema.org/PreOrder"
    : "https://schema.org/InStock";
}

export function softwareApplicationLd(toolName: string) {
  const tool = SUITE.find((row) => row.name === toolName);
  if (!tool) return null;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}${tool.href}#software`,
    name: tool.name,
    url: `${SITE_URL}${tool.href}`,
    description: tool.blurb,
    applicationCategory: tool.appCategory,
    operatingSystem: operatingSystem(tool),
    isAccessibleForFree: true,
    license: EXTERNAL.license,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: availability(tool),
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
