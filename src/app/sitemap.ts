import type { MetadataRoute } from "next";

import { CAPYRESUME_GUIDE_PATHS } from "@/lib/capyresume/seo/routes";
import { CAPYRESUME_GUIDES_LIVE } from "@/lib/capyresume/seo/live";
import { INTENT_PAGES } from "@/lib/capytools/intents";
import { LABS } from "@/lib/capytools/landing";
import { CONTENT_UPDATED } from "@/lib/capytools/updated";
import { SITE_URL } from "@/lib/utils";

/**
 * The sitemap is derived from the landing's own tool catalog rather than a
 * second hand-kept list: `LABS.tools` is what the Labs section renders, so a
 * sixth tool added there is in the sitemap the same day, and a tool that is
 * never linked from the landing is never advertised to a crawler either.
 *
 * Deliberately absent: `/api/*`, which has nothing to index, and `/u/<name>`,
 * which is a card generated per GitHub user — an unbounded space that would
 * hand crawlers a fan-out onto our token rather than pages worth ranking.
 */
const STATIC_PAGES = ["/tools", "/notes", "/design", "/license"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // Hand-set, never a clock reading — why is in updated.ts.
  const lastModified = CONTENT_UPDATED;

  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    ...LABS.tools.map((tool) => ({
      url: `${SITE_URL}${tool.href}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...INTENT_PAGES.map((page) => ({
      url: `${SITE_URL}${page.href}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...(CAPYRESUME_GUIDES_LIVE ? CAPYRESUME_GUIDE_PATHS : []).map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...STATIC_PAGES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
