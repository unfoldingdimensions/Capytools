/**
 * CapyResume — the store.
 *
 * The résumé is persisted in the user's own browser. There is no server, no
 * account and no upload: `localStorage` is the database, and a JSON export is
 * the user's escape hatch (see ./json.ts).
 *
 * Two invariants this module exists to protect:
 *
 * 1. **Referentially-stable snapshots.** `getSnapshot()` must return the *same
 *    object* when the underlying bytes have not changed. React's
 *    `useSyncExternalStore` compares snapshots with `Object.is`, so returning a
 *    fresh parse on every call throws "The result of getSnapshot should be
 *    cached" and then loops forever. We cache on the raw string.
 * 2. **A versioned key.** The key carries the schema version, so a future shape
 *    change can never read a stale entry back as if it were current.
 */

import { useSyncExternalStore } from 'react';
import { RESUME_SCHEMA_VERSION, type ResumeDoc } from './types';
import { emptyResume, migrate } from './schema';

export const STORAGE_KEY = `capyresume.resume.v${RESUME_SCHEMA_VERSION}`;

/** Thrown when the browser refuses to persist (disabled storage, quota). */
export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'StorageUnavailableError';
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

const listeners = new Set<() => void>();

/** The frozen doc a server render sees. Module-level so the reference is stable. */
const SERVER_SNAPSHOT: ResumeDoc = Object.freeze(emptyResume()) as ResumeDoc;

let cachedRaw: string | null = null;
let cachedDoc: ResumeDoc | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Raw read. Returns null when storage is missing or throws (private mode, quota). */
function readRaw(): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The current document. Cached against the raw string so repeated calls inside a
 * render return an identical reference. Never throws.
 */
export function getSnapshot(): ResumeDoc {
  const raw = readRaw();
  if (raw === cachedRaw && cachedDoc !== null) return cachedDoc;
  cachedRaw = raw;
  cachedDoc = migrate(raw);
  return cachedDoc;
}

/** Stable snapshot for SSR / hydration. */
export function getServerSnapshot(): ResumeDoc {
  return SERVER_SNAPSHOT;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Subscribe to changes from this tab (via `saveResume`/`clearResume`) and from
 * other tabs (via the `storage` event). Returns an unsubscribe function.
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (!hasWindow()) return () => listeners.delete(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    // Another tab wrote; drop the cache so the next read re-parses.
    cachedRaw = null;
    cachedDoc = null;
    listener();
  };

  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** True when this browser already holds a résumé. */
export function hasStoredResume(): boolean {
  return readRaw() !== null;
}

/**
 * Persist a document, stamping the current schema version and `updatedAt`.
 * Throws `StorageUnavailableError` so the UI can tell the user their work was
 * not saved — silently dropping a résumé would be the worst possible failure.
 */
export function saveResume(doc: ResumeDoc): ResumeDoc {
  const next: ResumeDoc = {
    ...doc,
    version: RESUME_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  const raw = JSON.stringify(next);

  if (!hasWindow()) {
    throw new StorageUnavailableError(
      'This browser has no local storage, so the résumé cannot be saved.',
    );
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch (cause) {
    throw new StorageUnavailableError(
      'The résumé could not be saved to this browser (storage may be full or disabled).',
      { cause },
    );
  }

  // Keep the cache in step with what we just wrote so the snapshot stays stable.
  cachedRaw = raw;
  cachedDoc = next;
  emit();
  return next;
}

/** Remove the stored résumé. The caller is responsible for offering a JSON backup first. */
export function clearResume(): void {
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing useful to do: the cache reset below still frees the UI.
    }
  }
  cachedRaw = null;
  cachedDoc = null;
  emit();
}

/**
 * Replace the stored résumé with `doc` and return it. Used by JSON import.
 * Identical to `saveResume` but named for intent at the call site.
 */
export function replaceResume(doc: ResumeDoc): ResumeDoc {
  return saveResume(doc);
}

/** React binding. Server renders see an empty résumé; the client hydrates from storage. */
export function useResume(): ResumeDoc {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Test-only: forget the in-process cache without touching storage. */
export function __resetStoreCache(): void {
  cachedRaw = null;
  cachedDoc = null;
}
