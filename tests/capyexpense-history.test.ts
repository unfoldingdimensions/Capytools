import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRUNE,
  diffKey,
  diffTransactions,
  parseSnapshotName,
  selectForPrune,
  snapshotName,
} from "../src/lib/capyexpense/history";
import type { SnapshotReason, SnapshotRef } from "../src/lib/capyexpense/history";
import type { Transaction } from "../src/lib/capyexpense/types";

const NOW = new Date("2026-09-05T12:00:00Z");
const DAY = 86_400_000;

let seq = 0;
const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: `f#Sep#${++seq}`,
  date: "2026-09-03",
  category: "groceries",
  type: "one-time",
  kind: "expense",
  amount: 10,
  note: "",
  paymentMethod: null,
  account: null,
  needWant: null,
  interval: null,
  currency: "GBP",
  source: { file: "f.xlsx", sheet: "Sep", row: 2 },
  extra: {},
  ...over,
});

const ref = (agoDays: number, reason: SnapshotReason = "auto", bytes = 1024): SnapshotRef => {
  const at = new Date(NOW.getTime() - agoDays * DAY);
  const name = snapshotName("CapyExpense-2026.xlsx", reason, at);
  return parseSnapshotName(name, bytes)!;
};

describe("snapshot naming", () => {
  it("round-trips every reason", () => {
    const reasons: SnapshotReason[] = ["auto", "pre-write", "pre-upgrade", "pre-restore", "manual"];
    for (const reason of reasons) {
      const name = snapshotName("CapyExpense-2026.xlsx", reason, NOW);
      const parsed = parseSnapshotName(name, 99);
      expect(parsed).not.toBeNull();
      expect(parsed!.reason).toBe(reason);
      expect(parsed!.sourceName).toBe("CapyExpense-2026.xlsx");
      expect(parsed!.dayKey).toBe("2026-09-05");
      expect(parsed!.bytes).toBe(99);
    }
  });

  it("uses no colon, because Windows will not have one in a filename", () => {
    expect(snapshotName("a.xlsx", "auto", NOW)).not.toContain(":");
  });

  it("sorts chronologically as plain text", () => {
    const early = snapshotName("a.xlsx", "auto", new Date("2026-09-05T09:00:00Z"));
    const late = snapshotName("a.xlsx", "auto", new Date("2026-09-05T14:00:00Z"));
    expect(early < late).toBe(true);
  });

  it("refuses to claim a file it did not write", () => {
    // The history folder belongs to the user; they may keep their own things in it.
    expect(parseSnapshotName("my own backup.xlsx")).toBeNull();
    expect(parseSnapshotName("2026-09-05__auto__a.xlsx")).toBeNull();
    expect(parseSnapshotName("2026-09-05T14-22-08Z__wat__a.xlsx")).toBeNull();
  });
});

describe("selectForPrune", () => {
  it("keeps everything from the last week", () => {
    const refs = [0, 1, 3, 6].map((d) => ref(d));
    expect(selectForPrune(refs, DEFAULT_PRUNE, NOW)).toEqual([]);
  });

  it("thins older history to one a day, then one a week, then one a month", () => {
    const refs: SnapshotRef[] = [];
    // Four snapshots a day for a year.
    for (let d = 0; d < 365; d++) {
      for (let i = 0; i < 4; i++) refs.push(ref(d + i * 0.1));
    }
    const doomed = new Set(selectForPrune(refs, DEFAULT_PRUNE, NOW).map((r) => r.id));
    const kept = refs.filter((r) => !doomed.has(r.id));

    // Everything inside the first week survives; beyond it, one per bucket.
    expect(kept.filter((r) => (NOW.getTime() - r.takenAt) / DAY <= 7).length).toBeGreaterThan(20);
    expect(kept.length).toBeLessThan(refs.length / 4);
    expect(kept.length).toBeLessThanOrEqual(DEFAULT_PRUNE.maxFiles);
  });

  it("never prunes a pre-restore snapshot, however old", () => {
    const refs = [ref(500, "pre-restore"), ...Array.from({ length: 50 }, (_, i) => ref(i + 10))];
    const doomed = selectForPrune(refs, DEFAULT_PRUNE, NOW);
    expect(doomed.some((r) => r.reason === "pre-restore")).toBe(false);
  });

  it("always keeps the newest few, whatever the tiers decide", () => {
    const refs = Array.from({ length: 40 }, (_, i) => ref(100 + i));
    const doomed = new Set(selectForPrune(refs, DEFAULT_PRUNE, NOW).map((r) => r.id));
    const newest = [...refs].sort((a, b) => b.takenAt - a.takenAt).slice(0, 5);
    for (const r of newest) expect(doomed.has(r.id)).toBe(false);
  });

  it("honours the file-count cap", () => {
    const policy = { ...DEFAULT_PRUNE, maxFiles: 10, alwaysKeepNewest: 2 };
    const refs = Array.from({ length: 60 }, (_, i) => ref(i * 0.2));
    const doomed = new Set(selectForPrune(refs, policy, NOW).map((r) => r.id));
    expect(refs.length - doomed.size).toBeLessThanOrEqual(10);
  });

  it("honours the size cap", () => {
    const policy = { ...DEFAULT_PRUNE, maxBytes: 10_000, alwaysKeepNewest: 1 };
    const refs = Array.from({ length: 40 }, (_, i) => ref(i * 0.2, "auto", 1000));
    const doomed = new Set(selectForPrune(refs, policy, NOW).map((r) => r.id));
    const keptBytes = refs.filter((r) => !doomed.has(r.id)).reduce((s, r) => s + r.bytes, 0);
    expect(keptBytes).toBeLessThanOrEqual(10_000);
  });

  it("does nothing with nothing", () => {
    expect(selectForPrune([], DEFAULT_PRUNE, NOW)).toEqual([]);
  });
});

describe("diffTransactions", () => {
  it("sees nothing when nothing moved", () => {
    const rows = [tx({ amount: 10 }), tx({ amount: 20, date: "2026-09-04" })];
    const d = diffTransactions(rows, rows);
    expect(d.unchanged).toBe(2);
    expect([d.added, d.removed, d.changed]).toEqual([[], [], []]);
  });

  it("reports an edited amount as ONE change, not an add plus a delete", () => {
    const before = [tx({ amount: 10, note: "shop" })];
    const after = [tx({ amount: 12, note: "shop" })];
    const d = diffTransactions(before, after);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].fields).toEqual(["amount"]);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it("ignores a pure row-number shift", () => {
    // Inserting a row in Excel renumbers everything below it. Keying the diff on
    // ids would report the whole rest of the sheet as changed.
    const before = [tx({ id: "f#Sep#2", amount: 10 }), tx({ id: "f#Sep#3", amount: 20 })];
    const after = [tx({ id: "f#Sep#5", amount: 10 }), tx({ id: "f#Sep#6", amount: 20 })];
    const d = diffTransactions(before, after);
    expect(d.unchanged).toBe(2);
    expect(d.changed).toEqual([]);
  });

  it("reports genuine additions and removals", () => {
    const before = [tx({ amount: 10, category: "rent" })];
    const after = [tx({ amount: 99, category: "travel", date: "2026-09-09" })];
    const d = diffTransactions(before, after);
    expect(d.added).toHaveLength(1);
    expect(d.removed).toHaveLength(1);
    expect(d.changed).toEqual([]);
  });

  it("lists every field that moved", () => {
    const before = [tx({ amount: 10, note: "a", paymentMethod: "cash" })];
    const after = [tx({ amount: 11, note: "b", paymentMethod: "card" })];
    const d = diffTransactions(before, after);
    expect(d.changed[0].fields.sort()).toEqual(["amount", "note", "paymentMethod"]);
  });

  it("keys on content, not identity", () => {
    const a = tx({ id: "one", amount: 10 });
    const b = tx({ id: "two", amount: 10 });
    expect(diffKey(a)).toBe(diffKey(b));
  });

  it("handles a restore that empties the sheet", () => {
    const d = diffTransactions([tx(), tx()], []);
    expect(d.removed).toHaveLength(2);
    expect(d.unchanged).toBe(0);
  });
});
