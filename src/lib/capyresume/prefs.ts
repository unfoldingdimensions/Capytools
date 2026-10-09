/**
 * CapyResume — small persisted UI preferences.
 *
 * Paper size is a preference rather than document data: putting it in
 * `ResumeData` would mean bumping `RESUME_SCHEMA_VERSION`, which orphans every
 * stored résumé. It is persisted here instead — the same treatment as the
 * theme — so a reload does not silently change the paper the user's next
 * export is printed on.
 *
 * The store itself is the shared `createPaperSizePref`
 * (`src/lib/capytools/paper-size-pref.ts`), which CapyInvoice binds under its
 * own key; this file is the CapyResume binding.
 */

import { PAPER_SIZE_KEY } from './keys';
import { createPaperSizePref } from '../capytools/paper-size-pref';

export type { PaperSize } from '../capytools/paper-size-pref';
export { PAPER_SIZES, DEFAULT_PAPER_SIZE } from '../capytools/paper-size-pref';

const pref = createPaperSizePref(PAPER_SIZE_KEY);

/** Anything unrecognised degrades to the default rather than throwing. */
export const getPaperSize = pref.get;
export const getPaperSizeServerSnapshot = pref.getServerSnapshot;
export const subscribe = pref.subscribe;
export const setPaperSize = pref.set;

/** React binding. The server render sees the default; the client then swaps in the stored value. */
export const usePaperSize = pref.use;

/** Test-only: forget the in-process cache without touching storage. */
export const __resetPrefsCache = pref.__resetCacheForTests;
