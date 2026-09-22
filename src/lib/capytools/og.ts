import type { Metadata } from "next";

import { SITE_URL } from "@/lib/utils";

/**
 * The share card, in one place.
 *
 * It is a STATIC file rather than an `opengraph-image` route. The card never
 * changes — it carries the brand, not the page — so rendering it per request
 * would buy nothing and cost a Google Fonts round trip on every cold isolate,
 * which is exactly the unbounded await #40 had to put a timeout on. Generated
 * once from the real Fraunces and Jakarta faces and committed.
 *
 * Exported as a whole `openGraph` block, not just the image, because Next
 * merges metadata SHALLOWLY: a page that declares its own `openGraph` REPLACES
 * the layout's entirely, images and all. Spreading this is what keeps a page's
 * own title from silently dropping the card
 * (next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md).
 */
/**
 * The tool count PRINTED on the card, as pixels.
 *
 * The card is a committed image, so this string cannot re-derive itself from
 * the registry the way the rest of the site does. `tests/og-card.test.ts`
 * fails when this stops matching `SUITE.length` — which is the reminder to
 * regenerate the card, not to edit this number.
 */
export const OG_CARD_TOOL_COUNT = 11;

export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Capytools — calm little tools",
} as const;

export const OG_DEFAULTS = {
  siteName: "Capytools",
  type: "website",
  locale: "en",
  url: `${SITE_URL}/`,
  images: [OG_IMAGE],
} satisfies Metadata["openGraph"];

/** X and the rest read this one; `summary` alone crops the card to a square. */
export const TWITTER_DEFAULTS = {
  card: "summary_large_image",
  images: [OG_IMAGE.url],
} satisfies Metadata["twitter"];
