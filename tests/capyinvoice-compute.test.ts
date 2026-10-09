import { describe, expect, it } from 'vitest';
import { allocateDiscount, computeTotals, roundingNote } from '@/lib/capyinvoice/compute';
import type { InvoiceDoc, InvoiceLine } from '@/lib/capyinvoice/types';
import { DEMO_INVOICE } from '@/lib/capyinvoice/demo';

function line(partial: Partial<InvoiceLine>): InvoiceLine {
  return { id: 't', description: '', qty: 1, unitPriceMinor: 0, taxBp: 0, ...partial };
}

function doc(partial: Partial<InvoiceDoc>): InvoiceDoc {
  return {
    ...structuredClone(DEMO_INVOICE),
    // Neutral defaults so an edge-case test tests the edge case, not the demo:
    // no discount and nothing paid unless the test asks for it.
    discountMode: 'percent',
    discountBp: 0,
    discountMinor: 0,
    amountPaidMinor: 0,
    ...partial,
  };
}

describe('computeTotals — the worked example (the demo invoice, hand-checked)', () => {
  // subtotal 1200.00 + 680.00 + 315.00 = 2195.00
  // discount 5% = 109.75, spread 60/34/15.75 across the lines
  // tax 20% of 1140.00 = 228.00, 20% of 646.00 = 129.20, 0% of 299.25 = 0
  // total = 2195.00 − 109.75 + 357.20 = 2442.45; paid 500.00 → balance 1942.45
  const totals = computeTotals(DEMO_INVOICE);

  it('sums the line amounts exactly', () => {
    expect(totals.lines.map((entry) => entry.amountMinor)).toEqual([120000, 68000, 31500]);
    expect(totals.subtotalMinor).toBe(219500);
  });

  it('spreads the percent discount across lines in proportion, summing exactly', () => {
    expect(totals.discountMinor).toBe(10975);
    expect(totals.lines.map((entry) => entry.discountShareMinor)).toEqual([6000, 3400, 1575]);
    expect(totals.discountClamped).toBe(false);
  });

  it('computes tax per line on the discounted base', () => {
    expect(totals.lines.map((entry) => entry.taxableMinor)).toEqual([114000, 64600, 29925]);
    expect(totals.lines.map((entry) => entry.taxMinor)).toEqual([22800, 12920, 0]);
  });

  it('groups tax by rate, ascending', () => {
    expect(totals.taxGroups).toEqual([
      { bp: 0, baseMinor: 29925, taxMinor: 0 },
      { bp: 2000, baseMinor: 178600, taxMinor: 35720 },
    ]);
    expect(totals.taxMinor).toBe(35720);
  });

  it('totals, subtracts what was paid, and states the balance', () => {
    expect(totals.totalMinor).toBe(244245);
    expect(totals.amountPaidMinor).toBe(50000);
    expect(totals.balanceMinor).toBe(194245);
  });

  it('resolves the currency digits from the document currency', () => {
    expect(totals.currencyDigits).toBe(2); // GBP
  });
});

describe('computeTotals — rounding at the edges', () => {
  it('rounds each line amount half away from zero once — 3.5 × 9.01', () => {
    // 3.5 × 901 = 3153.5 → a tie → 3154
    const totals = computeTotals(doc({ lines: [line({ qty: 3.5, unitPriceMinor: 901 })] }));
    expect(totals.lines[0]!.amountMinor).toBe(3154);
  });

  it('rounds per-line tax at the half — 12.5% of 100.5', () => {
    // 1005 × 1250 / 10000 = 125.625 → 126
    const totals = computeTotals(
      doc({ lines: [line({ qty: 1, unitPriceMinor: 1005, taxBp: 1250 })] }),
    );
    expect(totals.lines[0]!.taxMinor).toBe(126);
  });

  it('rounds the percent discount at the half — 5% of 9.99', () => {
    // 999 × 500 / 10000 = 49.95 → 50
    const totals = computeTotals(
      doc({ lines: [line({ unitPriceMinor: 999 })], discountBp: 500 }),
    );
    expect(totals.discountMinor).toBe(50);
  });

  it('is symmetric on a credit line — 12.5% of −100.5 taxes to −126', () => {
    const totals = computeTotals(
      doc({ lines: [line({ qty: 1, unitPriceMinor: -1005, taxBp: 1250 })] }),
    );
    expect(totals.lines[0]!.taxMinor).toBe(-126);
  });

  it('carries no float dust out of the line multiplication', () => {
    // 1.1 × 6100 in a float is 6710.000000000001; the line is 6710.
    const totals = computeTotals(doc({ lines: [line({ qty: 1.1, unitPriceMinor: 6100 })] }));
    expect(totals.lines[0]!.amountMinor).toBe(6710);
    expect(Number.isInteger(totals.totalMinor)).toBe(true);
  });
});

describe('computeTotals — the discount', () => {
  it('handles a fixed discount', () => {
    const totals = computeTotals(
      doc({ lines: [line({ unitPriceMinor: 50000 })], discountMode: 'fixed', discountMinor: 750 }),
    );
    expect(totals.discountMinor).toBe(750);
    expect(totals.totalMinor).toBe(50000 - 750);
  });

  it('clamps a discount larger than the subtotal, and says so', () => {
    const totals = computeTotals(
      doc({
        lines: [line({ unitPriceMinor: 10000, taxBp: 2000 })],
        discountMode: 'fixed',
        discountMinor: 99999,
      }),
    );
    expect(totals.discountMinor).toBe(10000);
    expect(totals.discountClamped).toBe(true);
    // The whole base is discounted away, so the tax base is zero too.
    expect(totals.totalMinor).toBe(0);
  });

  it('clamps a percent discount past 100%', () => {
    const totals = computeTotals(
      doc({ lines: [line({ unitPriceMinor: 10000 })], discountBp: 15000 }),
    );
    expect(totals.discountMinor).toBe(10000);
    expect(totals.discountClamped).toBe(true);
  });

  it('never allocates the discount onto a credit line', () => {
    const totals = computeTotals(
      doc({
        lines: [line({ unitPriceMinor: 10000, taxBp: 2000 }), line({ unitPriceMinor: -2000 })],
        discountMode: 'fixed',
        discountMinor: 5000,
      }),
    );
    expect(totals.lines[0]!.discountShareMinor).toBe(5000);
    expect(totals.lines[1]!.discountShareMinor).toBe(0);
  });
});

describe('allocateDiscount — the no-lost-cent contract', () => {
  const cases: Array<{ discount: number; amounts: number[] }> = [
    { discount: 1, amounts: [100, 100, 100] },
    { discount: 7, amounts: [100, 100, 100] },
    { discount: 10975, amounts: [120000, 68000, 31500] },
    { discount: 333, amounts: [1, 1, 1, 1, 1, 1] },
    { discount: 9999, amounts: [33333, 1, 66666] },
    { discount: 500, amounts: [10000, 20000, 30000, 40000] },
    { discount: 12345, amounts: [1, 999999] },
  ];

  for (const { discount, amounts } of cases) {
    it(`splits ${discount} across [${amounts.join(', ')}] summing to the discount`, () => {
      const shares = allocateDiscount(discount, amounts);
      expect(shares.reduce((sum, share) => sum + share, 0)).toBe(
        Math.min(discount, amounts.reduce((sum, amount) => sum + amount, 0)),
      );
      shares.forEach((share, index) => {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(amounts[index]!);
      });
    });
  }

  it('returns all zeros when there is nothing to allocate', () => {
    expect(allocateDiscount(0, [100, 200])).toEqual([0, 0]);
    expect(allocateDiscount(100, [])).toEqual([]);
    expect(allocateDiscount(100, [0, 0])).toEqual([0, 0]);
  });
});

describe('computeTotals — payment and empties', () => {
  it('shows a negative balance when the payer overpaid, rather than hiding it', () => {
    const totals = computeTotals(
      doc({ lines: [line({ unitPriceMinor: 10000 })], amountPaidMinor: 12000 }),
    );
    expect(totals.balanceMinor).toBe(-2000);
  });

  it('handles an empty document without throwing', () => {
    const totals = computeTotals(doc({ lines: [] }));
    expect(totals.subtotalMinor).toBe(0);
    expect(totals.totalMinor).toBe(0);
    expect(totals.taxGroups).toEqual([]);
  });

  it('resolves zero minor digits for JPY and three for KWD', () => {
    expect(computeTotals(doc({ currency: 'JPY' })).currencyDigits).toBe(0);
    expect(computeTotals(doc({ currency: 'KWD' })).currencyDigits).toBe(3);
  });
});

describe('roundingNote — the rule travels with the arithmetic', () => {
  it('states per-line tax and the proportional discount', () => {
    const note = roundingNote(2);
    expect(note).toContain('on each line');
    expect(note).toContain('in proportion');
    expect(note).toContain('half up');
  });

  it('names the unit a zero-decimal currency rounds to', () => {
    expect(roundingNote(0)).toContain('whole unit');
    expect(roundingNote(3)).toContain('thousandth');
  });
});
