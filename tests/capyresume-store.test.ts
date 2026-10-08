// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEY,
  StorageUnavailableError,
  __resetStoreCache,
  clearResume,
  getServerSnapshot,
  getSnapshot,
  hasStoredResume,
  saveResume,
  subscribe,
} from '@/lib/capyresume/store';
import { emptyResume, emptyEntry } from '@/lib/capyresume/schema';
import { RESUME_SCHEMA_VERSION, type ResumeDoc } from '@/lib/capyresume/types';

describe('capyresume/store — versioned key', () => {
  it('namespaces the key by schema version so a stale shape is never read back', () => {
    expect(STORAGE_KEY).toBe(`capyresume.resume.v${RESUME_SCHEMA_VERSION}`);

    // A document written by an older schema must be invisible to this reader.
    window.localStorage.setItem(
      'capyresume.resume.v0',
      JSON.stringify({ version: 0, contact: { name: 'Stale Person' }, sections: [] })
    );

    expect(getSnapshot().contact.name).not.toBe('Stale Person');
  });
});

describe('capyresume/store — snapshot referential stability', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetStoreCache();
  });

  it('returns an identical reference when the bytes have not changed', () => {
    // React's useSyncExternalStore compares with Object.is: a fresh parse per
    // call is an infinite render loop.
    const first = getSnapshot();
    const second = getSnapshot();
    expect(first).toBe(second);
  });

  it('ignores writes to unrelated keys', () => {
    const before = getSnapshot();
    window.localStorage.setItem('something-else', 'x'.repeat(100));
    expect(getSnapshot()).toBe(before);
  });

  it('returns a fresh reference after a genuine save', () => {
    const before = getSnapshot();
    const doc = emptyResume();
    doc.contact.name = 'Maya';
    const saved = saveResume(doc);

    const after = getSnapshot();
    expect(after).not.toBe(before);
    expect(after).toBe(getSnapshot());
    expect(after.contact.name).toBe('Maya');
    expect(after.updatedAt).toBe(saved.updatedAt);
  });

  it('keeps the server snapshot stable across calls', () => {
    expect(getServerSnapshot()).toBe(getServerSnapshot());
  });
});

describe('capyresume/store — persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetStoreCache();
  });

  it('round-trips a résumé through localStorage', () => {
    const doc = emptyResume();
    doc.contact.name = 'Maya Okafor';
    doc.sections[1]!.entries.push({
      ...emptyEntry(),
      title: 'Analyst',
      bullets: [{ id: 'b1', text: 'Cut costs' }],
    });

    saveResume(doc);
    __resetStoreCache(); // simulate a fresh page load

    const reloaded = getSnapshot();
    expect(reloaded.contact.name).toBe('Maya Okafor');
    expect(reloaded.sections[1]!.entries[0]!.bullets[0]!.text).toBe('Cut costs');
  });

  it('stamps the schema version and a fresh updatedAt on write', () => {
    const doc = emptyResume();
    doc.version = 0;
    doc.updatedAt = '1999-01-01T00:00:00.000Z';

    const saved = saveResume(doc);

    expect(saved.version).toBe(RESUME_SCHEMA_VERSION);
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse('2020-01-01T00:00:00.000Z'));
  });

  it('reports whether a résumé is stored', () => {
    expect(hasStoredResume()).toBe(false);
    saveResume(emptyResume());
    expect(hasStoredResume()).toBe(true);
    clearResume();
    expect(hasStoredResume()).toBe(false);
  });

  it('survives a corrupt stored blob instead of throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ this is not json');
    __resetStoreCache();

    let doc: ResumeDoc | undefined;
    expect(() => {
      doc = getSnapshot();
    }).not.toThrow();
    expect(doc!.contact.name).toBe('');
    expect(doc!.sections.length).toBeGreaterThan(0);
  });

  it('clears back to an empty document', () => {
    const doc = emptyResume();
    doc.contact.name = 'Maya';
    saveResume(doc);

    clearResume();

    const after = getSnapshot();
    expect(after.contact.name).toBe('');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('fails loudly when the browser refuses to persist', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveResume(emptyResume())).toThrow(StorageUnavailableError);

    setItem.mockRestore();
  });

  it('keeps editing in memory while storage refuses, and hands back to storage after', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const typed = { ...emptyResume(), contact: { ...emptyResume().contact, name: 'Ada' } };
    expect(() => saveResume(typed)).toThrow(StorageUnavailableError);
    // The keystroke is not reverted: the snapshot is the unsaved document.
    expect(getSnapshot().contact.name).toBe('Ada');
    setItem.mockRestore();

    const later = { ...typed, contact: { ...typed.contact, name: 'Ada L' } };
    saveResume(later);
    expect(getSnapshot().contact.name).toBe('Ada L');
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('Ada L');
  });
});

describe('capyresume/store — subscriptions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetStoreCache();
  });

  it('notifies subscribers on save and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    saveResume(emptyResume());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveResume(emptyResume());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on clear', () => {
    saveResume(emptyResume());
    const listener = vi.fn();
    subscribe(listener);

    clearResume();

    expect(listener).toHaveBeenCalled();
  });

  it('sees a write from another tab via the storage event', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    const other = emptyResume();
    other.contact.name = 'From Another Tab';
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(other));

    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSnapshot().contact.name).toBe('From Another Tab');

    unsubscribe();
  });
});
