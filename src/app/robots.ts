import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/utils";

/**
 * `/api` is disallowed for our sake, not the crawler's: one hit on
 * /api/og/<name> costs up to 55 upstream requests on the server's GitHub
 * token, and a crawler walking that space would burn the hourly quota for
 * everyone. `/u/` goes with it — those pages are per-username cards, an
 * unbounded space that leads straight back into the same fan-out.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/u/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
