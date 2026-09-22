import type { Metadata } from "next";

import { SUITE } from "@/lib/capytools/suite";
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
  // language_TERRITORY, per the Open Graph spec. A bare `en` is not a
  // valid og:locale and parsers fall back to their own default.
  locale: "en_US",
  url: `${SITE_URL}/`,
  images: [OG_IMAGE],
} satisfies Metadata["openGraph"];

/** X and the rest read this one; `summary` alone crops the card to a square. */
export const TWITTER_DEFAULTS = {
  card: "summary_large_image",
  images: [OG_IMAGE.url],
} satisfies Metadata["twitter"];

/**
 * A tool page's metadata, share card included.
 *
 * MEASURED on the deployed site: every tool page inherited the LAYOUT'S
 * `openGraph` whole, so all eleven shared as `og:title` "Capytools — calm
 * little tools" with `og:url` pointing at the homepage — a link to /capyqr
 * previewed as, and pointed at, the root. The page's own `<title>` was
 * always right, which is what made it invisible.
 *
 * Inheriting the layout block is the correct default for the card IMAGE and
 * the site name; it is wrong for the three fields that identify the page.
 * This overrides exactly those and nothing else, and it is the only way a
 * tool page should declare metadata — `tests/og-card.test.ts` walks every
 * SUITE row and fails on a page that hand-rolls it again.
 *
 * `href` and the canonical come from the registry rather than the caller, so
 * a tool cannot advertise a URL it does not serve.
 */
export function toolMetadata(
  tool: string,
  meta: { title: string; description: string },
): Metadata {
  const row = SUITE.find((r) => r.name === tool);
  // Loud at build time. The silent version of this mistake is the bug above.
  if (!row) throw new Error(`toolMetadata: no SUITE row named ${tool}`);

  return {
    ...meta,
    alternates: { canonical: row.href },
    openGraph: { ...OG_DEFAULTS, ...meta, url: `${SITE_URL}${row.href}` },
    twitter: { ...TWITTER_DEFAULTS, ...meta },
  };
}
