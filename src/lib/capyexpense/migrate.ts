import type { ColumnSpec, HeaderMap } from "./schema";
import { COLUMNS, SCHEMA_VERSION } from "./schema";

/**
 * The `_meta` sheet, and the forward-migration machinery schema rule 5 needs.
 *
 * `_meta` is a plain two-column key/value sheet. Not JSON in a cell, not a
 * hidden defined name: a user who opens it should be able to read it, and a
 * future version of this app that has never heard of a key should be able to
 * carry it forward untouched.
 */

export interface WorkbookMeta {
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  currency: string;
  weekStart: 0 | 1;
  year: number | null;
  /** Old Mac workbooks count days from 1904. Read from the file, never guessed. */
  epoch1904: boolean;
  /** Keys written by a newer CapyExpense. Preserved verbatim (rule 5). */
  unknown: Record<string, string>;
}

const KEYS = {
  schemaVersion: "SCHEMA_VERSION",
  appVersion: "APP_VERSION",
  createdAt: "CREATED_AT",
  currency: "CURRENCY",
  weekStart: "WEEK_START",
  year: "YEAR",
  epoch1904: "EPOCH_1904",
} as const;

const KNOWN = new Set<string>(Object.values(KEYS));

export function defaultMeta(over: Partial<WorkbookMeta> = {}): WorkbookMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: "0.1.0",
    createdAt: new Date().toISOString(),
    currency: "GBP",
    weekStart: 1,
    year: null,
    epoch1904: false,
    unknown: {},
    ...over,
  };
}

/**
 * Read `_meta`. Never throws and never refuses: a missing sheet, a missing key,
 * or a value in the wrong shape all fall back to a documented default, because
 * the alternative is a workbook that will not open over a metadata typo.
 */
export function readMeta(rows: readonly (readonly unknown[])[], fileName: string): WorkbookMeta {
  const raw = new Map<string, string>();
  for (const row of rows) {
    const key = String(row?.[0] ?? "").trim().toUpperCase();
    if (!key) continue;
    raw.set(key, String(row?.[1] ?? "").trim());
  }

  const num = (key: string, fallback: number | null): number | null => {
    const v = Number(raw.get(key));
    return Number.isFinite(v) ? v : fallback;
  };

  const unknown: Record<string, string> = {};
  for (const [k, v] of raw) if (!KNOWN.has(k)) unknown[k] = v;

  return {
    schemaVersion: num(KEYS.schemaVersion, SCHEMA_VERSION) ?? SCHEMA_VERSION,
    appVersion: raw.get(KEYS.appVersion) || "unknown",
    createdAt: raw.get(KEYS.createdAt) || "",
    currency: raw.get(KEYS.currency) || "GBP",
    weekStart: num(KEYS.weekStart, 1) === 0 ? 0 : 1,
    year: num(KEYS.year, parseWorkbookYear(fileName)),
    epoch1904: /^(1|true|yes)$/i.test(raw.get(KEYS.epoch1904) ?? ""),
    unknown,
  };
}

/** Rows to write back, unknown keys included so rule 5 survives a round-trip. */
export function metaRowsFor(meta: WorkbookMeta): string[][] {
  return [
    ["KEY", "VALUE"],
    [KEYS.schemaVersion, String(meta.schemaVersion)],
    [KEYS.appVersion, meta.appVersion],
    [KEYS.createdAt, meta.createdAt],
    [KEYS.currency, meta.currency],
    [KEYS.weekStart, String(meta.weekStart)],
    [KEYS.year, meta.year === null ? "" : String(meta.year)],
    [KEYS.epoch1904, meta.epoch1904 ? "1" : "0"],
    ...Object.entries(meta.unknown).map(([k, v]) => [k, v]),
  ];
}

export type Compatibility = "current" | "older" | "newer";

export function compatibility(meta: WorkbookMeta): Compatibility {
  if (meta.schemaVersion < SCHEMA_VERSION) return "older";
  if (meta.schemaVersion > SCHEMA_VERSION) return "newer";
  return "current";
}

/** Year from `CapyExpense-2026.xlsx`, or null when the name says nothing. */
export function parseWorkbookYear(fileName: string): number | null {
  const m = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/.exec(fileName);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2200 ? y : null;
}

/**
 * A migration rewrites one normalised row from one schema version to the next.
 *
 * There are none yet — v1 is the first version — and that is the point of
 * having the seam now rather than later. When a v2 column arrives, it gets a
 * function here and the reader keeps opening v1 files without anyone having to
 * remember why.
 *
 * Migrations run IN MEMORY, over already-normalised rows, and never against the
 * file (rule 6).
 */
export type RowMigration = (row: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, RowMigration> = {};

export function migrationPlan(from: number, to: number = SCHEMA_VERSION): RowMigration[] {
  const steps: RowMigration[] = [];
  for (let v = from; v < to; v++) {
    const step = MIGRATIONS[v];
    if (step) steps.push(step);
  }
  return steps;
}

export function applyMigrations(
  row: Record<string, unknown>,
  from: number,
  to: number = SCHEMA_VERSION,
): Record<string, unknown> {
  return migrationPlan(from, to).reduce((acc, step) => step(acc), row);
}

/**
 * Columns this build knows about that the file does not physically carry.
 *
 * These are NOT applied on read — the reader defaults them in memory (rule 4).
 * This is only what an explicit "upgrade this workbook" action would append,
 * shown to the user before they agree to it.
 */
export function pendingColumns(map: HeaderMap, meta: WorkbookMeta): ColumnSpec[] {
  if (compatibility(meta) === "newer") return [];
  return COLUMNS.filter((c) => map.byKey[c.key] === undefined);
}
