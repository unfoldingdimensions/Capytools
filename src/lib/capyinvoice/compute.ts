/**
 * CapyInvoice — the totals engine.
 *
 * Pure module: a document in, a `Totals` out, no React, no storage. Both the
 * live summary in the page and the PDF render *this* object, so the two can
 * never disagree about what an invoice says — the CapyResume lesson
 * (composeDocument) applied to arithmetic.
 *
 * **The rounding rules, stated once** (the page prints them and so does the
 * PDF, via `roundingNote`):
 *
 * 1. A line's amount is `qty × unit price`, rounded half away from zero to
 *    the currency's minor unit — the model's one float multiplication.
 * 2. Tax is calculated **per line**, not on the total, because lines may
 *    carry different rates and a per-line figure is what a recipient's
 *    accountant expects to check. Where a rate applies to several lines,
 *    their tax is summed into one "Tax at 20%" row.
 * 3. A document-level discount is applied **before tax** and spread across
 *    the lines **in proportion to their amounts** — tax cannot be computed
 *    per line without a per-line base. Credit lines take no share. Allocation
 *    walks the lines in order, allocating each its rounded share and giving
 *    the last one the remainder, so the shares always sum to exactly the
 *    discount (no lost cent from independent rounding).
 * 4. Every result is an integer of the currency's minor units from parse to
 *    print (see ./money.ts).
 */

import { currencyMinorDigits, roundHalfAwayFromZero } from './money';
import type { InvoiceDoc, InvoiceLine } from './types';

/** One line's contribution, kept per line so the table can show what was computed. */
export interface LineTotals {
  line: InvoiceLine;
  /** `qty × unit price`, rounded half away from zero. */
  amountMinor: number;
  /** This line's share of the document discount (0 when there is none). */
  discountShareMinor: number;
  /** What the tax rate applies to: `amountMinor − discountShareMinor`. */
  taxableMinor: number;
  /** `roundHalfAwayFromZero(taxableMinor × taxBp / 10000)`. */
  taxMinor: number;
}

export interface TaxRateGroup {
  /** The rate, in basis points. */
  bp: number;
  /** The combined taxable base of every line at this rate. */
  baseMinor: number;
  /** The combined tax of every line at this rate. */
  taxMinor: number;
}

export interface Totals {
  currencyDigits: number;
  lines: LineTotals[];
  /** Σ of the line amounts, before discount and tax. */
  subtotalMinor: number;
  /** The discount actually applied — a fixed discount larger than the subtotal is clamped. */
  discountMinor: number;
  /** Whether the requested discount was clamped (the UI says so). */
  discountClamped: boolean;
  /** Σ of the per-line tax, grouped by rate in `taxGroups`. */
  taxMinor: number;
  /** Ascending by rate; rates with no lines are omitted. */
  taxGroups: TaxRateGroup[];
  /** `subtotal − discount + tax`. */
  totalMinor: number;
  amountPaidMinor: number;
  /** `total − amountPaid`. Negative when the payer is owed money. */
  balanceMinor: number;
}

/**
 * The statement printed on the page and in the PDF fine print. One string in
 * one place, so the promise cannot drift from the arithmetic.
 */
export function roundingNote(currencyDigits: number): string {
  const unit =
    currencyDigits === 0
      ? 'whole unit of the currency'
      : currencyDigits === 3
        ? 'thousandth of the currency'
        : 'smallest unit of the currency';
  return (
    `Line amounts are quantity × unit price. The discount, if any, is applied before tax and ` +
    `spread across the lines in proportion to their amounts. Tax is calculated on each line at ` +
    `the line's own rate and rounded half up to the ${unit}.`
  );
}

/**
 * A document discount, spread over the lines in proportion to their amounts
 * with no lost cent: each line in order takes its rounded share, and the last
 * line takes what remains. A clamped discount (never more than the subtotal)
 * means every share sits between 0 and that line's amount.
 *
 * Credit lines (negative amounts) take no share — a discount is not spread
 * onto a credit — so the proportional base is the sum of the positive lines.
 */
export function allocateDiscount(discountMinor: number, amounts: readonly number[]): number[] {
  const shares = amounts.map(() => 0);
  const positiveTotal = amounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  const capped = Math.max(0, Math.min(discountMinor, positiveTotal));

  let lastPositive = -1;
  for (let i = 0; i < amounts.length; i += 1) {
    if (amounts[i]! > 0) lastPositive = i;
  }
  if (capped === 0 || lastPositive < 0) return shares;

  let running = 0;
  for (let i = 0; i < lastPositive; i += 1) {
    const amount = amounts[i]!;
    if (amount <= 0) continue;
    const share = roundHalfAwayFromZero((capped * amount) / positiveTotal);
    shares[i] = Math.max(0, Math.min(share, amount));
    running += shares[i]!;
  }
  // The remainder is exact by construction; the clamp keeps it honest even if
  // a pathological line forced the running sum past the discount.
  shares[lastPositive] = Math.max(0, Math.min(capped - running, amounts[lastPositive]!));
  return shares;
}

export function computeTotals(doc: InvoiceDoc): Totals {
  const digits = currencyMinorDigits(doc.currency);

  const lines: LineTotals[] = doc.lines.map((line) => ({
    line,
    amountMinor: roundHalfAwayFromZero(line.qty * line.unitPriceMinor),
    discountShareMinor: 0,
    taxableMinor: 0,
    taxMinor: 0,
  }));

  const subtotalMinor = lines.reduce((sum, entry) => sum + entry.amountMinor, 0);

  // The requested discount: percent of the subtotal, or a fixed amount.
  const requested =
    doc.discountMode === 'percent'
      ? roundHalfAwayFromZero((subtotalMinor * doc.discountBp) / 10000)
      : doc.discountMinor;
  const discountMinor = Math.max(0, Math.min(requested, subtotalMinor));
  const discountClamped = discountMinor !== requested;

  const shares = allocateDiscount(discountMinor, lines.map((entry) => entry.amountMinor));
  lines.forEach((entry, index) => {
    entry.discountShareMinor = shares[index]!;
    entry.taxableMinor = entry.amountMinor - entry.discountShareMinor;
    entry.taxMinor = roundHalfAwayFromZero((entry.taxableMinor * entry.line.taxBp) / 10000);
  });

  // Tax by rate, ascending — the "Tax at 20%" rows under the items table.
  const byRate = new Map<number, TaxRateGroup>();
  for (const entry of lines) {
    if (entry.line.taxBp === 0 && entry.taxableMinor === 0) continue;
    const group = byRate.get(entry.line.taxBp) ?? { bp: entry.line.taxBp, baseMinor: 0, taxMinor: 0 };
    group.baseMinor += entry.taxableMinor;
    group.taxMinor += entry.taxMinor;
    byRate.set(entry.line.taxBp, group);
  }
  const taxGroups = [...byRate.values()].sort((a, b) => a.bp - b.bp);

  const taxMinor = lines.reduce((sum, entry) => sum + entry.taxMinor, 0);
  const totalMinor = subtotalMinor - discountMinor + taxMinor;
  const amountPaidMinor = doc.amountPaidMinor;

  return {
    currencyDigits: digits,
    lines,
    subtotalMinor,
    discountMinor,
    discountClamped,
    taxMinor,
    taxGroups,
    totalMinor,
    amountPaidMinor,
    balanceMinor: totalMinor - amountPaidMinor,
  };
}
