/**
 * The A4 / US Letter paper-size preference, as a factory.
 *
 * Lifted from CapyResume's prefs module so CapyInvoice persists its own paper
 * choice under its own key rather than either sharing one preference (wrong:
 * the two documents are printed independently) or hand-rolling a second copy
 * of the store. Same two invariants as `createDocStore`: a referentially-
 * stable snapshot, and a versioned key, because React's
 * `useSyncExternalStore` compares snapshots with `Object.is` and a fresh
 * value per call is an infinite render loop.
 */

import { useSyncExternalStore } from 'react';

export type PaperSize = 'A4' | 'LETTER';

export const PAPER_SIZES: readonly PaperSize[] = ['A4', 'LETTER'];
export const DEFAULT_PAPER_SIZE: PaperSize = 'A4';

export interface PaperSizePref {
  readonly key: string;
  /** Anything unrecognised degrades to the default rather than throwing. */
  get(): PaperSize;
  getServerSnapshot(): PaperSize;
  subscribe(listener: () => void): () => void;
  set(next: PaperSize): void;
  /** React binding. The server render sees the default; the client swaps in the stored value. */
  use(): PaperSize;
  /** Test-only: forget the in-process cache without touching storage. */
  __resetCacheForTests(): void;
}

export function createPaperSizePref(key: string, defaultSize: PaperSize = DEFAULT_PAPER_SIZE): PaperSizePref {
  const listeners = new Set<() => void>();

  let cachedRaw: string | null = null;
  let cachedValue: PaperSize | null = null;

  function hasWindow(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  function isPaperSize(value: unknown): value is PaperSize {
    return PAPER_SIZES.includes(value as PaperSize);
  }

  function readRaw(): string | null {
    if (!hasWindow()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function get(): PaperSize {
    const raw = readRaw();
    if (raw === cachedRaw && cachedValue !== null) return cachedValue;
    cachedRaw = raw;
    cachedValue = isPaperSize(raw) ? raw : defaultSize;
    return cachedValue;
  }

  function getServerSnapshot(): PaperSize {
    return defaultSize;
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    if (!hasWindow()) return () => listeners.delete(listener);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== key) return;
      cachedRaw = null;
      cachedValue = null;
      listener();
    };

    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  function set(next: PaperSize): void {
    const value = isPaperSize(next) ? next : defaultSize;

    if (hasWindow()) {
      try {
        window.localStorage.setItem(key, value);
        cachedRaw = value;
        cachedValue = value;
      } catch {
        // Storage unavailable: keep the value for this session so the editor still
        // behaves, and let it reset on reload rather than failing the interaction.
        cachedRaw = null;
        cachedValue = value;
      }
    } else {
      cachedRaw = null;
      cachedValue = value;
    }

    emit();
  }

  function use(): PaperSize {
    return useSyncExternalStore(subscribe, get, getServerSnapshot);
  }

  function __resetCacheForTests(): void {
    cachedRaw = null;
    cachedValue = null;
  }

  return { key, get, getServerSnapshot, subscribe, set, use, __resetCacheForTests };
}
