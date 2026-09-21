/**
 * CapyResume — storage key names.
 *
 * Deliberately a **pure module with no React import**. The legal pages are server
 * components that must cite these exact key names, and they cannot import
 * `store.ts` / `ai/keys.ts` because those pull in `useSyncExternalStore` and so
 * demand a `'use client'` boundary. Keeping the names here lets the policy quote
 * the implementation without dragging a hook into a static page — and makes it
 * impossible for the documented key and the written key to drift apart.
 */

import { RESUME_SCHEMA_VERSION } from './types';

/** Namespaced by schema version: a shape change must never read a stale entry. */
export const RESUME_STORAGE_KEY = `capyresume.resume.v${RESUME_SCHEMA_VERSION}`;

/** The BYOK credential entry (see ./ai/keys.ts). */
export const AI_SETTINGS_KEY = 'capyresume.ai.v1';

/**
 * Owned by `next-themes`, which persists the light/dark choice itself and does
 * not export the name. It is a `localStorage` entry, not a cookie.
 */
export const THEME_STORAGE_KEY = 'theme';

/** The editor's paper-size preference (see ./prefs.ts). */
export const PAPER_SIZE_KEY = 'capyresume.papersize.v1';
