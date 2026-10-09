/**
 * CapyInvoice — data model.
 *
 * The document is a plain-JSON, versioned payload that lives entirely in the
 * user's browser, like CapyResume's. Nothing here may depend on a server, a
 * database, a session or a user account.
 *
 * Any shape change must bump `INVOICE_SCHEMA_VERSION` and be handled by
 * `migrate()` in ./schema.ts — a saved draft must never be read back as
 * garbage, and reading must never throw.
 *
 * Money fields end in `Minor` and are integers of the currency's smallest
 * unit (see ./money.ts for the one rounding rule). `qty` is the model's only
 * non-integer: hours can be 3.5, and it is rounded once, when the line amount
 * is formed.
 */

/** Bump when the persisted shape changes in a way `migrate()` must repair. */
export const INVOICE_SCHEMA_VERSION = 1;

/** The three documents the tool prints. */
export type DocKind = 'invoice' | 'quote' | 'receipt';

export type DiscountMode = 'percent' | 'fixed';

export interface InvoiceLine {
  id: string;
  description: string;
  /** May be fractional (3.5 hours); never negative. */
  qty: number;
  /** Integer minor units. A credit line is a negative amount. */
  unitPriceMinor: number;
  /** This line's tax rate in basis points (2000 = 20%). */
  taxBp: number;
}

/**
 * The whole document. The `from` block is copied from the business profile
 * when a fresh draft starts (and saved back to it on demand) — the two are
 * decoupled copies, not a live reference, so editing an invoice never
 * rewrites the profile behind the user's back.
 */
export interface InvoiceDoc {
  version: number;
  kind: DocKind;
  /** "INV-0042" — typed free-form; nothing is auto-numbered. */
  number: string;
  /** `YYYY-MM-DD`, or '' when unset. */
  issueDate: string;
  /**
   * `YYYY-MM-DD`, or '' when unset. Labelled "Due" on an invoice and
   * "Valid until" on a quote; unused on a receipt.
   */
  dueDate: string;
  fromName: string;
  /** Multi-line address / tax-number block. */
  fromDetails: string;
  toName: string;
  toDetails: string;
  /** A data URL picked on this machine; stays in this browser and in the JSON backup. */
  logoDataUrl: string;
  /** ISO 4217 alpha-3, uppercased on write. */
  currency: string;
  lines: InvoiceLine[];
  discountMode: DiscountMode;
  /** Percent discount in basis points of the subtotal (500 = 5%). Used when mode is 'percent'. */
  discountBp: number;
  /** Fixed discount in minor units. Used when mode is 'fixed'. */
  discountMinor: number;
  /** Already-paid amount in minor units (a deposit, or the receipt's payment). */
  amountPaidMinor: number;
  /** Bank / payment instructions, printed under the totals. */
  paymentDetails: string;
  notes: string;
  terms: string;
  /** ISO-8601. Set by the store on every write. */
  updatedAt: string;
}

/**
 * The user's own details, kept once and copied into new drafts. Saved and
 * loaded separately from the draft, so "next invoice, same me" is one click.
 */
export interface BusinessProfile {
  version: number;
  name: string;
  details: string;
  logoDataUrl: string;
  /** ISO 4217 alpha-3 — the currency new drafts start in. */
  currency: string;
  paymentDetails: string;
  updatedAt: string;
}
