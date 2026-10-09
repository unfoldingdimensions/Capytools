/**
 * CapyInvoice — JSON import/export.
 *
 * Same shape as CapyResume's: `localStorage` is a convenience, not a vault —
 * clearing site data wipes the draft, so the JSON backup is the user's escape
 * hatch and is unlimited and unconditional. Both directions run through
 * `migrate()`, so a file written by an older build still imports and a
 * hand-edited file cannot crash the app.
 */

import { fileNameSafe } from './format';
import { INVOICE_SCHEMA_VERSION, type DocKind, type InvoiceDoc } from './types';
import { isInvoiceEmpty, migrate } from './schema';

/** A download filename stem for any export format: `inv-0042.pdf`. */
export function invoiceFileName(doc: InvoiceDoc, extension: string, kind: DocKind = doc.kind): string {
  const stem = fileNameSafe(doc.number || kind, kind);
  const ext = extension.replace(/^\./, '');
  return `${stem}.${ext}`;
}

/**
 * The JSON backup is named differently on purpose, as in CapyResume: it lands
 * in a downloads folder, where `inv-0042.json` says nothing about what it is.
 */
export function invoiceBackupFileName(doc: InvoiceDoc): string {
  return `invoice-${fileNameSafe(doc.number || 'backup', 'backup')}.json`;
}

/** Pretty-printed so a user can open, read and hand-edit their own data. */
export function exportInvoiceJson(doc: InvoiceDoc): string {
  const stamped: InvoiceDoc = { ...doc, version: INVOICE_SCHEMA_VERSION };
  return `${JSON.stringify(stamped, null, 2)}\n`;
}

/**
 * Parse a JSON backup. Never throws: anything unreadable degrades to a valid
 * (possibly empty) document via `migrate()`, so a bad file cannot brick the app.
 */
export function importInvoiceJson(text: string): InvoiceDoc {
  return migrate(text);
}

/** A real backup is a few KB unless a logo rides in it; anything past this is not one. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

/**
 * Read a file the user picked as a backup, refusing what is not one.
 *
 * `importInvoiceJson` never throws — right for storage, wrong for an import
 * that is about to replace the open draft: an unrelated or truncated file
 * would silently become an empty document. Here a file must parse, be an
 * object that carries the document's own fields, and hold something, or the
 * import is refused with a reason.
 */
export function parseInvoiceBackup(text: string): { doc: InvoiceDoc } | { error: string } {
  const notOurs = "That file isn't a CapyInvoice backup — pick the .json the backup button saved.";
  if (!looksLikeInvoiceJson(text)) return { error: notOurs };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'That backup is damaged (it is not valid JSON), so nothing was replaced.' };
  }
  if (typeof raw !== 'object' || raw === null || !('lines' in raw || 'kind' in raw)) {
    return { error: notOurs };
  }
  const doc = migrate(raw);
  if (isInvoiceEmpty(doc)) return { error: 'That backup is empty, so nothing was replaced.' };
  return { doc };
}

/** True when the text looks like a JSON backup we should accept. */
export function looksLikeInvoiceJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}
