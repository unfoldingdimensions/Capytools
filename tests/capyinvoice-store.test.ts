// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INVOICE_DOC_KEY,
  BUSINESS_PROFILE_KEY,
} from '@/lib/capyinvoice/keys';
import {
  __resetStoreCache,
  clearInvoice,
  getSnapshot,
  hasStoredInvoice,
  saveInvoice,
  StorageUnavailableError,
  subscribe,
} from '@/lib/capyinvoice/store';
import {
  __resetBusinessCache,
  clearBusiness,
  getBusinessSnapshot,
  saveBusiness,
} from '@/lib/capyinvoice/business';
import {
  __resetPrefsCache,
  getPaperSize,
  setPaperSize,
} from '@/lib/capyinvoice/prefs';
import {
  emptyBusinessProfile,
  emptyInvoiceDoc,
  emptyLine,
  isInvoiceEmpty,
  migrate,
  migrateBusiness,
} from '@/lib/capyinvoice/schema';
import { DEMO_INVOICE } from '@/lib/capyinvoice/demo';
import { INVOICE_SCHEMA_VERSION, type InvoiceDoc } from '@/lib/capyinvoice/types';

beforeEach(() => {
  window.localStorage.clear();
  __resetStoreCache();
  __resetBusinessCache();
  __resetPrefsCache();
});

describe('capyinvoice/schema — migrate never throws', () => {
  it('turns junk into a valid empty document', () => {
    for (const junk of [null, undefined, 42, 'not json', '{ truncated', [], {}, '""']) {
      const doc = migrate(junk);
      expect(doc.kind).toBe('invoice');
      expect(doc.currency).toBe('USD');
      expect(Array.isArray(doc.lines)).toBe(true);
      expect(doc.lines.length).toBeGreaterThan(0);
    }
  });

  it('accepts its own JSON string output', () => {
    const doc = migrate(JSON.stringify(DEMO_INVOICE));
    expect(doc.number).toBe('INV-2026-041');
    expect(doc.lines).toHaveLength(3);
    expect(doc.lines[2]!.qty).toBe(3.5);
  });

  it('repairs the fields it can and drops the ones it cannot trust', () => {
    const doc = migrate({
      kind: 'iou', // not a kind → invoice
      currency: 'gbp', // uppercased
      number: 41, // not a string → ''
      issueDate: '01/10/2026', // not ISO → ''
      dueDate: '2026-10-31',
      qty: 'x',
      lines: [{ description: 'Poster', qty: 2, unitPriceMinor: '5', taxBp: -5, extra: true }],
      logoDataUrl: 'https://example.com/logo.png', // remote → dropped: the PDF must never fetch
      discountBp: -10, // negative → 0
      amountPaidMinor: 'x',
    });
    expect(doc.kind).toBe('invoice');
    expect(doc.currency).toBe('GBP');
    expect(doc.number).toBe('');
    expect(doc.issueDate).toBe('');
    expect(doc.dueDate).toBe('2026-10-31');
    expect(doc.lines[0]!.description).toBe('Poster');
    expect(doc.lines[0]!.qty).toBe(2);
    expect(doc.lines[0]!.unitPriceMinor).toBe(0);
    expect(doc.lines[0]!.taxBp).toBe(0);
    expect(doc.logoDataUrl).toBe('');
    expect(doc.discountBp).toBe(0);
    expect(doc.amountPaidMinor).toBe(0);
  });

  it('keeps a data-URL logo and stamps the current version', () => {
    const doc = migrate({
      logoDataUrl: 'data:image/png;base64,AAAA',
      version: 0,
    });
    expect(doc.logoDataUrl).toBe('data:image/png;base64,AAAA');
    expect(doc.version).toBe(INVOICE_SCHEMA_VERSION);
  });

  it('drops a logo whose data URL is absurdly large', () => {
    const huge = `data:image/png;base64,${'A'.repeat(800_000)}`;
    expect(migrate({ logoDataUrl: huge }).logoDataUrl).toBe('');
  });

  it('mints ids for lines that arrive without one', () => {
    const doc = migrate({ lines: [{ description: 'x' }, {}] });
    expect(doc.lines[0]!.id).toBeTruthy();
    expect(doc.lines[1]!.id).toBeTruthy();
    expect(doc.lines[0]!.id).not.toBe(doc.lines[1]!.id);
  });
});

describe('capyinvoice/schema — emptiness', () => {
  it('a fresh document is empty, and one typed description is not', () => {
    expect(isInvoiceEmpty(emptyInvoiceDoc())).toBe(true);
    const doc = emptyInvoiceDoc();
    doc.lines[0]!.description = 'Poster';
    expect(isInvoiceEmpty(doc)).toBe(false);
  });

  it('a discount, a payment or a logo all count as content', () => {
    expect(isInvoiceEmpty({ ...emptyInvoiceDoc(), discountMinor: 5 })).toBe(false);
    expect(isInvoiceEmpty({ ...emptyInvoiceDoc(), amountPaidMinor: 5 })).toBe(false);
    expect(isInvoiceEmpty({ ...emptyInvoiceDoc(), logoDataUrl: 'data:image/png;base64,AA' })).toBe(false);
    expect(isInvoiceEmpty({ ...emptyInvoiceDoc(), issueDate: '2026-10-01' })).toBe(false);
  });

  it('a typed price on the default row counts too', () => {
    const doc = emptyInvoiceDoc();
    doc.lines[0]!.unitPriceMinor = 100;
    expect(isInvoiceEmpty(doc)).toBe(false);
  });
});

describe('capyinvoice/store — the draft', () => {
  it('namespaces the key by schema version', () => {
    expect(INVOICE_DOC_KEY).toBe(`capyinvoice.doc.v${INVOICE_SCHEMA_VERSION}`);
  });

  it('round-trips a draft through localStorage', () => {
    const draft = emptyInvoiceDoc();
    draft.number = 'INV-7';
    draft.lines.push(emptyLine());
    saveInvoice(draft);
    __resetStoreCache(); // a fresh page load

    expect(getSnapshot().number).toBe('INV-7');
    expect(getSnapshot().lines).toHaveLength(2);
  });

  it('stamps the schema version and a fresh updatedAt on write', () => {
    const draft = emptyInvoiceDoc();
    draft.version = 0;
    draft.updatedAt = '1999-01-01T00:00:00.000Z';
    const saved = saveInvoice(draft);
    expect(saved.version).toBe(INVOICE_SCHEMA_VERSION);
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse('2020-01-01T00:00:00.000Z'));
  });

  it('returns a stable snapshot reference while the bytes are unchanged', () => {
    expect(getSnapshot()).toBe(getSnapshot());
    const before = getSnapshot();
    saveInvoice({ ...emptyInvoiceDoc(), number: 'X' });
    expect(getSnapshot()).not.toBe(before);
    expect(getSnapshot()).toBe(getSnapshot());
  });

  it('survives a corrupt blob, clears, and reports what is stored', () => {
    window.localStorage.setItem(INVOICE_DOC_KEY, '{ not json');
    __resetStoreCache();
    expect(() => getSnapshot()).not.toThrow();
    expect(hasStoredInvoice()).toBe(true);

    clearInvoice();
    expect(hasStoredInvoice()).toBe(false);
    expect(window.localStorage.getItem(INVOICE_DOC_KEY)).toBeNull();
  });

  it('keeps editing in memory while storage refuses, then hands back', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveInvoice({ ...emptyInvoiceDoc(), number: 'ADA' })).toThrow(
      StorageUnavailableError,
    );
    expect(getSnapshot().number).toBe('ADA'); // the keystroke is not reverted
    setItem.mockRestore();

    saveInvoice({ ...emptyInvoiceDoc(), number: 'ADA L' });
    expect(getSnapshot().number).toBe('ADA L');
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    saveInvoice(emptyInvoiceDoc());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    saveInvoice(emptyInvoiceDoc());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('capyinvoice/business — the profile store', () => {
  it('keeps the profile under its own key, independent of the draft', () => {
    expect(BUSINESS_PROFILE_KEY).toBe('capyinvoice.business.v1');

    saveBusiness({ ...emptyBusinessProfile(), name: 'Meridian', currency: 'GBP' });
    saveInvoice({ ...emptyInvoiceDoc(), number: 'KEEP' });
    __resetBusinessCache();
    __resetStoreCache();
    expect(getBusinessSnapshot().name).toBe('Meridian');
    expect(getSnapshot().number).toBe('KEEP');

    clearBusiness();
    expect(getBusinessSnapshot().name).toBe('');
    expect(getSnapshot().number).toBe('KEEP'); // clearing the profile leaves the draft alone
  });

  it('migrateBusiness renders junk into a valid profile', () => {
    const profile = migrateBusiness({ name: 'Studio', currency: 'gbp', logoDataUrl: 'https://x.example/l.png' });
    expect(profile.name).toBe('Studio');
    expect(profile.currency).toBe('GBP');
    expect(profile.logoDataUrl).toBe('');
    expect(profile.version).toBe(INVOICE_SCHEMA_VERSION);
    expect(migrateBusiness('not json').name).toBe('');
  });

  it('round-trips the profile, migrating on read', () => {
    const saved = saveBusiness({
      ...emptyBusinessProfile(),
      name: 'Meridian Design Studio',
      details: '48 Callow Lane',
      currency: 'gbp', // save stores as typed; every read migrates
      paymentDetails: 'Sort 04-00-75',
    });
    expect(saved.version).toBe(INVOICE_SCHEMA_VERSION);
    __resetBusinessCache();
    expect(getBusinessSnapshot().name).toBe('Meridian Design Studio');
    expect(getBusinessSnapshot().currency).toBe('GBP');
  });
});

describe('capyinvoice/prefs — paper size under its own key', () => {
  it('persists and validates', () => {
    expect(getPaperSize()).toBe('A4');
    setPaperSize('LETTER');
    expect(getPaperSize()).toBe('LETTER');
    __resetPrefsCache();
    expect(getPaperSize()).toBe('LETTER');

    setPaperSize('A3' as never);
    expect(getPaperSize()).toBe('A4');
  });

  it('does not share storage with CapyResume', () => {
    window.localStorage.setItem('capyresume.papersize.v1', 'LETTER');
    __resetPrefsCache();
    expect(getPaperSize()).toBe('A4');
  });
});

describe('capyinvoice/schema — the draft as a doc', () => {
  it('migrate of an empty string yields an empty invoice with one blank line', () => {
    const doc: InvoiceDoc = migrate('');
    expect(doc.lines).toHaveLength(1);
    expect(doc.lines[0]!.qty).toBe(1);
  });
});
