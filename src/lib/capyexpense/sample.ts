import { addDays, daysBetween } from "./dates";
import { sortTransactions } from "./normalize";
import type { Interval, IsoDate, Transaction, TxKind } from "./types";

/**
 * A made-up year, for the marketing demo and for tests.
 *
 * DETERMINISTIC ON PURPOSE. The demo page server-renders and then hydrates; a
 * dataset built from `Math.random()` would differ between the two passes and
 * React would throw a hydration mismatch. A seeded generator gives the same
 * ledger every time, on every machine, so the page is a pure function of its
 * props and snapshot tests mean something.
 */

/** The day the demo pretends it is. Never `new Date()` — see above. */
export const SAMPLE_NOW: IsoDate = "2026-09-05";
export const SAMPLE_START: IsoDate = "2025-09-01";
export const SAMPLE_CURRENCY = "GBP";

/** Mulberry32 — small, fast, and good enough for plausible-looking noise. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Recipe {
  category: string;
  note: string[];
  /** Chance this happens on any given day. */
  chance: number;
  min: number;
  max: number;
  needWant: "need" | "want";
  method: string;
}

const EVERYDAY: Recipe[] = [
  { category: "groceries", note: ["weekly shop", "top-up shop", "market"], chance: 0.34, min: 8, max: 62, needWant: "need", method: "debit card" },
  { category: "eating out", note: ["lunch", "coffee", "dinner out", "takeaway"], chance: 0.4, min: 3, max: 44, needWant: "want", method: "credit card" },
  { category: "transport", note: ["bus", "train", "taxi"], chance: 0.3, min: 2, max: 28, needWant: "need", method: "debit card" },
  { category: "entertainment", note: ["cinema", "gig", "books"], chance: 0.08, min: 6, max: 55, needWant: "want", method: "credit card" },
  { category: "healthcare", note: ["pharmacy", "dentist"], chance: 0.04, min: 8, max: 90, needWant: "need", method: "debit card" },
  { category: "clothing", note: ["shoes", "jumper", "socks"], chance: 0.05, min: 12, max: 120, needWant: "want", method: "credit card" },
  { category: "personal care", note: ["haircut", "chemist"], chance: 0.05, min: 6, max: 40, needWant: "need", method: "cash" },
  { category: "fuel & parking", note: ["parking", "petrol"], chance: 0.09, min: 3, max: 70, needWant: "need", method: "debit card" },
];

interface Fixed {
  category: string;
  note: string;
  amount: number;
  interval: Interval;
  /** Day of month it lands on. */
  day: number;
  needWant: "need" | "want";
}

const SUBSCRIPTIONS: Fixed[] = [
  { category: "rent or mortgage", note: "flat", amount: 1150, interval: "monthly", day: 1, needWant: "need" },
  { category: "utilities", note: "energy", amount: 88, interval: "monthly", day: 3, needWant: "need" },
  { category: "phone & internet", note: "broadband", amount: 32, interval: "monthly", day: 6, needWant: "need" },
  { category: "phone & internet", note: "mobile", amount: 14, interval: "monthly", day: 6, needWant: "need" },
  { category: "subscriptions", note: "streaming", amount: 12.99, interval: "monthly", day: 12, needWant: "want" },
  { category: "subscriptions", note: "music", amount: 10.99, interval: "monthly", day: 18, needWant: "want" },
  { category: "fitness", note: "gym", amount: 34, interval: "monthly", day: 2, needWant: "want" },
  { category: "insurance", note: "contents insurance", amount: 210, interval: "yearly", day: 14, needWant: "need" },
  { category: "subscriptions", note: "domain & hosting", amount: 96, interval: "yearly", day: 22, needWant: "need" },
];

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length) % list.length];
}

const money = (r: () => number, min: number, max: number) =>
  Math.round((min + r() * (max - min)) * 100) / 100;

let counter = 0;
function make(
  date: IsoDate,
  category: string,
  amount: number,
  over: Partial<Transaction> = {},
): Transaction {
  counter += 1;
  const sheet = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(date.slice(5, 7)) - 1
  ];
  return {
    id: `demo#${sheet}#${counter}`,
    date,
    category,
    type: "one-time",
    kind: "expense" as TxKind,
    amount,
    note: "",
    paymentMethod: null,
    account: "everyday",
    needWant: null,
    interval: null,
    currency: SAMPLE_CURRENCY,
    source: { file: "CapyExpense-demo.xlsx", sheet, row: counter + 1 },
    extra: {},
    ...over,
  };
}

function build(): Transaction[] {
  counter = 0;
  const r = rng(20260905);
  const out: Transaction[] = [];
  const days = daysBetween(SAMPLE_START, SAMPLE_NOW);

  for (let i = 0; i <= days; i++) {
    const date = addDays(SAMPLE_START, i);
    const dom = Number(date.slice(8, 10));

    for (const recipe of EVERYDAY) {
      // Weekends spend a little more freely, which makes the heatmap show a
      // rhythm instead of noise.
      const weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      if (r() > recipe.chance * (weekend ? 1.35 : 1)) continue;
      out.push(
        make(date, recipe.category, money(r, recipe.min, recipe.max), {
          note: pick(r, recipe.note),
          needWant: recipe.needWant,
          paymentMethod: recipe.method,
        }),
      );
    }

    for (const f of SUBSCRIPTIONS) {
      if (dom !== f.day) continue;
      if (f.interval === "yearly" && Number(date.slice(5, 7)) !== 4) continue;
      out.push(
        make(date, f.category, f.amount, {
          type: "subscription",
          interval: f.interval,
          note: f.note,
          needWant: f.needWant,
          paymentMethod: "bank transfer",
        }),
      );
    }

    // Salary, and the occasional refund, so net cash flow and the refund path
    // are both exercised by the demo rather than only by tests.
    if (dom === 28) {
      out.push(make(date, "salary", 2840, { kind: "income", note: "monthly pay", paymentMethod: "bank transfer" }));
    }
    if (r() > 0.99) {
      out.push(make(date, "shopping", money(r, 8, 60), { kind: "refund", note: "returned", paymentMethod: "credit card" }));
    }
  }

  return sortTransactions(out);
}

/** Built once at module load; the generator is seeded, so this is stable. */
export const SAMPLE_TRANSACTIONS: Transaction[] = build();
