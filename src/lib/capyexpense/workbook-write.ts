import ExcelJS from "exceljs";
import type { WorkbookMeta } from "./migrate";
import { metaRowsFor } from "./migrate";
import type { NewWorkbookOptions, SheetPlan } from "./workbook-plan";
import { VALIDATION_ROWS, sheetForDate, workbookPlan } from "./workbook-plan";
import { COLUMNS, SHEET, columnLetter } from "./schema";
import type { NewTransaction } from "./types";

/**
 * Writing workbooks. One of only two files that touch exceljs.
 *
 * NOTE FOR THE DESKTOP BUILD: import `exceljs` by its bare name here and let
 * Vite alias it to `exceljs/dist/es5/exceljs.browser.js`. Rollup cannot parse
 * the default minified browser bundle (exceljs#2093, still open), and the es5
 * build needs no Node polyfills on WebView2, which is evergreen Chromium.
 * See `docs/research/capyexpense/research-brief.md` §3.
 */

/** Header tints. Sage means "you type here"; stone means "the app fills this". */
const FILL_ENTRY = "FFE3EAE0";
const FILL_AUTO = "FFE0DED8";

type Sheet = ExcelJS.Worksheet;

/**
 * exceljs applies data validation to a RANGE at runtime but only types the
 * per-cell form. The per-cell form would mean roughly 84,000 assignments for a
 * fresh workbook — 1000 rows x 7 dropdowns x 12 sheets — and a file bloated to
 * match, where the range form writes one entry per column per sheet. Verified
 * present on exceljs 4.4.0; the narrow accessor keeps the cast in one place.
 */
type RangeValidations = { add(range: string, rule: ExcelJS.DataValidation): void };
const validationsOf = (ws: Sheet): RangeValidations =>
  (ws as unknown as { dataValidations: RangeValidations }).dataValidations;

function applyHeaders(ws: Sheet, plan: SheetPlan): void {
  const row = ws.getRow(1);
  plan.headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    cell.value = h.header;
    cell.font = { bold: true, size: 11 };
    cell.alignment = { vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: h.entry ? FILL_ENTRY : FILL_AUTO },
    };
    // Requirement 4 — say what the column is for, and whether it is theirs to
    // type in, without spending a row of the grid on it. A hint ROW would be
    // read back as a data row with an unparseable date, and would generate a
    // problem on every sheet, every load.
    cell.note = h.entry ? h.hint : `${h.hint}\n(filled in by CapyExpense)`;
    ws.getColumn(i + 1).width = h.width;
  });
  row.height = 20;
  row.commit();
}

function applyRows(ws: Sheet, plan: SheetPlan): void {
  plan.rows.forEach((cells, r) => {
    const row = ws.getRow(r + 2);
    cells.forEach((v, c) => {
      if (v !== null && v !== undefined) row.getCell(c + 1).value = v;
    });
    row.commit();
  });
}

function applyValidationsAndFormulas(ws: Sheet, plan: SheetPlan): void {
  for (const v of plan.validations) {
    validationsOf(ws).add(`${v.column}2:${v.column}${VALIDATION_ROWS + 1}`, {
      type: "list",
      allowBlank: true,
      formulae: [v.listRange],
      // Never reject a value that is not on the list. A dropdown that argues
      // with the user turns an affordance into an obstacle, and the reader
      // accepts free text regardless.
      showErrorMessage: false,
    });
  }

  for (const f of plan.formulas) {
    for (let r = 2; r <= VALIDATION_ROWS + 1; r++) {
      ws.getCell(`${f.column}${r}`).value = { formula: f.formula(r) };
    }
  }
}

function buildSheet(wb: ExcelJS.Workbook, plan: SheetPlan): void {
  const ws = wb.addWorksheet(plan.name, {
    state: plan.hidden ? "hidden" : "visible",
    views: plan.freeze ? [{ state: "frozen", ySplit: 1 }] : undefined,
  });
  applyHeaders(ws, plan);
  applyRows(ws, plan);
  applyValidationsAndFormulas(ws, plan);
}

export async function generateWorkbook(opts: NewWorkbookOptions): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CapyExpense";
  wb.created = opts.createdAt ? new Date(opts.createdAt) : new Date();

  for (const plan of workbookPlan(opts)) buildSheet(wb, plan);

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

/**
 * Append rows to the month sheets they belong on.
 *
 * APPEND-ONLY, deliberately. A full read-modify-write round-trip through exceljs
 * can drop features it does not model — a chart, a pivot table, conditional
 * formatting the user added themselves. Touching only the first empty row of one
 * sheet keeps the blast radius to the cells we actually wrote. The caller takes
 * a `pre-write` snapshot first regardless (schema rule 6).
 */
export async function appendRows(
  bytes: Uint8Array,
  rows: readonly NewTransaction[],
  meta: WorkbookMeta,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);

  const indexOf = (key: string) => COLUMNS.findIndex((c) => c.key === key) + 1;

  for (const tx of rows) {
    const ws = wb.getWorksheet(sheetForDate(tx.date));
    if (!ws) continue;

    // First row whose Date cell is empty. The serial column is pre-filled with
    // formulas, so "last row with any value" would land a thousand rows down.
    const dateCol = indexOf("date");
    let target = 2;
    while (target < VALIDATION_ROWS + 1) {
      const v = ws.getCell(target, dateCol).value;
      if (v === null || v === undefined || v === "") break;
      target++;
    }

    const row = ws.getRow(target);
    const set = (key: string, value: string | number | null) => {
      if (value === null || value === "") return;
      row.getCell(indexOf(key)).value = value;
    };

    set("date", tx.date);
    set("category", tx.category);
    set("type", tx.type);
    set("amount", tx.amount);
    set("note", tx.note);
    set("paymentMethod", tx.paymentMethod);
    set("account", tx.account);
    set("needWant", tx.needWant);
    set("kind", tx.kind);
    set("interval", tx.type === "subscription" ? tx.interval : null);
    row.commit();
  }

  const metaSheet = wb.getWorksheet(SHEET.meta);
  if (metaSheet) {
    metaRowsFor(meta)
      .slice(1)
      .forEach((cells, r) => {
        const row = metaSheet.getRow(r + 2);
        cells.forEach((v, c) => {
          row.getCell(c + 1).value = v;
        });
        row.commit();
      });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

/**
 * Physically append columns this build knows about but the file lacks.
 *
 * Only ever called from an explicit user action, never on read (schema rule 6),
 * and the caller snapshots first. Existing data is untouched: the new headers
 * land to the right of whatever is already there, which is exactly what the
 * append-only rule buys us.
 */
export async function upgradeWorkbook(bytes: Uint8Array, meta: WorkbookMeta): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);

  for (const name of SHEET.months) {
    const ws = wb.getWorksheet(name);
    if (!ws) continue;

    const header = ws.getRow(1);
    const present = new Set<string>();
    header.eachCell({ includeEmpty: false }, (cell) => {
      present.add(String(cell.value ?? "").trim().toLowerCase());
    });

    let next = (header.cellCount || 0) + 1;
    for (const spec of COLUMNS) {
      if (present.has(spec.header.toLowerCase())) continue;
      const cell = header.getCell(next);
      cell.value = spec.header;
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: spec.entry ? FILL_ENTRY : FILL_AUTO },
      };
      cell.note = spec.hint;
      ws.getColumn(next).width = spec.width;
      if (spec.options || spec.listKey) {
        const letter = columnLetter(next - 1);
        validationsOf(ws).add(`${letter}2:${letter}${VALIDATION_ROWS + 1}`, {
          type: "list",
          allowBlank: true,
          formulae: [`${SHEET.lists}!$${letter}$2:$${letter}$201`],
          showErrorMessage: false,
        });
      }
      next++;
    }
    header.commit();
  }

  const metaSheet = wb.getWorksheet(SHEET.meta);
  if (metaSheet) {
    metaRowsFor(meta)
      .slice(1)
      .forEach((cells, r) => {
        const row = metaSheet.getRow(r + 2);
        cells.forEach((v, c) => {
          row.getCell(c + 1).value = v;
        });
        row.commit();
      });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
