/**
 * CapyInvoice — storage key names.
 *
 * Deliberately a pure module with no React import, matching
 * `capyresume/keys.ts`: the legal copy quotes these names, and key names that
 * drift from the writing are a privacy lie. Namespaced by schema version so a
 * shape change never reads a stale entry back.
 */

import { INVOICE_SCHEMA_VERSION } from './types';

/** The draft the editor persists. */
export const INVOICE_DOC_KEY = `capyinvoice.doc.v${INVOICE_SCHEMA_VERSION}`;

/** The user's own from-block profile, copied into new drafts. */
export const BUSINESS_PROFILE_KEY = `capyinvoice.business.v1`;

/** The editor's paper-size preference. */
export const PAPER_SIZE_KEY = 'capyinvoice.papersize.v1';
