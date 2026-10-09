/**
 * CapyResume — the store.
 *
 * The résumé is persisted in the user's own browser. There is no server, no
 * account and no upload: `localStorage` is the database, and a JSON export is
 * the user's escape hatch (see ./json.ts).
 *
 * The machinery — referentially-stable snapshots for `useSyncExternalStore`,
 * the versioned key, storage refusal keeping the draft alive in memory — lives
 * in the shared `createDocStore` (`src/lib/capytools/doc-store.ts`), which
 * CapyInvoice's draft and business profile bind too. This file is the
 * CapyResume binding: the version stamp and the resume-named exports.
 */

import { RESUME_SCHEMA_VERSION, type ResumeDoc } from './types';
import { emptyResume, migrate } from './schema';
import { RESUME_STORAGE_KEY } from './keys';
import { createDocStore } from '../capytools/doc-store';

export { StorageUnavailableError } from '@/lib/capytools/doc-store';

/**
 * Re-exported so existing callers keep working. The canonical definition lives
 * in `./keys.ts`, which is React-free on purpose — the legal pages quote this
 * key name and are server components. See that file for why.
 */
export const STORAGE_KEY = RESUME_STORAGE_KEY;

const store = createDocStore<ResumeDoc>({
  key: RESUME_STORAGE_KEY,
  empty: emptyResume,
  migrate,
  stamp: (doc) => ({ ...doc, version: RESUME_SCHEMA_VERSION }),
});

/** True when this browser already holds a résumé. */
export const hasStoredResume = store.hasStored;

/** See the shared module for the save/clear contract. */
export const saveResume = store.save;
export const clearResume = store.clear;
export const getSnapshot = store.getSnapshot;
export const getServerSnapshot = store.getServerSnapshot;
export const subscribe = store.subscribe;

/**
 * Replace the stored résumé with `doc` and return it. Used by JSON import.
 * Identical to `saveResume` but named for intent at the call site.
 */
export const replaceResume = store.save;

/** React binding. Server renders see an empty résumé; the client hydrates from storage. */
export const useResume = store.use;

/** React binding with a caller-supplied server snapshot (a module-level constant). */
export const useResumeWithServerSnapshot = store.useWithServerSnapshot;

/** Test-only: forget the in-process cache without touching storage. */
export const __resetStoreCache = store.__resetCacheForTests;
