import type { WorkbookMeta } from "./migrate";
import { defaultMeta, metaRowsFor } from "./migrate";
import type { ColumnSpec } from "./schema";
import { COLUMNS, DEFAULT_LISTS, SHEET, columnLetter } from "./schema";
import type { Lists } from "./types";

/**
 * A declarative description of the workbook, with no exceljs anywhere in it.
 *
 * The writer is then a dumb translator of this plan, and everything worth
 * getting wrong — column order, validation ranges, which cells are the user's
 * and which are ours — is testable in node with zero dependencies.
 *
 * THE WORKBOOK IS: twelve month sheets, a Lists sheet, and `_meta`. No rollup
 * or ALL DATA tab. A derived sheet can only be as fresh as the last time the
 * app wrote to the file, so it would sit stale behind whatever the user last
 * typed in Excel — the same silent-wrong-data trap as exporting the wrong CSV
 * sheet. The flat export is generated on demand instead (see `csv.ts`).
 */

export interface NewWorkbookOptions {
  year: number;
  currency: string;
  weekStart: 0 | 1;
  lists?: Partial<Lists>;
  appVersion?: string;
  createdAt?: string;
}

/** A dropdown, always pointing at a range on the Lists sheet — never inline. */
export interface ValidationPlan {
  /** Column letter on the month sheet, e.g. "C". */
  column: string;
  /** Absolute range including the sheet name, e.g. `Lists!$A$2:$A$201`. */
  listRange: string;
  /**
   * Whether a value outside the list is rejected. Always false: a dropdown that
   * blocks a category the user has not added yet turns a helpful affordance into
   * an argument, and the reader accepts free text anyway.
   */
  strict: boolean;
}

export interface HeaderCell {
  header: string;
  /** Shown as a cell note on the header — req 4, what goes in this column. */
  hint: string;
  /** False means the app fills this in; the writer tints and locks it. */
  entry: boolean;
  width: number;
}

export interface SheetPlan {
  name: string;
  kind: "month" | "lists" | "meta";
  headers: HeaderCell[];
  /** Rows written at creation. Month sheets start empty. */
  rows: (string | number | null)[][];
  /** `A2` on month sheets, so the header stays visible while scrolling. */
  freeze: string | null;
  validations: ValidationPlan[];
  /** Column letter carrying a formula, and the formula for a given row. */
  formulas: { column: string; formula: (row: number) => string }[];
  hidden: boolean;
}

/**
 * How many rows per month sheet get a dropdown and a serial formula wired up.
 *
 * 1000 is far past any personal ledger — five entries a day is 150 a month —
 * and the number is a real cost: it is multiplied by twelve sheets, and every
 * one of those cells is a formula in the file.
 */
export const VALIDATION_ROWS = 1000;

/** How many list entries a Lists column reserves, so added values still bind. */
const LIST_CAPACITY = 200;

/**
 * The Lists sheet, one column per validated vocabulary.
 *
 * The closed vocabularies (Type, Kind, Need or Want, Repeats) live here too,
 * not as inline validation formulas, because LibreOffice is lossy with inline
 * literal lists (tdf#94393) and would silently drop the dropdown for every
 * non-Excel user. Range-backed validations survive everywhere.
 */
export interface ListsColumn {
  spec: ColumnSpec;
  header: string;
  values: string[];
  letter: string;
  range: string;
}

export function listsColumns(lists: Lists): ListsColumn[] {
  const validated = COLUMNS.filter((c) => c.options || c.listKey);
  return validated.map((spec, i) => {
    const letter = columnLetter(i);
    return {
      spec,
      header: spec.header,
      values: spec.listKey ? [...lists[spec.listKey]] : [...(spec.options ?? [])],
      letter,
      // Rows 2..N — row 1 is the heading. Absolute so inserting rows on a month
      // sheet cannot drag the reference off the list.
      range: `${SHEET.lists}!$${letter}$2:$${letter}$${LIST_CAPACITY + 1}`,
    };
  });
}

export function mergeLists(over: Partial<Lists> | undefined): Lists {
  return {
    categories: over?.categories ?? DEFAULT_LISTS.categories,
    paymentMethods: over?.paymentMethods ?? DEFAULT_LISTS.paymentMethods,
    accounts: over?.accounts ?? DEFAULT_LISTS.accounts,
  };
}

function monthSheet(name: string, cols: ListsColumn[]): SheetPlan {
  return {
    name,
    kind: "month",
    headers: COLUMNS.map((c) => ({
      header: c.header,
      hint: c.hint,
      entry: c.entry,
      width: c.width,
    })),
    rows: [],
    freeze: "A2",
    validations: cols.map((lc) => ({
      column: columnLetter(COLUMNS.findIndex((c) => c.key === lc.spec.key)),
      listRange: lc.range,
      strict: false,
    })),
    formulas: COLUMNS.flatMap((c, i) =>
      c.formula ? [{ column: columnLetter(i), formula: c.formula }] : [],
    ),
    hidden: false,
  };
}

export function workbookPlan(opts: NewWorkbookOptions): SheetPlan[] {
  const lists = mergeLists(opts.lists);
  const cols = listsColumns(lists);

  const meta: WorkbookMeta = defaultMeta({
    currency: opts.currency,
    weekStart: opts.weekStart,
    year: opts.year,
    ...(opts.appVersion ? { appVersion: opts.appVersion } : {}),
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  });

  const height = Math.max(...cols.map((c) => c.values.length), 0);
  const listRows = Array.from({ length: height }, (_, r) =>
    cols.map((c) => c.values[r] ?? null),
  );

  return [
    ...SHEET.months.map((m) => monthSheet(m, cols)),
    {
      name: SHEET.lists,
      kind: "lists",
      headers: cols.map((c) => ({
        header: c.header,
        hint: `add your own below — the dropdowns read this column`,
        entry: true,
        width: 20,
      })),
      rows: listRows,
      freeze: "A2",
      validations: [],
      formulas: [],
      hidden: false,
    },
    {
      name: SHEET.meta,
      kind: "meta",
      headers: [
        { header: "KEY", hint: "written by CapyExpense — leave it alone", entry: false, width: 20 },
        { header: "VALUE", hint: "written by CapyExpense — leave it alone", entry: false, width: 30 },
      ],
      // metaRowsFor emits its own heading row, which `headers` already covers.
      rows: metaRowsFor(meta).slice(1),
      freeze: null,
      validations: [],
      formulas: [],
      // Hidden, not protected: it is the user's file and they are allowed to
      // look. Hiding only keeps it out of the way of the twelve sheets they use.
      hidden: true,
    },
  ];
}

export function workbookFileName(year: number): string {
  return `CapyExpense-${year}.xlsx`;
}

/** Which sheet a date belongs on. Month sheets are named Jan..Dec. */
export function sheetForDate(date: string): string {
  return SHEET.months[Number(date.slice(5, 7)) - 1];
}
