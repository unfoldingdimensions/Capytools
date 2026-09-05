import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, COLUMNS, SHEET } from "../src/lib/capyexpense/schema";
import { metaRowsFor, defaultMeta, pendingColumns } from "../src/lib/capyexpense/migrate";
import { readWorkbook } from "../src/lib/capyexpense/workbook-read";
import { appendRows, generateWorkbook, upgradeWorkbook } from "../src/lib/capyexpense/workbook-write";
import { listsColumns, workbookFileName, sheetForDate } from "../src/lib/capyexpense/workbook-plan";
import { DEFAULT_LISTS } from "../src/lib/capyexpense/schema";
import type { NewTransaction } from "../src/lib/capyexpense/types";

const OPTS = { year: 2026, currency: "GBP", weekStart: 1 as const, createdAt: "2026-01-01T00:00:00.000Z" };

/**
 * A workbook written by hand, standing in for one made by a different (older or
 * newer) CapyExpense. This is the fixture that makes schema rules 3-5 testable:
 * we cannot time-travel, so we forge the artefacts those rules exist to survive.
 */
async function forgeWorkbook(
  headers: string[],
  rows: (string | number | null)[][],
  metaOver: Partial<ReturnType<typeof defaultMeta>> = {},
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  for (const name of SHEET.months) {
    const ws = wb.addWorksheet(name);
    ws.getRow(1).values = headers;
    if (name === "Sep") rows.forEach((r, i) => (ws.getRow(i + 2).values = r));
  }
  const meta = wb.addWorksheet(SHEET.meta);
  metaRowsFor(defaultMeta({ year: 2026, currency: "GBP", ...metaOver })).forEach(
    (r, i) => (meta.getRow(i + 1).values = r),
  );
  return new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

describe("generate -> read round trip", () => {
  it("produces a workbook this build reads back exactly", async () => {
    const bytes = await generateWorkbook(OPTS);
    const read = await readWorkbook(bytes, workbookFileName(2026));

    expect(read.sheets).toEqual([...SHEET.months]);
    expect(read.meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(read.meta.currency).toBe("GBP");
    expect(read.meta.year).toBe(2026);
    expect(read.compat).toBe("current");
    expect(read.transactions).toEqual([]);
    expect(read.problems).toEqual([]);
  });

  it("writes every column, in the canonical order, on every month sheet", async () => {
    const bytes = await generateWorkbook(OPTS);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);

    for (const name of SHEET.months) {
      const header = wb.getWorksheet(name)!.getRow(1);
      const values = COLUMNS.map((_, i) => String(header.getCell(i + 1).value ?? ""));
      expect(values, `sheet ${name}`).toEqual(COLUMNS.map((c) => c.header));
    }
  });

  it("carries the Lists sheet, and hides only _meta", async () => {
    const bytes = await generateWorkbook(OPTS);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);

    expect(wb.getWorksheet(SHEET.lists)!.state).toBe("visible");
    expect(wb.getWorksheet(SHEET.meta)!.state).toBe("hidden");
    expect(wb.getWorksheet("Jan")!.state).toBe("visible");

    // The SHEET keeps the curated order, because that is the order Excel shows
    // in the dropdown. The in-memory list is sorted, because that is the order
    // a search box wants; both are correct and they are not the same thing.
    const listsSheet = wb.getWorksheet(SHEET.lists)!;
    const onSheet = DEFAULT_LISTS.categories.map((_, i) =>
      String(listsSheet.getCell(i + 2, 1).value ?? ""),
    );
    expect(onSheet).toEqual(DEFAULT_LISTS.categories);

    const read = await readWorkbook(bytes, workbookFileName(2026));
    expect([...read.lists.categories].sort()).toEqual([...DEFAULT_LISTS.categories].sort());
    expect([...read.lists.paymentMethods].sort()).toEqual([...DEFAULT_LISTS.paymentMethods].sort());
  });

  it("stays a reasonably sized file", async () => {
    // ~149KB at the time of writing. The dropdowns expand to one validation
    // entry per cell in the stored XML (12 sheets x 1000 rows x 7 columns), which
    // compresses away to nothing — but a change that stops it compressing, or
    // that multiplies the row budget, should show up here rather than in a
    // download.
    const bytes = await generateWorkbook(OPTS);
    expect(bytes.length).toBeLessThan(500 * 1024);
  });

  it("labels every column with a note saying whose it is (req 4)", async () => {
    const bytes = await generateWorkbook(OPTS);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
    const header = wb.getWorksheet("Jan")!.getRow(1);

    COLUMNS.forEach((spec, i) => {
      const cell = header.getCell(i + 1);
      expect(cell.note, spec.header).toBeTruthy();
      expect(cell.fill, spec.header).toBeTruthy();
    });
    // The one column the app owns says so out loud.
    const serial = header.getCell(1);
    expect(JSON.stringify(serial.note)).toContain("filled in by CapyExpense");
  });

  it("auto-numbers rows with a formula rather than typed values", async () => {
    const bytes = await generateWorkbook(OPTS);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
    const cell = wb.getWorksheet("Jan")!.getCell("A2").value as { formula?: string };
    expect(cell.formula).toContain("ROW()-1");
    expect(cell.formula).toContain('B2=""');
  });

  it("backs EVERY dropdown with a Lists range, never an inline literal list", async () => {
    // LibreOffice silently drops inline literal validations (tdf#94393), which
    // would lose the dropdowns for every non-Excel user without erroring once.
    const bytes = await generateWorkbook(OPTS);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
    const model = (wb.getWorksheet("Jan") as unknown as {
      dataValidations: { model: Record<string, { formulae: string[] }> };
    }).dataValidations.model;

    // exceljs takes range-level rules on write but stores them per cell, so the
    // reloaded model has one entry per validated cell. The count is a storage
    // detail; what must hold is that not one of them is an inline literal.
    const entries = Object.values(model);
    expect(entries.length).toBeGreaterThan(0);
    const ranges = new Set(entries.map((r) => r.formulae[0]));
    expect(ranges.size).toBe(listsColumns(DEFAULT_LISTS).length);
    for (const formula of ranges) {
      expect(formula).toContain(`${SHEET.lists}!`);
      expect(formula).not.toMatch(/^"?'?"/);
    }
  });
});

describe("schema rule 4 — a workbook from an OLDER build still opens", () => {
  const legacyHeaders = ["#", "Date", "Category", "Type", "Amount", "Note"];

  it("reads it with no problems and defaults everything it lacks", async () => {
    const bytes = await forgeWorkbook(legacyHeaders, [
      [1, "2026-09-03", "rent", "subscription", 600, "flat"],
      [2, "2026-09-04", "groceries", "one-time", 42.5, "shop"],
    ]);
    const read = await readWorkbook(bytes, "CapyExpense-2026.xlsx");

    expect(read.problems).toEqual([]);
    expect(read.transactions).toHaveLength(2);

    const rent = read.transactions.find((t) => t.category === "rent")!;
    expect(rent.kind).toBe("expense");
    expect(rent.interval).toBe("monthly");
    expect(rent.needWant).toBeNull();
    expect(rent.paymentMethod).toBeNull();
  });

  it("names the columns an explicit upgrade would append", async () => {
    const bytes = await forgeWorkbook(legacyHeaders, []);
    const read = await readWorkbook(bytes, "CapyExpense-2026.xlsx");
    const pending = pendingColumns(read.map, read.meta).map((c) => c.key);
    expect(pending).toEqual(["paymentMethod", "account", "needWant", "kind", "interval"]);
  });

  it("reports an older schema version as older", async () => {
    const bytes = await forgeWorkbook(legacyHeaders, [], { schemaVersion: 0 });
    const read = await readWorkbook(bytes, "CapyExpense-2026.xlsx");
    expect(read.compat).toBe("older");
  });
});

describe("schema rules 3 and 5 — a workbook from a NEWER build still opens", () => {
  it("reads it, flags it as newer, and refuses nothing", async () => {
    const headers = [...COLUMNS.map((c) => c.header), "Mood", "Weather"];
    const row = [1, "2026-09-03", "groceries", "one-time", 20, "shop", "cash", "visa", "need", "expense", "", "grim", "rain"];
    const bytes = await forgeWorkbook(headers, [row], { schemaVersion: SCHEMA_VERSION + 1 });
    const read = await readWorkbook(bytes, "CapyExpense-2026.xlsx");

    expect(read.compat).toBe("newer");
    expect(read.problems).toEqual([]);
    expect(read.transactions).toHaveLength(1);
    // Rule 3: columns we have never heard of survive, verbatim.
    expect(read.transactions[0].extra).toEqual({ Mood: "grim", Weather: "rain" });
  });

  it("never proposes an upgrade to a file newer than this build", async () => {
    const bytes = await forgeWorkbook([...COLUMNS.map((c) => c.header)], [], {
      schemaVersion: SCHEMA_VERSION + 1,
    });
    const read = await readWorkbook(bytes, "CapyExpense-2026.xlsx");
    expect(pendingColumns(read.map, read.meta)).toEqual([]);
  });
});

describe("schema rule 1 — columns dragged around", () => {
  it("reads a workbook whose columns were reordered by hand", async () => {
    const bytes = await forgeWorkbook(
      ["Amount", "Date", "Note", "Category", "Type"],
      [[42.5, "2026-09-03", "lunch", "eating out", "one-time"]],
    );
    const read = await readWorkbook(bytes, "CapyExpense-2026.xlsx");
    expect(read.problems).toEqual([]);
    expect(read.transactions[0].amount).toBe(42.5);
    expect(read.transactions[0].category).toBe("eating out");
  });
});

describe("appendRows", () => {
  const row = (over: Partial<NewTransaction> = {}): NewTransaction => ({
    date: "2026-09-07",
    category: "groceries",
    type: "one-time",
    kind: "expense",
    amount: 31.4,
    note: "market",
    paymentMethod: "cash",
    account: null,
    needWant: "need",
    interval: null,
    ...over,
  });

  it("files a row on the month sheet its date belongs to", async () => {
    const bytes = await generateWorkbook(OPTS);
    const next = await appendRows(bytes, [row()], defaultMeta({ year: 2026 }));
    const read = await readWorkbook(next, workbookFileName(2026));

    expect(read.transactions).toHaveLength(1);
    expect(read.transactions[0].source.sheet).toBe("Sep");
    expect(read.transactions[0].source.row).toBe(2);
    expect(read.transactions[0].amount).toBe(31.4);
    expect(read.transactions[0].needWant).toBe("need");
    expect(read.problems).toEqual([]);
  });

  it("stacks rows rather than overwriting the first one", async () => {
    const bytes = await generateWorkbook(OPTS);
    const next = await appendRows(
      bytes,
      [row({ amount: 1 }), row({ amount: 2 }), row({ amount: 3, date: "2026-03-02" })],
      defaultMeta({ year: 2026 }),
    );
    const read = await readWorkbook(next, workbookFileName(2026));

    expect(read.transactions.map((t) => t.amount).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(read.transactions.filter((t) => t.source.sheet === "Sep")).toHaveLength(2);
    expect(read.transactions.filter((t) => t.source.sheet === "Mar")).toHaveLength(1);
  });

  it("appends after rows a human typed, not on top of them", async () => {
    const forged = await forgeWorkbook([...COLUMNS.map((c) => c.header)], [
      [1, "2026-09-01", "rent", "one-time", 600, "typed by hand", "", "", "", "", ""],
    ]);
    const next = await appendRows(forged, [row({ amount: 9.99 })], defaultMeta({ year: 2026 }));
    const read = await readWorkbook(next, "CapyExpense-2026.xlsx");

    expect(read.transactions).toHaveLength(2);
    expect(read.transactions.find((t) => t.note === "typed by hand")).toBeTruthy();
    expect(read.transactions.find((t) => t.amount === 9.99)!.source.row).toBe(3);
  });

  it("leaves a column the user invented untouched (rule 3)", async () => {
    const headers = [...COLUMNS.map((c) => c.header), "Project Code"];
    const forged = await forgeWorkbook(headers, [
      [1, "2026-09-01", "travel", "one-time", 80, "train", "", "", "", "", "", "ACME-12"],
    ]);
    const next = await appendRows(forged, [row()], defaultMeta({ year: 2026 }));
    const read = await readWorkbook(next, "CapyExpense-2026.xlsx");

    const original = read.transactions.find((t) => t.note === "train")!;
    expect(original.extra).toEqual({ "Project Code": "ACME-12" });
  });

  it("does not write an interval onto a one-off", async () => {
    const bytes = await generateWorkbook(OPTS);
    const next = await appendRows(
      bytes,
      [row({ type: "one-time", interval: "monthly" })],
      defaultMeta({ year: 2026 }),
    );
    const read = await readWorkbook(next, workbookFileName(2026));
    expect(read.transactions[0].interval).toBeNull();
  });
});

describe("upgradeWorkbook", () => {
  it("appends the missing columns to the right, keeping existing data", async () => {
    const forged = await forgeWorkbook(["#", "Date", "Category", "Type", "Amount", "Note"], [
      [1, "2026-09-03", "rent", "subscription", 600, "flat"],
    ]);
    const upgraded = await upgradeWorkbook(forged, defaultMeta({ year: 2026 }));
    const read = await readWorkbook(upgraded, "CapyExpense-2026.xlsx");

    expect(pendingColumns(read.map, read.meta)).toEqual([]);
    expect(read.transactions).toHaveLength(1);
    expect(read.transactions[0].category).toBe("rent");
    expect(read.transactions[0].amount).toBe(600);
    expect(read.problems).toEqual([]);
  });

  it("is a no-op on a workbook that already has everything", async () => {
    const bytes = await generateWorkbook(OPTS);
    const before = await readWorkbook(bytes, workbookFileName(2026));
    const upgraded = await upgradeWorkbook(bytes, before.meta);
    const after = await readWorkbook(upgraded, workbookFileName(2026));
    expect(after.map.byKey).toEqual(before.map.byKey);
  });
});

describe("file naming", () => {
  it("names a workbook by its year, and finds the sheet for a date", () => {
    expect(workbookFileName(2026)).toBe("CapyExpense-2026.xlsx");
    expect(sheetForDate("2026-01-15")).toBe("Jan");
    expect(sheetForDate("2026-09-05")).toBe("Sep");
    expect(sheetForDate("2026-12-31")).toBe("Dec");
  });
});
