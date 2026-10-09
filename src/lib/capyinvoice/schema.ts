/**
 * CapyInvoice — schema: factories + the migration guard.
 *
 * Pure module. `migrate()` is the safety net that makes the store
 * trustworthy: it accepts *anything* (a stale version, a hand-edited backup,
 * `null`, a half-written string) and always returns a valid `InvoiceDoc`. It
 * never throws, because throwing here would lose the user's only copy of
 * their draft.
 *
 * Two guards deserve their comment. A logo is only ever accepted as a
 * `data:` URL — anything remote would make the PDF renderer fetch it, and
 * this tool's promise is that no byte of the document touches a wire. And a
 * currency that is not three letters falls back to USD rather than reaching
 * Intl with junk.
 */

import { uid } from '../capytools/uid';
import {
  INVOICE_SCHEMA_VERSION,
  type BusinessProfile,
  type DiscountMode,
  type DocKind,
  type InvoiceDoc,
  type InvoiceLine,
} from './types';

export { uid };

export const DEFAULT_CURRENCY = 'USD';

const KINDS: readonly DocKind[] = ['invoice', 'quote', 'receipt'];
const DISCOUNT_MODES: readonly DiscountMode[] = ['percent', 'fixed'];

/** A picked logo is downscaled to at most this edge before it is stored. */
export const LOGO_MAX_EDGE = 480;
/** A stored logo data URL may not exceed this length (~512 KB of binary). */
export const LOGO_MAX_DATA_URL_CHARS = 700_000;

export function emptyLine(): InvoiceLine {
  return { id: uid('line'), description: '', qty: 1, unitPriceMinor: 0, taxBp: 0 };
}

export function emptyInvoiceDoc(): InvoiceDoc {
  return {
    version: INVOICE_SCHEMA_VERSION,
    kind: 'invoice',
    number: '',
    issueDate: '',
    dueDate: '',
    fromName: '',
    fromDetails: '',
    toName: '',
    toDetails: '',
    logoDataUrl: '',
    currency: DEFAULT_CURRENCY,
    lines: [emptyLine()],
    discountMode: 'percent',
    discountBp: 0,
    discountMinor: 0,
    amountPaidMinor: 0,
    paymentDetails: '',
    notes: '',
    terms: '',
    updatedAt: new Date().toISOString(),
  };
}

export function emptyBusinessProfile(): BusinessProfile {
  return {
    version: INVOICE_SCHEMA_VERSION,
    name: '',
    details: '',
    logoDataUrl: '',
    currency: DEFAULT_CURRENCY,
    paymentDetails: '',
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Coercion helpers — total functions, never throw.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asIsoDay(value: unknown): string {
  const raw = asString(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

/**
 * A logo is a data URL, sized to fit, or nothing. A remote URL is dropped on
 * purpose: rendering one would fetch it, and nothing in this tool fetches.
 */
function asLogoDataUrl(value: unknown): string {
  const raw = asString(value);
  if (!raw.startsWith('data:image/')) return '';
  return raw.length <= LOGO_MAX_DATA_URL_CHARS ? raw : '';
}

function asCurrency(value: unknown): string {
  const raw = asString(value).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : DEFAULT_CURRENCY;
}

/** Money integers: anything finite becomes an integer; junk becomes 0. */
function asMinor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

function asQty(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.max(0, value);
}

function asKind(value: unknown): DocKind {
  const raw = asString(value);
  return (KINDS as readonly string[]).includes(raw) ? (raw as DocKind) : 'invoice';
}

function asDiscountMode(value: unknown): DiscountMode {
  const raw = asString(value);
  return (DISCOUNT_MODES as readonly string[]).includes(raw) ? (raw as DiscountMode) : 'percent';
}

function asId(value: unknown, prefix: string): string {
  const text = asString(value);
  return text && text.trim().length > 0 ? text : uid(prefix);
}

function asLine(value: unknown): InvoiceLine {
  if (!isRecord(value)) return emptyLine();
  return {
    id: asId(value.id, 'line'),
    description: asString(value.description),
    qty: asQty(value.qty),
    unitPriceMinor: asMinor(value.unitPriceMinor),
    taxBp: Math.max(0, asMinor(value.taxBp)),
  };
}

function asLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asLine(item));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Turn arbitrary persisted input into a valid `InvoiceDoc`.
 *
 * Accepts a JSON string, a parsed object, a legacy shape, `null`, or junk.
 * Always returns a usable document and never throws.
 */
export function migrate(raw: unknown): InvoiceDoc {
  let input: unknown = raw;

  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) return emptyInvoiceDoc();
    try {
      input = JSON.parse(text);
    } catch {
      return emptyInvoiceDoc();
    }
  }

  if (!isRecord(input)) return emptyInvoiceDoc();

  const lines = asLines(input.lines);

  return {
    version: INVOICE_SCHEMA_VERSION,
    kind: asKind(input.kind),
    number: asString(input.number),
    issueDate: asIsoDay(input.issueDate),
    dueDate: asIsoDay(input.dueDate),
    fromName: asString(input.fromName),
    fromDetails: asString(input.fromDetails),
    toName: asString(input.toName),
    toDetails: asString(input.toDetails),
    logoDataUrl: asLogoDataUrl(input.logoDataUrl),
    currency: asCurrency(input.currency),
    lines: lines.length > 0 ? lines : emptyInvoiceDoc().lines,
    discountMode: asDiscountMode(input.discountMode),
    discountBp: Math.max(0, asMinor(input.discountBp)),
    discountMinor: Math.max(0, asMinor(input.discountMinor)),
    amountPaidMinor: asMinor(input.amountPaidMinor),
    paymentDetails: asString(input.paymentDetails),
    notes: asString(input.notes),
    terms: asString(input.terms),
    updatedAt: new Date().toISOString(),
  };
}

/** Same guarantee, for the business profile. */
export function migrateBusiness(raw: unknown): BusinessProfile {
  let input: unknown = raw;

  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) return emptyBusinessProfile();
    try {
      input = JSON.parse(text);
    } catch {
      return emptyBusinessProfile();
    }
  }

  if (!isRecord(input)) return emptyBusinessProfile();

  return {
    version: INVOICE_SCHEMA_VERSION,
    name: asString(input.name),
    details: asString(input.details),
    logoDataUrl: asLogoDataUrl(input.logoDataUrl),
    currency: asCurrency(input.currency),
    paymentDetails: asString(input.paymentDetails),
    updatedAt: new Date().toISOString(),
  };
}

/** True when the draft holds nothing a user would recognise as content yet. */
export function isInvoiceEmpty(doc: InvoiceDoc): boolean {
  const hasText = Boolean(
    doc.number.trim() ||
      doc.fromName.trim() ||
      doc.fromDetails.trim() ||
      doc.toName.trim() ||
      doc.toDetails.trim() ||
      doc.logoDataUrl ||
      doc.paymentDetails.trim() ||
      doc.notes.trim() ||
      doc.terms.trim() ||
      doc.issueDate ||
      doc.dueDate ||
      doc.discountBp > 0 ||
      doc.discountMinor > 0 ||
      doc.amountPaidMinor !== 0,
  );
  if (hasText) return false;

  return doc.lines.every(
    (line) =>
      !line.description.trim() && line.unitPriceMinor === 0 && (line.qty === 1 || line.qty === 0),
  );
}

/** True when the profile holds nothing a user would recognise as content yet. */
export function isBusinessEmpty(profile: BusinessProfile): boolean {
  return !(
    profile.name.trim() ||
    profile.details.trim() ||
    profile.logoDataUrl ||
    profile.paymentDetails.trim()
  );
}
