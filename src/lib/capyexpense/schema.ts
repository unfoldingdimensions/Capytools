import type { Lists, Transaction } from "./types";

/**
 * The workbook schema, and the rules that keep old files readable forever.
 *
 * THE CONTRACT (requirement 3 — "updates must be progressive and never break
 * previous versions"). These are not conventions; rules 1-3 are enforced by
 * `tests/capyexpense-schema.test.ts`:
 *
 *   1. Columns are identified by HEADER STRING, never by index. A user who drags
 *      a column left breaks nothing.
 *   2. APPEND-ONLY. New columns go to the right of the last existing one. A
 *      header is never renamed, removed, or repurposed. If a label must change
 *      for humans, the old string moves into `aliases` — and `aliases` is itself
 *      append-only.
 *   3. Unknown columns are PRESERVED verbatim into `Transaction.extra`, so a
 *      column the user added themselves survives a round-trip.
 *   4. Missing columns are DEFAULTED, never fatal (see `defaultFor`).
 *   5. A file from a NEWER CapyExpense is still read, in compatibility mode with
 *      a banner. Never refuse, never rewrite.
 *   6. Reading never writes. The app touches the user's workbook only on an
 *      explicit append or upgrade, and always after a snapshot.
 *
 * Rules 1-5 make an old file readable. Rule 6 is what stops a readable old file
 * from becoming a broken new one.
 */
export const SCHEMA_VERSION = 1;

export type ColumnKind = "serial" | "date" | "text" | "money" | "enum";

export interface ColumnSpec {
  /** Stable internal key. Never changes, even if `header` someday does. */
  key: string;
  /** The exact string written into row 1. Append-only; see rule 2. */
  header: string;
  /**
   * Other header strings that mean this column, normalised on comparison.
   * Append-only. Covers renames, common user spellings, and exports from people
   * who built their own sheet before finding this tool.
   */
  aliases: readonly string[];
  /** Schema version that introduced the column. Drives "upgrade" diffing. */
  since: number;
  required: boolean;
  kind: ColumnKind;
  width: number;
  /** Fixed dropdown values. Mutually exclusive with `listKey`. */
  options?: readonly string[];
  /** Dropdown sourced from the Lists sheet, so the user can extend it. */
  listKey?: keyof Lists;
  /** Auto-filled columns supply a formula and are locked in the sheet. */
  formula?: (rowNumber: number) => string;
  /** `false` means the app fills this in — the user should not type here (req 4). */
  entry: boolean;
  /** One line under the header saying what goes in the column (req 4). */
  hint: string;
}

/**
 * v1 columns, in sheet order. ANYTHING ADDED LATER GOES AT THE BOTTOM OF THIS
 * ARRAY with `since: 2` (or higher) — never inserted, never reordered.
 */
export const COLUMNS: readonly ColumnSpec[] = [
  {
    key: "serial",
    header: "#",
    aliases: ["no", "s no", "sr no", "serial", "serial number", "sl no", "index"],
    since: 1,
    required: false,
    kind: "serial",
    width: 6,
    entry: false,
    hint: "counts itself — leave it alone",
    // Anchored on the Date column: a row is "real" once it has a date.
    formula: (row) => `IF(B${row}="","",ROW()-1)`,
  },
  {
    key: "date",
    header: "Date",
    aliases: ["day", "when", "transaction date", "date of expense", "posted"],
    since: 1,
    required: true,
    kind: "date",
    width: 13,
    entry: true,
    hint: "the day it happened",
  },
  {
    key: "category",
    header: "Category",
    aliases: ["cat", "categories", "bucket", "group"],
    since: 1,
    required: true,
    kind: "text",
    width: 18,
    listKey: "categories",
    entry: true,
    hint: "what it was for",
  },
  {
    key: "type",
    header: "Type",
    aliases: ["one time or subscription", "onetime or subscription", "recurring", "frequency type"],
    since: 1,
    required: true,
    kind: "enum",
    width: 14,
    options: ["one-time", "subscription"],
    entry: true,
    hint: "one-time, or subscription",
  },
  {
    key: "amount",
    header: "Amount",
    aliases: ["value", "cost", "price", "spend", "total", "amt", "debit"],
    since: 1,
    required: true,
    kind: "money",
    width: 12,
    entry: true,
    hint: "just the number — no currency symbol",
  },
  {
    key: "note",
    header: "Note",
    aliases: ["notes", "description", "detail", "details", "memo", "comment", "remarks", "additional note"],
    since: 1,
    required: false,
    kind: "text",
    width: 30,
    entry: true,
    hint: "for you, not for the charts",
  },
  {
    key: "paymentMethod",
    header: "Payment Method",
    aliases: ["payment", "paid with", "method", "pay method", "mode", "payment mode"],
    since: 1,
    required: false,
    kind: "text",
    width: 16,
    listKey: "paymentMethods",
    entry: true,
    hint: "cash, card, upi, bank",
  },
  {
    key: "account",
    header: "Account",
    aliases: ["card", "bank", "source", "wallet", "from account"],
    since: 1,
    required: false,
    kind: "text",
    width: 16,
    listKey: "accounts",
    entry: true,
    hint: "which card or account it left",
  },
  {
    key: "needWant",
    header: "Need or Want",
    aliases: ["need want", "needwant", "essential", "essential or discretionary", "discretionary", "want or need"],
    since: 1,
    required: false,
    kind: "enum",
    width: 14,
    options: ["need", "want"],
    entry: true,
    hint: "blank is fine — fill it in when you care",
  },
  {
    key: "kind",
    header: "Kind",
    aliases: ["direction", "expense or refund", "in or out", "flow", "record kind"],
    since: 1,
    required: false,
    kind: "enum",
    width: 12,
    options: ["expense", "refund", "income"],
    entry: true,
    hint: "blank means expense",
  },
  {
    key: "interval",
    header: "Repeats",
    aliases: ["cadence", "every", "interval", "repeat", "how often", "billing cycle", "recurrence"],
    since: 1,
    required: false,
    kind: "enum",
    width: 14,
    options: ["weekly", "fortnightly", "monthly", "quarterly", "yearly"],
    entry: true,
    hint: "only for subscriptions",
  },
];

export const SHEET = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  lists: "Lists",
  meta: "_meta",
} as const;

/**
 * Provisional starter taxonomy. Deliberately short — a 40-item dropdown is a
 * dropdown nobody scrolls, and the Lists sheet is user-editable anyway.
 * TODO: reground against YNAB / Monarch / BLS Consumer Expenditure Survey once
 * research prompt 5 lands.
 */
export const DEFAULT_LISTS: Lists = {
  categories: [
    "groceries",
    "eating out",
    "transport",
    "rent",
    "utilities",
    "phone & internet",
    "health",
    "fitness",
    "shopping",
    "entertainment",
    "subscriptions",
    "travel",
    "gifts",
    "education",
    "fees & charges",
    "other",
  ],
  paymentMethods: ["cash", "debit card", "credit card", "upi", "bank transfer", "other"],
  accounts: [],
};

/** 0-based column index to its Excel letter. 0 -> A, 25 -> Z, 26 -> AA. */
export function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

const PUNCTUATION = /[.,/()[\]{}:;'"‘’“”\-_*]+/g;

/**
 * Fold a header cell down to something comparable: lowercase, no punctuation,
 * single-spaced. "Payment  Method:" and "payment method" must match, because the
 * alternative is a user losing a column to a stray colon.
 */
export function normalizeHeader(raw: unknown): string {
  const lowered = String(raw ?? "")
    .toLowerCase()
    .trim();
  const stripped = lowered.replace(PUNCTUATION, " ").replace(/\s+/g, " ").trim();
  // "#" strips to nothing. Fall back to the bare lowercase so the serial column
  // cannot collide with a genuinely blank header cell.
  return stripped || lowered;
}

export interface HeaderMap {
  /** Column key -> 0-based index in the row. Absent when the column is missing. */
  byKey: Record<string, number>;
  /** Headers we do not know. Preserved into `Transaction.extra` (rule 3). */
  unknown: { index: number; header: string }[];
  /** Known column keys the file does not carry. Defaulted, not fatal (rule 4). */
  missing: string[];
}

/** Every normalised string that resolves to a given column. */
function matchersFor(spec: ColumnSpec): string[] {
  return [spec.header, ...spec.aliases].map(normalizeHeader).filter(Boolean);
}

/**
 * Map a workbook's header row onto our column keys by string, never by position
 * (rule 1). First match wins, so a file carrying both "Note" and "Notes" binds
 * the leftmost and the other falls through to `unknown` rather than silently
 * overwriting it.
 */
export function mapHeaders(headerRow: readonly unknown[]): HeaderMap {
  const lookup = new Map<string, string>();
  for (const spec of COLUMNS) {
    for (const m of matchersFor(spec)) {
      if (!lookup.has(m)) lookup.set(m, spec.key);
    }
  }

  const byKey: Record<string, number> = {};
  const unknown: { index: number; header: string }[] = [];

  headerRow.forEach((cell, index) => {
    const raw = String(cell ?? "").trim();
    if (!raw) return;
    const key = lookup.get(normalizeHeader(raw));
    if (key && !(key in byKey)) byKey[key] = index;
    else unknown.push({ index, header: raw });
  });

  const missing = COLUMNS.filter((c) => !(c.key in byKey)).map((c) => c.key);
  return { byKey, unknown, missing };
}

/**
 * What a column becomes when the file does not carry it (rule 4). Every one of
 * these is a documented, boring default — that is the whole point. `interval` is
 * the only context-sensitive one: a subscription with no stated cadence is
 * overwhelmingly monthly, and guessing monthly beats dropping it from the
 * commitment total entirely.
 */
export function defaultFor(key: string, row: Partial<Transaction>): unknown {
  switch (key) {
    case "kind":
      return "expense";
    case "interval":
      return row.type === "subscription" ? "monthly" : null;
    case "note":
      return "";
    case "needWant":
    case "paymentMethod":
    case "account":
    case "serial":
      return null;
    default:
      return null;
  }
}
