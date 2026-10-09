/**
 * CapyInvoice — the draft store.
 *
 * The draft is persisted in the user's own browser via the shared
 * `createDocStore` (`src/lib/capytools/doc-store.ts`): no server, no account,
 * no upload. A JSON export is the user's escape hatch (see ./json.ts).
 */

import { INVOICE_SCHEMA_VERSION, type InvoiceDoc } from './types';
import { emptyInvoiceDoc, migrate } from './schema';
import { INVOICE_DOC_KEY } from './keys';
import { createDocStore } from '../capytools/doc-store';

export { StorageUnavailableError } from '@/lib/capytools/doc-store';

/** The storage key, namespaced by schema version. */
export const STORAGE_KEY = INVOICE_DOC_KEY;

const store = createDocStore<InvoiceDoc>({
  key: INVOICE_DOC_KEY,
  empty: emptyInvoiceDoc,
  migrate,
  stamp: (doc) => ({ ...doc, version: INVOICE_SCHEMA_VERSION }),
});

export const hasStoredInvoice = store.hasStored;
export const saveInvoice = store.save;
export const clearInvoice = store.clear;
export const getSnapshot = store.getSnapshot;
export const getServerSnapshot = store.getServerSnapshot;
export const subscribe = store.subscribe;
/** React binding. Server renders see an empty draft; the client hydrates from storage. */
export const useInvoice = store.use;
/** React binding with a caller-supplied server snapshot (a module-level constant). */
export const useInvoiceWithServerSnapshot = store.useWithServerSnapshot;
export const __resetStoreCache = store.__resetCacheForTests;
