import { fromExcelSerial, isIsoDate } from "./dates";
import type { HeaderMap } from "./schema";
import { COLUMNS, defaultFor } from "./schema";
import type {
  Interval,
  IsoDate,
  Lists,
  LoadProblem,
  NeedWant,
  Transaction,
  TxKind,
  TxType,
} from "./types";

/**
 * Turning whatever is actually in the cells into `Transaction`s.
 *
 * NOTHING IN THIS FILE THROWS. A workbook is a human artefact: it will contain
 * a date typed as text, an amount with a currency symbol glued on, a row someone
 * started and abandoned. A tracker that refuses to open because of one bad cell
 * is a tracker people stop opening, so every failure degrades to a `LoadProblem`
 * carrying the Excel row number and the other rows still load.
 */

export interface RawRow {
  sheet: string;
  /** Excel's own 1-based row number, so a problem is findable in ten seconds. */
  row: number;
  cells: readonly unknown[];
}

export interface NormalizeContext {
  file: string;
  map: HeaderMap;
  currency: string;
  /** Old Mac workbooks count days from 1904 instead of 1900. */
  epoch1904?: boolean;
}

/**
 * A date cell, from any of the shapes a spreadsheet might hand us.
 *
 * Deliberately REJECTS slash-separated dates. "05/09/2026" is the 5th of
 * September to most of the world and the 9th of May to the US, and there is no
 * way to tell from the string which one the user meant. Guessing silently files
 * transactions into the wrong month for half our users; refusing tells them.
 */
export function coerceDate(v: unknown, epoch1904 = false): IsoDate | null {
  if (v == null || v === "") return null;

  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof v === "number") return fromExcelSerial(v, epoch1904);

  const s = String(v).trim();
  if (!s) return null;

  // ISO, with or without a time part hanging off it.
  const head = s.slice(0, 10);
  if (isIsoDate(head)) return head;

  // Unambiguous because the year leads: 2026/09/05.
  const slashed = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(s);
  if (slashed) {
    const iso = `${slashed[1]}-${slashed[2].padStart(2, "0")}-${slashed[3].padStart(2, "0")}`;
    return isIsoDate(iso) ? iso : null;
  }

  // A serial that arrived as text.
  if (/^\d+(\.\d+)?$/.test(s)) return fromExcelSerial(Number(s), epoch1904);

  return null;
}

const CURRENCY_JUNK = /[^\d.,()\-+]/g;

/**
 * An amount, from a number or from the many ways a human types money.
 *
 * The separator problem is real: "1.234,56" is European for one thousand two
 * hundred and thirty four point five six, while "1,234.56" is the same number in
 * English. When both separators appear, whichever comes LAST is the decimal
 * point — that rule is unambiguous and covers both conventions without needing
 * to know the user's locale.
 */
export function coerceAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  let s = String(v).trim();
  if (!s) return null;

  // Accountants write negatives in brackets.
  const bracketed = /^\((.*)\)$/.exec(s);
  if (bracketed) s = `-${bracketed[1]}`;

  s = s.replace(CURRENCY_JUNK, "");
  if (!s || s === "-" || s === "+") return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // A single comma with one or two digits after it is a decimal point;
    // anything else is a thousands separator.
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.split(",").join("");
  } else if ((s.match(/\./g)?.length ?? 0) > 1) {
    // "1.234.567" can only be grouping.
    s = s.split(".").join("");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Spellings we accept for each closed vocabulary, beyond the canonical value. */
const SYNONYMS: Record<string, Record<string, string>> = {
  type: {
    "one time": "one-time",
    onetime: "one-time",
    once: "one-time",
    single: "one-time",
    "one off": "one-time",
    oneoff: "one-time",
    no: "one-time",
    sub: "subscription",
    subs: "subscription",
    recurring: "subscription",
    repeat: "subscription",
    yes: "subscription",
  },
  kind: {
    spend: "expense",
    debit: "expense",
    out: "expense",
    purchase: "expense",
    return: "refund",
    returned: "refund",
    refunded: "refund",
    credit: "refund",
    reimbursement: "refund",
    in: "income",
    salary: "income",
    earning: "income",
    earnings: "income",
    deposit: "income",
  },
  needWant: {
    essential: "need",
    essentials: "need",
    fixed: "need",
    necessary: "need",
    discretionary: "want",
    "non essential": "want",
    nonessential: "want",
    optional: "want",
    luxury: "want",
  },
  interval: {
    week: "weekly",
    w: "weekly",
    "every week": "weekly",
    biweekly: "fortnightly",
    "bi weekly": "fortnightly",
    fortnight: "fortnightly",
    "every 2 weeks": "fortnightly",
    month: "monthly",
    m: "monthly",
    "every month": "monthly",
    pm: "monthly",
    quarter: "quarterly",
    q: "quarterly",
    "every 3 months": "quarterly",
    year: "yearly",
    y: "yearly",
    annual: "yearly",
    annually: "yearly",
    pa: "yearly",
  },
};

function coerceEnum(columnKey: string, v: unknown, options: readonly string[]): string | null {
  if (v == null) return null;
  const raw = String(v).trim().toLowerCase();
  if (!raw) return null;
  if (options.includes(raw)) return raw;
  const mapped = SYNONYMS[columnKey]?.[raw.replace(/[-_]+/g, " ").replace(/\s+/g, " ")];
  return mapped && options.includes(mapped) ? mapped : null;
}

const optionsFor = (key: string) => COLUMNS.find((c) => c.key === key)?.options ?? [];

/**
 * A row can load AND still be worth commenting on — the negative-amount case
 * produces a usable transaction plus a warning — so `problems` rides along on
 * the success branch too. `skip` marks a blank row, which is not a problem at
 * all and must not be reported as one.
 */
export type RowResult =
  | { ok: true; tx: Transaction; problems: LoadProblem[] }
  | { ok: false; skip: boolean; problems: LoadProblem[] };

/** A row where every cell we care about is empty — someone pressed enter twice. */
function isBlank(raw: RawRow, map: HeaderMap): boolean {
  const watched = ["date", "amount", "category", "note"];
  return watched.every((k) => {
    const i = map.byKey[k];
    if (i === undefined) return true;
    const cell = raw.cells[i];
    return cell == null || String(cell).trim() === "";
  });
}

export function toTransaction(raw: RawRow, ctx: NormalizeContext): RowResult {
  const { map, file, currency } = ctx;
  const at = (key: string): unknown => {
    const i = map.byKey[key];
    return i === undefined ? undefined : raw.cells[i];
  };
  const problem = (message: string, column?: string, level: "warn" | "error" = "warn"): LoadProblem => ({
    level,
    file,
    sheet: raw.sheet,
    row: raw.row,
    column,
    message,
  });

  if (isBlank(raw, map)) return { ok: false, skip: true, problems: [] };


  const problems: LoadProblem[] = [];

  const date = coerceDate(at("date"), ctx.epoch1904);
  if (!date) {
    const shown = String(at("date") ?? "").trim();
    return {
      ok: false,
      skip: false,
      problems: [
        problem(
          shown
            ? `couldn't read "${shown}" as a date — write it as 2026-09-05`
            : "no date, so this row was left out",
          "Date",
        ),
      ],
    };
  }

  const rawAmount = coerceAmount(at("amount"));
  if (rawAmount === null) {
    const shown = String(at("amount") ?? "").trim();
    return {
      ok: false,
      skip: false,
      problems: [
        problem(
          shown ? `couldn't read "${shown}" as a number` : "no amount, so this row was left out",
          "Amount",
        ),
      ],
    };
  }

  const type = (coerceEnum("type", at("type"), optionsFor("type")) as TxType | null) ?? "one-time";

  let kind = coerceEnum("kind", at("kind"), optionsFor("kind")) as TxKind | null;
  let amount = rawAmount;

  if (amount < 0) {
    // People type negatives for money coming back. Honour the intent, but say so
    // once — a silent sign flip is how a total quietly goes wrong.
    amount = Math.abs(amount);
    if (!kind) {
      kind = "refund";
      problems.push(problem(`a negative amount was read as a refund of ${amount}`, "Amount"));
    }
  }
  if (!kind) kind = defaultFor("kind", { type }) as TxKind;

  const interval =
    (coerceEnum("interval", at("interval"), optionsFor("interval")) as Interval | null) ??
    (defaultFor("interval", { type }) as Interval | null);

  const needWant = coerceEnum("needWant", at("needWant"), optionsFor("needWant")) as NeedWant;

  const text = (key: string): string => String(at(key) ?? "").trim();
  const optionalText = (key: string): string | null => text(key) || null;

  // Schema rule 3: keep what we did not recognise.
  const extra: Record<string, string> = {};
  for (const u of map.unknown) {
    const value = String(raw.cells[u.index] ?? "").trim();
    if (value) extra[u.header] = value;
  }

  return {
    ok: true,
    problems,
    tx: {
      id: `${file}#${raw.sheet}#${raw.row}`,
      date,
      category: text("category") || "uncategorised",
      type,
      kind,
      amount,
      note: text("note"),
      paymentMethod: optionalText("paymentMethod"),
      account: optionalText("account"),
      needWant,
      interval: type === "subscription" ? interval : null,
      currency,
      source: { file, sheet: raw.sheet, row: raw.row },
      extra,
    },
  };
}

export interface NormalizeResult {
  transactions: Transaction[];
  problems: LoadProblem[];
}

export function normalizeRows(raws: readonly RawRow[], ctx: NormalizeContext): NormalizeResult {
  const transactions: Transaction[] = [];
  const problems: LoadProblem[] = [];

  // A sheet with no Date or Amount column is not a sheet we can read at all.
  // Say so once, for the file, rather than once per row.
  for (const key of ["date", "amount"] as const) {
    if (ctx.map.byKey[key] === undefined) {
      problems.push({
        level: "error",
        file: ctx.file,
        column: COLUMNS.find((c) => c.key === key)?.header,
        message: `couldn't find a ${key} column, so nothing could be read from this file`,
      });
      return { transactions, problems };
    }
  }

  for (const raw of raws) {
    const result = toTransaction(raw, ctx);
    if (result.ok) transactions.push(result.tx);
    problems.push(...result.problems);
  }

  return { transactions, problems };
}

/** Chronological, with a stable tiebreak so a re-read never reshuffles rows. */
export function sortTransactions(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Dropdown values, widened by whatever the user actually typed. A category
 * invented in the sheet should appear in the list next time without anyone
 * having to maintain it.
 */
export function collectLists(txs: readonly Transaction[], declared: Lists): Lists {
  const merge = (base: readonly string[], found: (string | null)[]): string[] => {
    const seen = new Map<string, string>();
    for (const v of [...base, ...found]) {
      const s = (v ?? "").trim();
      if (s) seen.set(s.toLowerCase(), s);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  };

  return {
    categories: merge(declared.categories, txs.map((t) => t.category)),
    paymentMethods: merge(declared.paymentMethods, txs.map((t) => t.paymentMethod)),
    accounts: merge(declared.accounts, txs.map((t) => t.account)),
  };
}
