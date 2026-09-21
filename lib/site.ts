/**
 * CapyResume — product identity, in one place.
 *
 * The legal pages have to name the product, its licence and a contact channel.
 * Those facts are duplicated across three pages and are exactly the things that
 * go stale on a rename, so they live here and the pages import them.
 */

export const SITE = {
  name: 'CapyResume',
  tagline: "a CV that's actually yours. made in your tab.",
  /** Source of truth for the code. Also the contact channel — it is an open-source project. */
  repo: 'https://github.com/unfoldingdimensions/Handcraftresume',
  issues: 'https://github.com/unfoldingdimensions/Handcraftresume/issues',
  license: 'Apache-2.0',
  licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  /** Shown as "Last updated" on every legal page. Bump when the text changes. */
  legalUpdated: 'September 21, 2026',
} as const;
