// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AI_SETTINGS_KEY,
  EMPTY_AI_SETTINGS,
  __resetAiCache,
  clearAiSettings,
  getAiServerSnapshot,
  getAiSettings,
  maskApiKey,
  saveAiSettings,
  subscribe,
} from '@/lib/capyresume/ai/keys';
import { AI_SETTINGS_KEY as CANONICAL_KEY, RESUME_STORAGE_KEY } from '@/lib/capyresume/keys';
import { DEFAULT_PROVIDER_ID } from '@/lib/capyresume/ai/providers';

beforeEach(() => {
  window.localStorage.clear();
  __resetAiCache();
});

describe('capyresume/ai/keys — the storage key', () => {
  it('is a single canonical constant the cookie policy can cite', () => {
    expect(AI_SETTINGS_KEY).toBe('capyresume.ai.v1');
    expect(AI_SETTINGS_KEY).toBe(CANONICAL_KEY);
  });

  it('is distinct from the résumé key so removing a key cannot touch the résumé', () => {
    expect(AI_SETTINGS_KEY).not.toBe(RESUME_STORAGE_KEY);
  });
});

describe('capyresume/ai/keys — reading untrusted storage', () => {
  it('returns a keyless default when nothing is stored', () => {
    expect(getAiSettings()).toEqual(EMPTY_AI_SETTINGS);
    expect(getAiSettings().apiKey).toBe('');
  });

  it.each(['', '   ', 'not json', '{ broken', '[]', 'null', '42', '"a string"'])(
    'degrades %p to a keyless default instead of throwing',
    (raw) => {
      window.localStorage.setItem(AI_SETTINGS_KEY, raw);
      __resetAiCache();

      const settings = getAiSettings();
      expect(settings.apiKey).toBe('');
      expect(settings.providerId).toBe(DEFAULT_PROVIDER_ID);
    }
  );

  it('rejects an unknown provider rather than handing it to the request layer', () => {
    window.localStorage.setItem(
      AI_SETTINGS_KEY,
      JSON.stringify({ providerId: 'evil-endpoint', apiKey: 'k', model: 'm' })
    );
    __resetAiCache();
    expect(getAiSettings().providerId).toBe(DEFAULT_PROVIDER_ID);
  });

  it('coerces non-string fields and strips whitespace', () => {
    window.localStorage.setItem(
      AI_SETTINGS_KEY,
      JSON.stringify({ providerId: 'gemini', apiKey: '  padded  ', model: 42, baseUrl: null })
    );
    __resetAiCache();

    const settings = getAiSettings();
    expect(settings.apiKey).toBe('padded');
    expect(settings.model).toBe('');
    expect(settings.baseUrl).toBe('');
  });

  it('returns a referentially stable snapshot for unchanged bytes', () => {
    // React's useSyncExternalStore compares with Object.is.
    const first = getAiSettings();
    const second = getAiSettings();
    expect(first).toBe(second);
  });

  it('gives the server render an explicit keyless snapshot', () => {
    expect(getAiServerSnapshot()).toBe(EMPTY_AI_SETTINGS);
    expect(getAiServerSnapshot().apiKey).toBe('');
  });
});

describe('capyresume/ai/keys — saving and removing', () => {
  it('persists and reads back', () => {
    saveAiSettings({ providerId: 'anthropic', apiKey: 'sk-test', model: 'claude', baseUrl: '' });
    __resetAiCache();

    const settings = getAiSettings();
    expect(settings.providerId).toBe('anthropic');
    expect(settings.apiKey).toBe('sk-test');
  });

  it('trims the key rather than storing stray whitespace from a paste', () => {
    saveAiSettings({ providerId: 'openai', apiKey: '  sk-padded\n', model: '', baseUrl: '' });
    expect(getAiSettings().apiKey).toBe('sk-padded');
  });

  it('notifies subscribers on save and on removal', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    saveAiSettings({ providerId: 'openai', apiKey: 'sk-1', model: '', baseUrl: '' });
    expect(listener).toHaveBeenCalledTimes(1);

    clearAiSettings();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('removes the key from storage entirely, not just from memory', () => {
    saveAiSettings({ providerId: 'openai', apiKey: 'sk-secret', model: '', baseUrl: '' });
    clearAiSettings();
    __resetAiCache();

    expect(window.localStorage.getItem(AI_SETTINGS_KEY)).toBeNull();
    expect(getAiSettings().apiKey).toBe('');
  });

  it('clearing the key leaves the résumé untouched', () => {
    window.localStorage.setItem('capyresume.resume.v1', JSON.stringify({ version: 1 }));
    saveAiSettings({ providerId: 'openai', apiKey: 'sk-secret', model: '', baseUrl: '' });
    clearAiSettings();

    expect(window.localStorage.getItem('capyresume.resume.v1')).not.toBeNull();
  });
});

describe('capyresume/ai/keys — maskApiKey never reveals the key', () => {
  it('shows a shortened hint and hides the middle', () => {
    const key = 'sk-abcdefghijklmnopqrstuvwxyz';
    const masked = maskApiKey(key);

    expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(masked).toContain(key.slice(-4));
    expect(masked).toContain('…');
  });

  it('hides a short key entirely', () => {
    const masked = maskApiKey('shortkey');
    expect(masked).not.toContain('shortkey');
    expect(masked).toBe('••••••••');
  });

  it('returns an empty string for no key, so the UI can render nothing', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey('    ')).toBe('');
  });
});

describe('capyresume/ai/keys — storage refusing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetAiCache();
  });

  it('a new key that cannot be stored replaces the old one for this session', () => {
    saveAiSettings({ ...EMPTY_AI_SETTINGS, apiKey: 'old-key-1234' });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    saveAiSettings({ ...EMPTY_AI_SETTINGS, apiKey: 'new-key-5678' });
    setItem.mockRestore();
    // Storage still holds the old key; it must not come back.
    expect(getAiSettings().apiKey).toBe('new-key-5678');
  });

  it('a key that cannot be deleted from storage is still no longer used', () => {
    saveAiSettings({ ...EMPTY_AI_SETTINGS, apiKey: 'old-key-1234' });
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    clearAiSettings();
    removeItem.mockRestore();
    expect(getAiSettings().apiKey).toBe('');
  });
});
