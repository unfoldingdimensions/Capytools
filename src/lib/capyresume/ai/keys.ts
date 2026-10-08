/**
 * CapyResume — BYOK credential storage.
 *
 * The user's own API key, kept in their own browser. It is never sent to us:
 * there is no CapyResume server in the request path at all, the tool calls the
 * provider directly from the tab (see ./client.ts). That is what makes the
 * privacy claim on /privacy a description of the code rather than a promise.
 *
 * Trade-off, stated plainly because it is the user's secret: a value in
 * `localStorage` is readable by any script running on this origin. That is
 * acceptable here only because the app ships no third-party scripts and the key
 * belongs to the person typing it — but it is why removal is one obvious button
 * and why nothing else in the app ever reads this entry.
 *
 * Same two invariants as the résumé store (see ../store.ts):
 *   1. referentially-stable snapshots (React compares with `Object.is`), and
 *   2. a versioned key, so a shape change cannot read a stale entry back.
 */

import { useSyncExternalStore } from 'react';
import { DEFAULT_PROVIDER_ID, getProvider, type AiProviderId } from './providers';
import { AI_SETTINGS_KEY } from '../keys';

/**
 * Re-exported for existing callers; the canonical definition is in `../keys.ts`
 * so the cookie policy (a server component) can cite it. See that file.
 */
export { AI_SETTINGS_KEY };

export interface AiSettings {
  providerId: AiProviderId;
  apiKey: string;
  model: string;
  /** Only meaningful for the `openai-compatible` provider. */
  baseUrl: string;
}

/** Frozen so the reference is stable across renders and server/client agree. */
export const EMPTY_AI_SETTINGS: AiSettings = Object.freeze({
  providerId: DEFAULT_PROVIDER_ID,
  apiKey: '',
  model: '',
  baseUrl: '',
});

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedSettings: AiSettings | null = null;

/**
 * What the user last chose when storage refused to record it. Without this, a
 * failed save or remove fell back to re-reading storage — which still held the
 * OLD key, so a replaced key came back and a removed one kept being used.
 */
let memorySettings: AiSettings | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRaw(): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(AI_SETTINGS_KEY);
  } catch {
    return null;
  }
}

/**
 * Coerce anything we find into a valid settings object. The entry is
 * user-editable and versioned separately from the résumé, so it is treated as
 * untrusted input: a corrupt or hand-edited blob degrades to "no key set"
 * rather than breaking the tool.
 */
function coerce(raw: string | null): AiSettings {
  if (raw === null) return EMPTY_AI_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_AI_SETTINGS;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return EMPTY_AI_SETTINGS;
  }

  const record = parsed as Record<string, unknown>;
  const providerId = typeof record.providerId === 'string' ? record.providerId : '';
  const known = getProvider(providerId);

  return {
    providerId: known ? known.id : DEFAULT_PROVIDER_ID,
    apiKey: typeof record.apiKey === 'string' ? record.apiKey.trim() : '',
    model: typeof record.model === 'string' ? record.model.trim() : '',
    baseUrl: typeof record.baseUrl === 'string' ? record.baseUrl.trim() : '',
  };
}

/** Cached against the raw string so repeat calls in a render return one reference. */
export function getAiSettings(): AiSettings {
  if (memorySettings !== null) return memorySettings;
  const raw = readRaw();
  if (raw === cachedRaw && cachedSettings !== null) return cachedSettings;
  cachedRaw = raw;
  cachedSettings = coerce(raw);
  return cachedSettings;
}

/** SSR / hydration sees "no key", which is also the truth for a first visit. */
export function getAiServerSnapshot(): AiSettings {
  return EMPTY_AI_SETTINGS;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (!hasWindow()) return () => listeners.delete(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== AI_SETTINGS_KEY) return;
    cachedRaw = null;
    cachedSettings = null;
    listener();
  };

  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Persist settings. Never throws: a failed save must not break the editor. */
export function saveAiSettings(next: AiSettings): AiSettings {
  const clean: AiSettings = {
    providerId: next.providerId,
    apiKey: next.apiKey.trim(),
    model: next.model.trim(),
    baseUrl: next.baseUrl.trim(),
  };

  const raw = JSON.stringify(clean);

  if (hasWindow()) {
    try {
      window.localStorage.setItem(AI_SETTINGS_KEY, raw);
      memorySettings = null;
      cachedRaw = raw;
      cachedSettings = clean;
    } catch {
      // Storage disabled or full — keep the in-memory value so the session still
      // works; it will not survive a reload.
      memorySettings = clean;
    }
  } else {
    memorySettings = clean;
  }

  emit();
  return clean;
}

/** Forget the key entirely. The user must be able to do this in one action. */
export function clearAiSettings(): void {
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(AI_SETTINGS_KEY);
      memorySettings = null;
    } catch {
      // The stored key could not be deleted: still stop using it this session.
      memorySettings = EMPTY_AI_SETTINGS;
    }
  }
  cachedRaw = null;
  cachedSettings = null;
  emit();
}

/** React binding. */
export function useAiSettings(): AiSettings {
  return useSyncExternalStore(subscribe, getAiSettings, getAiServerSnapshot);
}

/**
 * Show a key without revealing it: enough to tell two keys apart in a list,
 * not enough to be worth leaking. Never render the raw value.
 */
export function maskApiKey(apiKey: string): string {
  const key = apiKey.trim();
  if (key.length === 0) return '';
  if (key.length <= 8) return '•'.repeat(key.length);
  return `${key.slice(0, 3)}…${'•'.repeat(6)}${key.slice(-4)}`;
}

/** Test-only: forget the in-process cache without touching storage. */
export function __resetAiCache(): void {
  memorySettings = null;
  cachedRaw = null;
  cachedSettings = null;
}
