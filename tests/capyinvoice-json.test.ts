import { describe, expect, it } from 'vitest';
import {
  exportInvoiceJson,
  importInvoiceJson,
  invoiceBackupFileName,
  invoiceFileName,
  looksLikeInvoiceJson,
  MAX_BACKUP_BYTES,
  parseInvoiceBackup,
} from '@/lib/capyinvoice/json';
import { emptyInvoiceDoc, isInvoiceEmpty } from '@/lib/capyinvoice/schema';
import { DEMO_INVOICE } from '@/lib/capyinvoice/demo';
import { INVOICE_SCHEMA_VERSION } from '@/lib/capyinvoice/types';

describe('capyinvoice/json — filenames', () => {
  it('names the PDF after the number when there is one', () => {
    expect(invoiceFileName(DEMO_INVOICE, 'pdf')).toBe('inv-2026-041.pdf');
  });

  it('falls back to the document kind when the number is blank', () => {
    expect(invoiceFileName(emptyInvoiceDoc(), 'pdf')).toBe('invoice.pdf');
    const quote = { ...emptyInvoiceDoc(), kind: 'quote' as const };
    expect(invoiceFileName(quote, 'pdf')).toBe('quote.pdf');
  });

  it('prefixes the JSON backup so it is identifiable among other downloads', () => {
    expect(invoiceBackupFileName(DEMO_INVOICE)).toBe('invoice-inv-2026-041.json');
    expect(invoiceBackupFileName(emptyInvoiceDoc())).toBe('invoice-backup.json');
  });
});

describe('capyinvoice/json — export', () => {
  it('stamps the schema version and pretty-prints', () => {
    const text = exportInvoiceJson({ ...emptyInvoiceDoc(), version: 0 });
    const parsed = JSON.parse(text);
    expect(parsed.version).toBe(INVOICE_SCHEMA_VERSION);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.split('\n').length).toBeGreaterThan(5); // pretty, not one line
  });
});

describe('capyinvoice/json — import', () => {
  it('round-trips a backup', () => {
    const doc = importInvoiceJson(exportInvoiceJson(DEMO_INVOICE));
    expect(doc.number).toBe(DEMO_INVOICE.number);
    expect(doc.lines).toHaveLength(3);
    expect(doc.amountPaidMinor).toBe(50000);
  });

  it('never throws on junk', () => {
    expect(isInvoiceEmpty(importInvoiceJson('garbage'))).toBe(true);
    expect(isInvoiceEmpty(importInvoiceJson('[]'))).toBe(true);
  });
});

describe('capyinvoice/json — parseInvoiceBackup refuses what is not one', () => {
  it('accepts a real backup', () => {
    const parsed = parseInvoiceBackup(exportInvoiceJson(DEMO_INVOICE));
    expect(parsed).toHaveProperty('doc');
    expect((parsed as { doc: { number: string } }).doc.number).toBe('INV-2026-041');
  });

  it('refuses a non-JSON file with a reason, and replaces nothing', () => {
    expect(parseInvoiceBackup('hello world')).toEqual({
      error: "That file isn't a CapyInvoice backup — pick the .json the backup button saved.",
    });
  });

  it('refuses a CapyResume backup — it parses, but it is not ours', () => {
    const resumeBackup = JSON.stringify({
      version: 1,
      contact: { name: 'Maya Okafor' },
      sections: [{ id: 's', type: 'summary', title: 'Summary', entries: [] }],
    });
    expect(parseInvoiceBackup(resumeBackup)).toHaveProperty('error');
  });

  it('refuses damaged JSON with its own reason', () => {
    // Passes the cheap shape check (it opens and closes with braces), fails to parse.
    const parsed = parseInvoiceBackup('{ "kind": "invoice" "oops" }');
    expect(parsed).toEqual({
      error: 'That backup is damaged (it is not valid JSON), so nothing was replaced.',
    });
  });

  it('refuses an empty document so an import cannot silently wipe the draft', () => {
    const parsed = parseInvoiceBackup(exportInvoiceJson(emptyInvoiceDoc()));
    expect(parsed).toEqual({ error: 'That backup is empty, so nothing was replaced.' });
  });
});

describe('capyinvoice/json — guards', () => {
  it('looksLikeInvoiceJson is a cheap shape check', () => {
    expect(looksLikeInvoiceJson('  {}  ')).toBe(true);
    expect(looksLikeInvoiceJson('[1]')).toBe(false);
    expect(looksLikeInvoiceJson('')).toBe(false);
  });

  it('caps backup size at logo-carrying scale', () => {
    // A data-URL logo can ride along, so the cap is a few MB, not a few KB.
    expect(MAX_BACKUP_BYTES).toBeGreaterThan(512 * 1024);
    expect(MAX_BACKUP_BYTES).toBeLessThan(10 * 1024 * 1024);
  });
});
