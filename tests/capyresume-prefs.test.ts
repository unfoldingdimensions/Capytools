// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_PAPER_SIZE,
  PAPER_SIZES,
  __resetPrefsCache,
  getPaperSize,
  getPaperSizeServerSnapshot,
  setPaperSize,
  subscribe,
} from '@/lib/capyresume/prefs';
import { PAPER_SIZE_KEY, RESUME_STORAGE_KEY } from '@/lib/capyresume/keys';

beforeEach(() => {
  window.localStorage.clear();
  __resetPrefsCache();
});

describe('capyresume/prefs — key', () => {
  it('uses its own versioned key', () => {
    expect(PAPER_SIZE_KEY).toBe('capyresume.papersize.v1');
  });

  it('is distinct from the résumé key, so changing paper cannot touch the résumé', () => {
    expect(PAPER_SIZE_KEY).not.toBe(RESUME_STORAGE_KEY);
  });
});

describe('capyresume/prefs — reading untrusted storage', () => {
  it('defaults to A4 when nothing is stored', () => {
    expect(getPaperSize()).toBe(DEFAULT_PAPER_SIZE);
    expect(DEFAULT_PAPER_SIZE).toBe('A4');
  });

  it.each(['', 'a4', 'Letter', 'A3', '{"size":"A4"}', 'null'])(
    'degrades %p to the default rather than trusting it',
    (raw) => {
      window.localStorage.setItem(PAPER_SIZE_KEY, raw);
      __resetPrefsCache();
      expect(getPaperSize()).toBe(DEFAULT_PAPER_SIZE);
    }
  );

  it('accepts a valid stored value', () => {
    window.localStorage.setItem(PAPER_SIZE_KEY, 'LETTER');
    __resetPrefsCache();
    expect(getPaperSize()).toBe('LETTER');
  });

  it('returns a referentially stable value for unchanged bytes', () => {
    expect(getPaperSize()).toBe(getPaperSize());
  });

  it('gives the server render the default', () => {
    expect(getPaperSizeServerSnapshot()).toBe(DEFAULT_PAPER_SIZE);
  });

  it('offers exactly the two paper sizes the exports support', () => {
    expect([...PAPER_SIZES]).toEqual(['A4', 'LETTER']);
  });
});

describe('capyresume/prefs — writing', () => {
  it('persists a choice so a reload keeps it', () => {
    setPaperSize('LETTER');
    __resetPrefsCache();
    expect(getPaperSize()).toBe('LETTER');
    expect(window.localStorage.getItem(PAPER_SIZE_KEY)).toBe('LETTER');
  });

  it('notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setPaperSize('LETTER');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('keeps the choice in memory even when storage refuses to persist', () => {
    // jsdom's localStorage is a proxy, so the prototype is the reliable seam.
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    setPaperSize('LETTER');
    expect(getPaperSize()).toBe('LETTER');

    setItem.mockRestore();
  });

  it('does not touch the résumé', () => {
    window.localStorage.setItem(RESUME_STORAGE_KEY, '{"version":1}');
    setPaperSize('LETTER');
    expect(window.localStorage.getItem(RESUME_STORAGE_KEY)).toBe('{"version":1}');
  });
});
