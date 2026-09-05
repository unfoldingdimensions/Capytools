import type { Lists } from "@/lib/capyexpense/types";

/**
 * Preferences, in localStorage.
 *
 * Versioned like `src/lib/capytools/cache.ts`: a blob written by an older build
 * would otherwise be read back missing fields the dashboard now requires. On a
 * version mismatch we treat prefs as absent and re-onboard — five screens is a
 * cheaper recovery than a half-migrated object.
 */
export interface Prefs {
  v: 1;
  name: string;
  currency: string;
  weekStart: 0 | 1;
  locale: string;
  /** Absolute path to the folder holding the workbooks. */
  folder: string | null;
  onboardedAt: string;
}

const KEY = "capyexpense:prefs:v1";

export function defaultPrefs(): Prefs {
  return {
    v: 1,
    name: "",
    currency: "GBP",
    weekStart: 1,
    locale: "en-GB",
    folder: null,
    onboardedAt: "",
  };
}

export function readPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Prefs>;
    if (p.v !== 1) return null;
    // Field-by-field, so a hand-edited or truncated blob cannot produce a
    // dashboard that renders "undefined" at people.
    return {
      v: 1,
      name: typeof p.name === "string" ? p.name : "",
      currency: typeof p.currency === "string" && p.currency ? p.currency : "GBP",
      weekStart: p.weekStart === 0 ? 0 : 1,
      locale: typeof p.locale === "string" && p.locale ? p.locale : "en-GB",
      folder: typeof p.folder === "string" && p.folder ? p.folder : null,
      onboardedAt: typeof p.onboardedAt === "string" ? p.onboardedAt : "",
    };
  } catch {
    return null;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* quota or disabled storage — the session still works, it just will not persist */
  }
}

export const CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD", "INR", "JPY", "SGD", "ZAR"] as const;

/** Lists the app offers before a workbook has been read. */
export type StarterLists = Partial<Lists>;
