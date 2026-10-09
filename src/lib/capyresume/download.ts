/**
 * CapyResume — browser download helpers.
 *
 * Moved to the shared module (`src/lib/download.ts`) so CapyInvoice reuses
 * them rather than carrying a second copy; this re-export keeps every
 * CapyResume import path and test unchanged. The only place in the library
 * that touches the DOM, and only to hand a Blob to the user's browser.
 * Nothing here uploads anything.
 */

export { downloadBlob, downloadText, readFileAsText } from '../download';
