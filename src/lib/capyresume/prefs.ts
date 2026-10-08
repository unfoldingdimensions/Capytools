/**
 * CapyResume — small persisted UI preferences.
 *
 * Paper size is a preference rather than document data: putting it in
 * `ResumeData` would mean bumping `RESUME_SCHEMA_VERSION`, which orphans every
 * stored résumé (see docs/decisions.md). It is persisted here instead — the same
 * treatment as the theme — so a reload does not silently change the paper the
 * user's next export is printed on.
 *
 * Same two invariants as ./store.ts: a referentially-stable snapshot, and a
 * versioned key, because React's `useSyncExternalStore` compares snapshots with
 * `Object.is` and a fresh value per call is an infinite render loop.
 */

import { useSyncExternalStore } from 'react';
import { PAPER_SIZE_KEY } from './keys';

export type PaperSize = 'A4' | 'LETTER';

export const PAPER_SIZES: readonly PaperSize[] = ['A4', 'LETTER'];
export const DEFAULT_PAPER_SIZE: PaperSize = 'A4';

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedValue: PaperSize | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isPaperSize(value: unknown): value is PaperSize {
  return value === 'A4' || value === 'LETTER';
}

function readRaw(): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(PAPER_SIZE_KEY);
  } catch {
    return null;
  }
}

/** Anything unrecognised degrades to the default rather than throwing. */
export function getPaperSize(): PaperSize {
  const raw = readRaw();
  if (raw === cachedRaw && cachedValue !== null) return cachedValue;
  cachedRaw = raw;
  cachedValue = isPaperSize(raw) ? raw : DEFAULT_PAPER_SIZE;
  return cachedValue;
}

export function getPaperSizeServerSnapshot(): PaperSize {
  return DEFAULT_PAPER_SIZE;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (!hasWindow()) return () => listeners.delete(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== PAPER_SIZE_KEY) return;
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

export function setPaperSize(next: PaperSize): void {
  const value = isPaperSize(next) ? next : DEFAULT_PAPER_SIZE;

  if (hasWindow()) {
    try {
      window.localStorage.setItem(PAPER_SIZE_KEY, value);
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

/** React binding. The server render sees the default; the client then swaps in the stored value. */
export function usePaperSize(): PaperSize {
  return useSyncExternalStore(subscribe, getPaperSize, getPaperSizeServerSnapshot);
}

/** Test-only: forget the in-process cache without touching storage. */
export function __resetPrefsCache(): void {
  cachedRaw = null;
  cachedValue = null;
}
