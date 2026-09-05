import { describe, expect, it } from "vitest";
import {
  COLUMNS,
  SCHEMA_VERSION,
  columnLetter,
  defaultFor,
  mapHeaders,
  normalizeHeader,
} from "../src/lib/capyexpense/schema";

/**
 * The v1 header row, frozen by hand.
 *
 * This literal is the enforcement mechanism for schema rule 2 (append-only), so
 * it MUST NOT be imported from schema.ts — a shared constant could be edited in
 * lockstep with the columns and the test would happily pass while every existing
 * workbook broke. If a change to COLUMNS fails the prefix assertion below, the
 * change is wrong, not the test.
 */
const V1_HEADERS = [
  "#",
  "Date",
  "Category",
  "Type",
  "Amount",
  "Note",
  "Payment Method",
  "Account",
  "Need or Want",
  "Kind",
  "Repeats",
] as const;

describe("schema contract", () => {
  it("keeps the v1 headers as an unchanged prefix (rule 2: append-only)", () => {
    const headers = COLUMNS.map((c) => c.header);
    expect(headers.slice(0, V1_HEADERS.length)).toEqual([...V1_HEADERS]);
  });

  it("never lets two columns claim the same header or alias", () => {
    const seen = new Map<string, string>();
    for (const spec of COLUMNS) {
      for (const raw of [spec.header, ...spec.aliases]) {
        const norm = normalizeHeader(raw);
        const owner = seen.get(norm);
        expect(owner, `"${raw}" is claimed by both ${owner} and ${spec.key}`).toBeUndefined();
        seen.set(norm, spec.key);
      }
    }
  });

  it("gives every column a stable key and a hint (req 4)", () => {
    const keys = COLUMNS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const spec of COLUMNS) {
      expect(spec.hint.length).toBeGreaterThan(0);
      expect(spec.since).toBeLessThanOrEqual(SCHEMA_VERSION);
    }
  });

  it("marks exactly one column as app-filled", () => {
    const auto = COLUMNS.filter((c) => !c.entry);
    expect(auto.map((c) => c.key)).toEqual(["serial"]);
    expect(auto[0].formula).toBeTypeOf("function");
  });
});

describe("normalizeHeader", () => {
  it("is idempotent", () => {
    for (const raw of ["Payment  Method:", "NEED OR WANT", " # ", "Note.", "Need-or-Want"]) {
      const once = normalizeHeader(raw);
      expect(normalizeHeader(once)).toBe(once);
    }
  });

  it("keeps # rather than stripping it to an empty string", () => {
    // "#" is pure punctuation; a naive strip would collide it with a blank cell.
    expect(normalizeHeader("#")).toBe("#");
    expect(normalizeHeader("")).toBe("");
  });

  it("folds case, punctuation and doubled spaces together", () => {
    expect(normalizeHeader("Payment  Method:")).toBe("payment method");
    expect(normalizeHeader("Need-or-Want")).toBe("need or want");
  });
});

describe("mapHeaders (rule 1: match by string, never by index)", () => {
  const canonical = [...V1_HEADERS];

  it("maps the canonical header row", () => {
    const map = mapHeaders(canonical);
    expect(map.byKey.date).toBe(1);
    expect(map.byKey.amount).toBe(4);
    expect(map.missing).toEqual([]);
    expect(map.unknown).toEqual([]);
  });

  it("survives a user dragging columns into a different order", () => {
    const shuffled = ["Amount", "Date", "Category", "Note", "Type"];
    const map = mapHeaders(shuffled);
    expect(map.byKey.amount).toBe(0);
    expect(map.byKey.date).toBe(1);
    expect(map.byKey.type).toBe(4);
  });

  it("is indifferent to case, padding and punctuation", () => {
    const messy = ["  #", "DATE", "category", "type", "Amount ", "notes", "Payment  Method:"];
    const map = mapHeaders(messy);
    expect(map.byKey.note).toBe(5);
    expect(map.byKey.paymentMethod).toBe(6);
    expect(map.unknown).toEqual([]);
  });

  it("preserves unknown columns instead of dropping them (rule 3)", () => {
    const map = mapHeaders(["Date", "Amount", "Category", "Type", "Project Code"]);
    expect(map.unknown).toEqual([{ index: 4, header: "Project Code" }]);
  });

  it("reports missing optional columns without treating them as fatal (rule 4)", () => {
    const map = mapHeaders(["Date", "Category", "Type", "Amount"]);
    expect(map.missing).toContain("needWant");
    expect(map.missing).toContain("interval");
    expect(map.missing).not.toContain("date");
  });

  it("binds the leftmost of two headers that mean the same column", () => {
    const map = mapHeaders(["Note", "Notes"]);
    expect(map.byKey.note).toBe(0);
    expect(map.unknown).toEqual([{ index: 1, header: "Notes" }]);
  });

  it("ignores blank header cells", () => {
    const map = mapHeaders(["Date", "", "   ", "Amount"]);
    expect(map.byKey.amount).toBe(3);
    expect(map.unknown).toEqual([]);
  });
});

describe("defaultFor (rule 4)", () => {
  it("treats a blank Kind as an expense", () => {
    expect(defaultFor("kind", {})).toBe("expense");
  });

  it("only assumes a cadence for subscriptions", () => {
    expect(defaultFor("interval", { type: "subscription" })).toBe("monthly");
    expect(defaultFor("interval", { type: "one-time" })).toBeNull();
  });

  it("leaves the optional text columns empty rather than inventing a value", () => {
    expect(defaultFor("note", {})).toBe("");
    expect(defaultFor("needWant", {})).toBeNull();
    expect(defaultFor("paymentMethod", {})).toBeNull();
    expect(defaultFor("account", {})).toBeNull();
  });
});

describe("columnLetter", () => {
  it("counts like Excel does", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(1)).toBe("B");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(27)).toBe("AB");
    expect(columnLetter(51)).toBe("AZ");
    expect(columnLetter(52)).toBe("BA");
  });

  it("puts the serial formula's anchor on the Date column", () => {
    // The formula hardcodes B; if Date ever stops being index 1 that is a bug.
    expect(columnLetter(COLUMNS.findIndex((c) => c.key === "date"))).toBe("B");
  });
});
