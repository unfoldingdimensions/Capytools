import ExcelJS from "exceljs";
import type { Compatibility, WorkbookMeta } from "./migrate";
import { compatibility, readMeta } from "./migrate";
import type { RawRow } from "./normalize";
import { collectLists, normalizeRows, sortTransactions } from "./normalize";
import type { HeaderMap } from "./schema";
import { COLUMNS, SHEET, mapHeaders } from "./schema";
import { listsColumns } from "./workbook-plan";
import { DEFAULT_LISTS } from "./schema";
import type { Lists, LoadProblem, Transaction } from "./types";

/**
 * Reading workbooks. The other of the two files that touch exceljs.
 *
 * READING NEVER WRITES (schema rule 6). Nothing in here mutates the workbook,
 * normalises it in place, or "helpfully" repairs anything. A file that opens is
 * a file that is left exactly as it was found.
 *
 * See the import note in `workbook-write.ts` about the Vite alias.
 */

/**
 * exceljs hands back whatever the cell actually holds — which is eight different
 * shapes. Flatten to something the coercers understand.
 */
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    // A formula cell: we want what it evaluated to, not the expression.
    if ("result" in o) return cellValue(o.result as ExcelJS.CellValue);
    if ("richText" in o) {
      return (o.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if ("text" in o) return o.text;
    // { error: '#REF!' } and anything else unrecognised reads as empty rather
    // than as the string "[object Object]".
    return null;
  }
  return v;
}

function rowCells(row: ExcelJS.Row, width: number): unknown[] {
  const out: unknown[] = [];
  for (let c = 1; c <= width; c++) out.push(cellValue(row.getCell(c).value));
  return out;
}

/** Widest of the header row and the sheet's own column count. */
function sheetWidth(ws: ExcelJS.Worksheet): number {
  const header = ws.getRow(1);
  return Math.max(header.cellCount || 0, ws.columnCount || 0, COLUMNS.length);
}

export interface WorkbookRead {
  meta: WorkbookMeta;
  compat: Compatibility;
  map: HeaderMap;
  transactions: Transaction[];
  lists: Lists;
  problems: LoadProblem[];
  /** Month sheets actually found, in workbook order. */
  sheets: string[];
}

export async function readWorkbook(bytes: Uint8Array, fileName: string): Promise<WorkbookRead> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);

  const metaSheet = wb.getWorksheet(SHEET.meta);
  const metaRows: unknown[][] = [];
  if (metaSheet) {
    metaSheet.eachRow({ includeEmpty: false }, (row) => {
      metaRows.push([cellValue(row.getCell(1).value), cellValue(row.getCell(2).value)]);
    });
  }
  const meta = readMeta(metaRows, fileName);

  const problems: LoadProblem[] = [];
  const transactions: Transaction[] = [];
  const sheets: string[] = [];
  let map: HeaderMap = { byKey: {}, unknown: [], missing: COLUMNS.map((c) => c.key) };

  for (const name of SHEET.months) {
    const ws = wb.getWorksheet(name);
    if (!ws) continue;
    sheets.push(name);

    const width = sheetWidth(ws);
    const header = rowCells(ws.getRow(1), width);
    const sheetMap = mapHeaders(header);
    // Every month sheet in one workbook shares a shape; keep the first that
    // actually resolved something, for reporting pending upgrades.
    if (Object.keys(map.byKey).length === 0) map = sheetMap;

    const raws: RawRow[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      raws.push({ sheet: name, row: rowNumber, cells: rowCells(row, width) });
    });

    const result = normalizeRows(raws, {
      file: fileName,
      map: sheetMap,
      currency: meta.currency,
      epoch1904: meta.epoch1904,
    });
    transactions.push(...result.transactions);
    problems.push(...result.problems.map((p) => ({ ...p, sheet: p.sheet ?? name })));
  }

  if (sheets.length === 0) {
    problems.push({
      level: "error",
      file: fileName,
      message:
        "couldn't find any month sheets — this workbook doesn't look like a CapyExpense one",
    });
  }

  return {
    meta,
    compat: compatibility(meta),
    map,
    transactions: sortTransactions(transactions),
    lists: collectLists(transactions, readListsSheet(wb)),
    problems,
    sheets,
  };
}

/**
 * The Lists sheet, read back by column heading rather than by position, so a
 * user who reordered it still gets their own values in the dropdowns.
 */
function readListsSheet(wb: ExcelJS.Workbook): Lists {
  const ws = wb.getWorksheet(SHEET.lists);
  if (!ws) return DEFAULT_LISTS;

  const cols = listsColumns(DEFAULT_LISTS);
  const width = Math.max(ws.columnCount || 0, cols.length);
  const header = rowCells(ws.getRow(1), width).map((h) => String(h ?? "").trim().toLowerCase());

  const read = (heading: string): string[] => {
    const index = header.indexOf(heading.toLowerCase());
    if (index < 0) return [];
    const out: string[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const v = String(cellValue(row.getCell(index + 1).value) ?? "").trim();
      if (v) out.push(v);
    });
    return out;
  };

  const byKey = (key: string): string[] => {
    const spec = cols.find((c) => c.spec.key === key);
    return spec ? read(spec.header) : [];
  };

  const categories = byKey("category");
  const paymentMethods = byKey("paymentMethod");
  const accounts = byKey("account");

  return {
    categories: categories.length ? categories : DEFAULT_LISTS.categories,
    paymentMethods: paymentMethods.length ? paymentMethods : DEFAULT_LISTS.paymentMethods,
    accounts,
  };
}
