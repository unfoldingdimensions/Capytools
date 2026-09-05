/**
 * CapyExpense core types.
 *
 * Everything here is a plain value — no `Date` objects, no class instances, no
 * methods. The whole pipeline is pure functions over these shapes, which is what
 * lets the Tauri app and the web demo share every line of analysis code without
 * either one knowing the other exists.
 */

/** A calendar day, `YYYY-MM-DD`. Never a timestamp — an expense has no clock. */
export type IsoDate = string;

/** The user's own axis: a one-off, or something that keeps charging. */
export type TxType = "one-time" | "subscription";

/**
 * Which direction the money moved.
 *
 * A signed `amount` cannot carry this on its own: a refund must REDUCE its
 * category's spend, while income must not appear in category spend at all yet
 * must still move net cash flow. One signed number collapses two different
 * things into the same negative.
 */
export type TxKind = "expense" | "refund" | "income";

/** How often a subscription charges. Drives the annualised commitment figure. */
export type Interval = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";

/** The 50/30/20 axis. `null` when the user left the column blank, which is fine. */
export type NeedWant = "need" | "want" | null;

export interface Transaction {
  /**
   * `${file}#${sheet}#${row}` — stable across a reload, and carrying the Excel
   * row number means a problem row is findable in the workbook in ten seconds.
   */
  id: string;
  date: IsoDate;
  category: string;
  type: TxType;
  kind: TxKind;
  /** Always >= 0, exactly as the human typed it. Direction lives in `kind`. */
  amount: number;
  note: string;
  paymentMethod: string | null;
  account: string | null;
  needWant: NeedWant;
  /** Meaningful only when `type === "subscription"`; `null` otherwise. */
  interval: Interval | null;
  /** From the workbook's `_meta`. A display format, never a conversion. */
  currency: string;
  source: { file: string; sheet: string; row: number };
  /**
   * Columns we did not recognise, kept verbatim. This is schema rule 3: a column
   * the user added themselves survives a read/write round-trip untouched.
   */
  extra: Record<string, string>;
}

/** What the app can construct itself, before a file and row exist to anchor it. */
export type NewTransaction = Omit<Transaction, "id" | "source" | "currency" | "extra">;

/** Dropdown sources, read from the workbook's `Lists` sheet and widened by use. */
export interface Lists {
  categories: string[];
  paymentMethods: string[];
  accounts: string[];
}

export type ProblemLevel = "warn" | "error";

/**
 * Nothing in the read path throws. A row we cannot make sense of becomes one of
 * these and the other 900 rows still render — a tracker that refuses to open
 * because of one typo is a tracker people stop opening.
 */
export interface LoadProblem {
  level: ProblemLevel;
  file: string;
  sheet?: string;
  /** Excel's own 1-based row number, so the user can jump straight to it. */
  row?: number;
  column?: string;
  /** A whole sentence, shown to the user as-is. Not an error code. */
  message: string;
}
