/**
 * When the site's pages last changed — the one date behind the sitemap's
 * `lastmod`, each tool page's visible "Updated" line and its JSON-LD
 * `dateModified`, so the three can never disagree.
 *
 * Bumped by hand, for the same reason `/llms.txt` bumps its own: it means
 * "when did this page last change", not "when was this served".
 *
 * MEASURED in Search Console. This was `new Date()` evaluated inside the
 * sitemap handler — and the route is dynamic on Workers, so every single fetch
 * of the sitemap stamped every URL as modified at that instant:
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
 *
 * ponytail: one date for every page. A change to one tool's copy bumps them
 * all; give pages their own dates if they start changing on different
 * schedules.
 */
export const CONTENT_UPDATED = "2026-10-09";

/** "9 October 2026" — fixed locale and UTC, so server and client agree. */
export function formatUpdated(date: string = CONTENT_UPDATED): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
