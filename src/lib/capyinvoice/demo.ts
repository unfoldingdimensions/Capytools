/**
 * CapyInvoice — the example document.
 *
 * The demo is the server snapshot, so the first paint of the page shows a
 * real document and hydration matches; on a first visit the store seeds it,
 * teaching instead of opening blank. Ids are fixed literals so the demo is
 * byte-stable across sessions and tests.
 */

import type { InvoiceDoc } from './types';

export const DEMO_INVOICE: InvoiceDoc = {
  version: 1,
  kind: 'invoice',
  number: 'INV-2026-041',
  issueDate: '2026-10-01',
  dueDate: '2026-10-31',
  fromName: 'Meridian Design Studio',
  fromDetails: '48 Callow Lane\nBristol BS1 5QT\nVAT GB 372 8841 05',
  toName: 'Harbor & Lane Coffee Co.',
  toDetails: '12 Quay Street\nBristol BS1 4HT',
  logoDataUrl: '',
  currency: 'GBP',
  lines: [
    {
      id: 'line-brand',
      description: 'Brand identity — logo, palette and type sheet',
      qty: 1,
      unitPriceMinor: 120000,
      taxBp: 2000,
    },
    {
      id: 'line-signage',
      description: 'Signage artwork, two fascias',
      qty: 2,
      unitPriceMinor: 34000,
      taxBp: 2000,
    },
    {
      id: 'line-hours',
      description: 'Consulting — launch week (3.5 hours)',
      qty: 3.5,
      unitPriceMinor: 9000,
      taxBp: 0,
    },
  ],
  discountMode: 'percent',
  discountBp: 500,
  discountMinor: 0,
  amountPaidMinor: 50000,
  paymentDetails: 'Sort code 04-00-75 · Account 3192 6840\nReference: INV-2026-041',
  notes: 'Working files are handed over on final payment.',
  terms: 'Payment due within 30 days. Late payments accrue interest at 4% above the Bank of England base rate.',
  updatedAt: '2026-10-01T09:00:00.000Z',
};
