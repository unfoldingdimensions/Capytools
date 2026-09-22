import type { MetadataRoute } from "next";

import { LABS } from "@/lib/capytools/landing";
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

/**
 * Bumped by hand, for the same reason `/llms.txt` bumps its own: it means
 * "when did this page last change", not "when was this sitemap served".
 *
 * MEASURED in Search Console. This was `new Date()` evaluated inside the
 * handler — and the route is dynamic on Workers, so every single fetch of
 * the sitemap stamped every URL as modified at that instant:
 *
 *   <loc>https://capytools.app/capywrapped</loc>
 *   <lastmod>2026-09-22T06:42:45.358Z</lastmod>
 *
 * Google's sitemap documentation is explicit that it ignores `lastmod`
 * entirely once it finds the value unreliable, and "every page changed one
 * second ago, on every read" is as unreliable as it gets. All eleven tool
 * pages sat in "Discovered - currently not indexed" with no crawl date.
 *
 * A build-time constant would be no better — it rewrites on every unrelated
 * deploy and makes the claim meaningless again. So: a date a human sets when
 * a page's content actually changes.
 */
const LAST_UPDATED = "2026-09-22";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = LAST_UPDATED;

  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    ...LABS.tools.map((tool) => ({
      url: `${SITE_URL}${tool.href}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...STATIC_PAGES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
