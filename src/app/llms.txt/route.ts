import { SUITE } from "@/lib/capytools/suite";
import { SITE_URL } from "@/lib/utils";

/**
 * `/llms.txt` — the site, in plain text, for a model reading it directly.
 *
 * Built from `SUITE` for the same reason the sitemap is: a hand-kept list of
 * tools is a list that goes stale, and a stale llms.txt is worse than none —
 * it tells a crawler with confidence that a tool does not exist. Every tool in
 * the registry is here the day it ships.
 *
 * `line` rather than `blurb` is deliberate: the catalog blurb is a sentence of
 * marketing, the note line is what the tool actually does. A model reading
 * this wants the second one.
 *
 * Deliberately absent, matching robots.ts: `/api/*` and `/u/<name>`. One hit
 * on an OG card costs up to 55 upstream GitHub requests, and pointing a model
 * at that unbounded space would burn the hourly quota for everyone.
 */

/**
 * Bumped by hand, because it means "when did this text last change" — not
 * "when was it served". A build-time `new Date()` would rewrite it on every
 * unrelated deploy and quietly make the claim meaningless.
 */
const LAST_UPDATED = "2026-09-19";

export const dynamic = "force-static";

function body(): string {
  const tools = SUITE.map(
    (tool) => `## ${tool.name}\n\n${tool.line}\n\n${SITE_URL}${tool.href}\n`,
  ).join("\n");

  return `# Capytools

Capytools is a suite of ${SUITE.length} small, single-purpose web tools. Each one does
one job and finishes it: stripping metadata from a photo, generating a QR code
that proves it scans, counting and pricing LLM tokens, building a favicon pack,
turning an image into pixel art, composing a colour palette or a social card.
Every browser tool computes entirely in your own tab — there is no account, no
cookie banner, nothing uploaded and nothing stored. The one documented
exception is CapyExpense, a desktop app that writes only to your own disk.
Free and open source under Apache-2.0.

## Home

The full suite, the house rules it keeps, and how each tool works.

${SITE_URL}

${tools}
## All Tools

Every tool in the suite on one page, one line each, with a search.

${SITE_URL}/tools

## Notes

Release notes and one line on every tool.

${SITE_URL}/notes

## Design

The design system: tokens, type scale and the motion contract.

${SITE_URL}/design

## License

Apache-2.0, in full.

${SITE_URL}/license

## Source

https://github.com/unfoldingdimensions/Capytools

Last updated: ${LAST_UPDATED}.
`;
}

export function GET(): Response {
  return new Response(body(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
