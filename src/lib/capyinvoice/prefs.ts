/**
 * CapyInvoice — small persisted UI preferences.
 *
 * Paper size is a preference rather than document data: putting it in
 * `InvoiceDoc` would mean bumping `INVOICE_SCHEMA_VERSION`, which orphans
 * every stored draft. It is persisted here instead, under this tool's own key
 * — an invoice and a résumé print independently.
 */

import { PAPER_SIZE_KEY } from './keys';
import { createPaperSizePref } from '../capytools/paper-size-pref';

export type { PaperSize } from '../capytools/paper-size-pref';
export { PAPER_SIZES, DEFAULT_PAPER_SIZE } from '../capytools/paper-size-pref';

const pref = createPaperSizePref(PAPER_SIZE_KEY);

export const getPaperSize = pref.get;
export const getPaperSizeServerSnapshot = pref.getServerSnapshot;
export const setPaperSize = pref.set;
export const usePaperSize = pref.use;
export const __resetPrefsCache = pref.__resetCacheForTests;
