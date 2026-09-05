import { describe, expect, it } from "vitest";
import { csvToRawRows, detectDelimiter, parseCsv, toCsv } from "../src/lib/capyexpense/csv";
import {
  coerceAmount,
  coerceDate,
  collectLists,
  normalizeRows,
  sortTransactions,
  toTransaction,
} from "../src/lib/capyexpense/normalize";
import type { NormalizeContext, RawRow } from "../src/lib/capyexpense/normalize";
import { mapHeaders } from "../src/lib/capyexpense/schema";
import type { Transaction } from "../src/lib/capyexpense/types";

const HEADERS = [
  "#", "Date", "Category", "Type", "Amount", "Note",
  "Payment Method", "Account", "Need or Want", "Kind", "Repeats",
];

const ctx = (headers: string[] = HEADERS): NormalizeContext => ({
  file: "CapyExpense-2026.xlsx",
  map: mapHeaders(headers),
  currency: "GBP",
});

const rawRow = (cells: unknown[], row = 2): RawRow => ({ sheet: "Sep", row, cells });

const load = (cells: unknown[][], headers: string[] = HEADERS) =>
  normalizeRows(cells.map((c, i) => rawRow(c, i + 2)), ctx(headers));

describe("coerceDate", () => {
  it("accepts the shapes a spreadsheet actually produces", () => {
    expect(coerceDate("2026-09-05")).toBe("2026-09-05");
    expect(coerceDate("2026-09-05T00:00:00.000Z")).toBe("2026-09-05");
    expect(coerceDate("2026/09/05")).toBe("2026-09-05");
    expect(coerceDate(new Date(Date.UTC(2026, 8, 5)))).toBe("2026-09-05");
    expect(coerceDate(46266)).toBe("2026-09-01");
    expect(coerceDate("46266")).toBe("2026-09-01");
  });

  it("REFUSES an ambiguous slash date rather than guessing a hemisphere", () => {
    // 05/09/2026 is 5 September to most of the world and 9 May in the US.
    // Guessing silently files half our users' rows in the wrong month.
    expect(coerceDate("05/09/2026")).toBeNull();
    expect(coerceDate("5-9-2026")).toBeNull();
    expect(coerceDate("Sep 5 2026")).toBeNull();
  });

  it("is null for blanks and rubbish", () => {
    expect(coerceDate("")).toBeNull();
    expect(coerceDate(null)).toBeNull();
    expect(coerceDate("   ")).toBeNull();
    expect(coerceDate(new Date("nope"))).toBeNull();
  });
});

describe("coerceAmount", () => {
  it("reads plain numbers", () => {
    expect(coerceAmount(42.1)).toBe(42.1);
    expect(coerceAmount("42.10")).toBe(42.1);
    expect(coerceAmount("  7 ")).toBe(7);
  });

  it("strips currency symbols and spacing", () => {
    expect(coerceAmount("$12.00")).toBe(12);
    expect(coerceAmount("£1,234.56")).toBe(1234.56);
    expect(coerceAmount("₹ 2,500")).toBe(2500);
    expect(coerceAmount("12.00 USD")).toBe(12);
  });

  it("reads European grouping by taking the LAST separator as the decimal point", () => {
    expect(coerceAmount("1.234,56")).toBe(1234.56);
    expect(coerceAmount("1,234.56")).toBe(1234.56);
    expect(coerceAmount("12,50")).toBe(12.5);
    expect(coerceAmount("1.234.567")).toBe(1234567);
    expect(coerceAmount("2,500")).toBe(2500);
  });

  it("reads accountants' brackets as negative", () => {
    expect(coerceAmount("(5.00)")).toBe(-5);
    expect(coerceAmount("-5")).toBe(-5);
  });

  it("is null rather than zero for anything unreadable", () => {
    expect(coerceAmount("")).toBeNull();
    expect(coerceAmount(null)).toBeNull();
    expect(coerceAmount("n/a")).toBeNull();
    expect(coerceAmount("-")).toBeNull();
  });
});

describe("toTransaction", () => {
  const row = (over: unknown[] = []) => {
    const base = [1, "2026-09-03", "groceries", "one-time", 42.1, "weekly shop", "", "", "", "", ""];
    over.forEach((v, i) => {
      if (v !== undefined) base[i] = v as never;
    });
    return rawRow(base);
  };

  it("builds a transaction carrying its Excel row number", () => {
    const r = toTransaction(row(), ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tx.date).toBe("2026-09-03");
    expect(r.tx.amount).toBe(42.1);
    expect(r.tx.kind).toBe("expense");
    expect(r.tx.source).toEqual({ file: "CapyExpense-2026.xlsx", sheet: "Sep", row: 2 });
    expect(r.tx.id).toBe("CapyExpense-2026.xlsx#Sep#2");
    expect(r.problems).toEqual([]);
  });

  it("skips a blank row silently — that is not a problem", () => {
    const r = toTransaction(rawRow(["", "", "", "", "", "", "", "", "", "", ""]), ctx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.skip).toBe(true);
    expect(r.problems).toEqual([]);
  });

  it("rejects an unreadable date, naming the value and the row", () => {
    const r = toTransaction(row([undefined, "05/09/2026"]), ctx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.skip).toBe(false);
    expect(r.problems[0].row).toBe(2);
    expect(r.problems[0].message).toContain("05/09/2026");
    expect(r.problems[0].message).toContain("2026-09-05");
  });

  it("rejects an unreadable amount", () => {
    const r = toTransaction(row([undefined, undefined, undefined, undefined, "n/a"]), ctx());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.problems[0].column).toBe("Amount");
  });

  it("reads a negative amount as a refund, and says so once", () => {
    const r = toTransaction(row([undefined, undefined, undefined, undefined, -20]), ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tx.kind).toBe("refund");
    expect(r.tx.amount).toBe(20);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].level).toBe("warn");
  });

  it("does not second-guess an explicit Kind on a negative amount", () => {
    const cells = row([undefined, undefined, undefined, undefined, -20, undefined, "", "", "", "income"]);
    const r = toTransaction(cells, ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tx.kind).toBe("income");
    expect(r.tx.amount).toBe(20);
    expect(r.problems).toEqual([]);
  });

  it("accepts the words people actually type", () => {
    const cells = row([undefined, undefined, undefined, "Recurring", undefined, undefined, "", "", "Essential", "Credit", "Annually"]);
    const r = toTransaction(cells, ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tx.type).toBe("subscription");
    expect(r.tx.needWant).toBe("need");
    expect(r.tx.kind).toBe("refund");
    expect(r.tx.interval).toBe("yearly");
  });

  it("names a blank category rather than dropping the row", () => {
    const r = toTransaction(row([undefined, undefined, "  "]), ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tx.category).toBe("uncategorised");
  });

  it("only carries an interval for subscriptions", () => {
    const oneOff = toTransaction(row([undefined, undefined, undefined, "one-time", undefined, undefined, "", "", "", "", "monthly"]), ctx());
    expect(oneOff.ok && oneOff.tx.interval).toBeNull();
  });
});

describe("schema rules 3 and 4 over a whole sheet", () => {
  it("defaults every missing optional column without a single problem (rule 4)", () => {
    // A workbook written before Kind, Repeats and Need or Want existed.
    const old = ["#", "Date", "Category", "Type", "Amount", "Note"];
    const { transactions, problems } = load([[1, "2026-09-03", "rent", "subscription", 600, "flat"]], old);
    expect(problems).toEqual([]);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].kind).toBe("expense");
    expect(transactions[0].interval).toBe("monthly");
    expect(transactions[0].needWant).toBeNull();
    expect(transactions[0].paymentMethod).toBeNull();
  });

  it("preserves a column the user invented (rule 3)", () => {
    const withExtra = [...HEADERS, "Project Code"];
    const { transactions } = load(
      [[1, "2026-09-03", "travel", "one-time", 80, "train", "", "", "", "", "", "ACME-12"]],
      withExtra,
    );
    expect(transactions[0].extra).toEqual({ "Project Code": "ACME-12" });
  });

  it("reads a sheet whose columns were dragged around (rule 1)", () => {
    const reordered = ["Amount", "Date", "Note", "Category"];
    const { transactions, problems } = load([[42.5, "2026-09-03", "lunch", "eating out"]], reordered);
    expect(problems).toEqual([]);
    expect(transactions[0].amount).toBe(42.5);
    expect(transactions[0].category).toBe("eating out");
  });

  it("fails the FILE, not every row, when a required column is absent", () => {
    const { transactions, problems } = load([[1, "groceries"]], ["#", "Category"]);
    expect(transactions).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0].level).toBe("error");
    expect(problems[0].message).toContain("date");
  });

  it("keeps the good rows when one row is bad", () => {
    const { transactions, problems } = load([
      [1, "2026-09-01", "groceries", "one-time", 10, ""],
      [2, "nope", "groceries", "one-time", 20, ""],
      [3, "2026-09-03", "groceries", "one-time", 30, ""],
    ]);
    expect(transactions).toHaveLength(2);
    expect(problems).toHaveLength(1);
    expect(problems[0].row).toBe(3);
  });
});

describe("sortTransactions / collectLists", () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    id: "a#Sep#2",
    date: "2026-09-01",
    category: "groceries",
    type: "one-time",
    kind: "expense",
    amount: 1,
    note: "",
    paymentMethod: null,
    account: null,
    needWant: null,
    interval: null,
    currency: "GBP",
    source: { file: "a", sheet: "Sep", row: 2 },
    extra: {},
    ...over,
  });

  it("sorts chronologically with a stable tiebreak", () => {
    const rows = [
      tx({ id: "b", date: "2026-09-05" }),
      tx({ id: "a", date: "2026-09-05" }),
      tx({ id: "c", date: "2025-01-01" }),
    ];
    expect(sortTransactions(rows).map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("widens the dropdowns with whatever the user actually typed", () => {
    const lists = collectLists(
      [tx({ category: "Barber", paymentMethod: "UPI" }), tx({ category: "groceries" })],
      { categories: ["groceries"], paymentMethods: [], accounts: [] },
    );
    expect(lists.categories).toEqual(["Barber", "groceries"]);
    expect(lists.paymentMethods).toEqual(["UPI"]);
  });

  it("does not list the same value twice in different cases", () => {
    const lists = collectLists([tx({ category: "Groceries" })], {
      categories: ["groceries"],
      paymentMethods: [],
      accounts: [],
    });
    expect(lists.categories).toHaveLength(1);
  });
});

describe("csv", () => {
  it("detects the delimiter, including a European semicolon export", () => {
    expect(detectDelimiter("Date,Category,Amount")).toBe(",");
    expect(detectDelimiter("Date;Category;Amount")).toBe(";");
    expect(detectDelimiter("Date\tCategory\tAmount")).toBe("\t");
  });

  it("parses quoted fields, embedded commas, newlines and doubled quotes", () => {
    const text = 'Date,Note\n2026-09-01,"lunch, with tax"\n2026-09-02,"a ""quoted"" thing"\n2026-09-03,"two\nlines"';
    expect(parseCsv(text)).toEqual([
      ["Date", "Note"],
      ["2026-09-01", "lunch, with tax"],
      ["2026-09-02", 'a "quoted" thing'],
      ["2026-09-03", "two\nlines"],
    ]);
  });

  it("survives a BOM, CRLF endings and a trailing newline", () => {
    expect(parseCsv("﻿Date,Amount\r\n2026-09-01,10\r\n")).toEqual([
      ["Date", "Amount"],
      ["2026-09-01", "10"],
    ]);
  });

  it("reads a semicolon file with comma decimals end to end", () => {
    // The combination that silently produces NaN amounts if you assume commas.
    const text = "Date;Category;Type;Amount\n2026-09-01;groceries;one-time;12,50";
    const { raws, map } = csvToRawRows(parseCsv(text), "export.csv");
    const { transactions, problems } = normalizeRows(raws, {
      file: "export.csv",
      map,
      currency: "EUR",
    });
    expect(problems).toEqual([]);
    expect(transactions[0].amount).toBe(12.5);
  });

  it("says so plainly when no heading is recognised", () => {
    const { problems } = csvToRawRows(parseCsv("alpha,beta\n1,2"), "mystery.csv");
    expect(problems[0].level).toBe("error");
    expect(problems[0].message).toContain("column headings");
  });

  it("round-trips an export back through the parser", () => {
    const rows = [
      {
        id: "a#Sep#2",
        date: "2026-09-01",
        category: "eating out",
        type: "one-time" as const,
        kind: "expense" as const,
        amount: 12.5,
        note: 'lunch, with a "note"',
        paymentMethod: "cash",
        account: null,
        needWant: "want" as const,
        interval: null,
        currency: "GBP",
        source: { file: "a", sheet: "Sep", row: 2 },
        extra: { "Project Code": "ACME-12" },
      },
    ];
    const text = toCsv(rows);
    const { raws, map } = csvToRawRows(parseCsv(text), "out.csv");
    const { transactions, problems } = normalizeRows(raws, { file: "out.csv", map, currency: "GBP" });

    expect(problems).toEqual([]);
    expect(transactions[0].note).toBe('lunch, with a "note"');
    expect(transactions[0].amount).toBe(12.5);
    expect(transactions[0].needWant).toBe("want");
    expect(transactions[0].extra).toEqual({ "Project Code": "ACME-12" });
  });
});
