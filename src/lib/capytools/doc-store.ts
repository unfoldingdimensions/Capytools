/**
 * A `localStorage`-backed document store, as a factory.
 *
 * This is the store CapyResume battle-tested (snapshot caching, the versioned
 * key, storage refusal keeping the draft alive), generalized so CapyInvoice's
 * draft and business profile bind it instead of each tool hand-rolling a
 * second copy. CapyResume binds it in `capyresume/store.ts`, and its store
 * tests pin the behaviour here.
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

/** Thrown when the browser refuses to persist (disabled storage, quota). */
export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'StorageUnavailableError';
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export interface DocStore<T> {
  /** The storage key, namespaced by schema version. */
  readonly key: string;
  getSnapshot(): T;
  /** Stable snapshot for SSR / hydration. */
  getServerSnapshot(): T;
  /**
   * Subscribe to changes from this tab (via `save`/`clear`) and from other tabs
   * (via the `storage` event). Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
  /** True when this browser already holds a document. */
  hasStored(): boolean;
  /**
   * Persist a document, stamping `updatedAt`. Throws `StorageUnavailableError`
   * so the UI can tell the user their work was not saved — silently dropping
   * it would be the worst possible failure.
   */
  save(doc: T): T;
  /** Remove the stored document. The caller offers a JSON backup first. */
  clear(): void;
  /** React binding. Server renders see the empty document; the client hydrates. */
  use(): T;
  /**
   * React binding with a caller-supplied server snapshot, so the server can
   * render something meaningful (a demo) without a hydration mismatch. Pass a
   * stable reference (a module-level constant).
   */
  useWithServerSnapshot(serverSnapshot: T): T;
  /** Test-only: forget the in-process cache without touching storage. */
  __resetCacheForTests(): void;
}

export function createDocStore<T>(options: {
  key: string;
  empty: () => T;
  migrate: (raw: unknown) => T;
  /**
   * Envelope fields the tool owns, stamped on every write (the schema version,
   * typically). `updatedAt` is stamped here already.
   */
  stamp?: (doc: T) => T;
}): DocStore<T> {
  const { key, empty, migrate, stamp } = options;

  const listeners = new Set<() => void>();

  /** The frozen doc a server render sees. Module scope so the reference is stable. */
  const SERVER_SNAPSHOT: T = Object.freeze(empty());

  let cachedRaw: string | null = null;
  let cachedDoc: T | null = null;

  /**
   * The document while the browser refuses to store it (disabled storage, quota).
   * Without it every keystroke was reverted — the snapshot kept reading storage —
   * so editing was impossible exactly when the user most needs a JSON backup.
   * Set by a failed save, cleared by the next successful one or by clear().
   */
  let memoryDoc: T | null = null;

  function hasWindow(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  /** Raw read. Returns null when storage is missing or throws (private mode, quota). */
  function readRaw(): string | null {
    if (!hasWindow()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function getSnapshot(): T {
    if (memoryDoc !== null) return memoryDoc;
    const raw = readRaw();
    if (raw === cachedRaw && cachedDoc !== null) return cachedDoc;
    cachedRaw = raw;
    cachedDoc = migrate(raw);
    return cachedDoc;
  }

  function getServerSnapshot(): T {
    return SERVER_SNAPSHOT;
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    if (!hasWindow()) return () => listeners.delete(listener);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== key) return;
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

  function save(doc: T): T {
    const next: T = { ...(stamp ? stamp(doc) : doc), updatedAt: new Date().toISOString() } as T;

    const raw = JSON.stringify(next);

    const unsaved = (cause?: unknown) => {
      // Keep editing in memory, and say so: the work is real but lives in this tab only.
      memoryDoc = next;
      emit();
      return new StorageUnavailableError(
        'Not saved — this browser is refusing storage (full or disabled). Your edits stay in this tab only; download a JSON backup before you close it.',
        cause === undefined ? undefined : { cause },
      );
    };

    if (!hasWindow()) throw unsaved();

    try {
      window.localStorage.setItem(key, raw);
    } catch (cause) {
      throw unsaved(cause);
    }

    // Keep the cache in step with what we just wrote so the snapshot stays stable.
    memoryDoc = null;
    cachedRaw = raw;
    cachedDoc = next;
    emit();
    return next;
  }

  function clear(): void {
    if (hasWindow()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Nothing useful to do: the cache reset below still frees the UI.
      }
    }
    memoryDoc = null;
    cachedRaw = null;
    cachedDoc = null;
    emit();
  }

  function use(): T {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  function useWithServerSnapshot(serverSnapshot: T): T {
    return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  }

  function __resetCacheForTests(): void {
    memoryDoc = null;
    cachedRaw = null;
    cachedDoc = null;
  }

  return {
    key,
    getSnapshot,
    getServerSnapshot,
    subscribe,
    hasStored: () => readRaw() !== null,
    save,
    clear,
    use,
    useWithServerSnapshot,
    __resetCacheForTests,
  };
}
