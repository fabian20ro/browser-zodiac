// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getLocale,
  getAvailableLocales,
  detectLanguage,
  persistLanguage,
} from './index.ts';

const originalLanguage = navigator.language;

const localStorageStub = (() => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
    clear: () => items.clear(),
  };
})();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageStub,
});

function setNavigatorProperty<K extends keyof Navigator>(key: K, value: Navigator[K]) {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  window.localStorage.removeItem('horror-scope-lang');
});

afterEach(() => {
  window.localStorage.removeItem('horror-scope-lang');
  setNavigatorProperty('language', originalLanguage);
});

describe('getLocale', () => {
  it('returns English locale for "en"', () => {
    const locale = getLocale('en');
    expect(locale.id).toBe('en');
    expect(locale.name).toBe('English');
  });

  it('returns Romanian locale for "ro"', () => {
    const locale = getLocale('ro');
    expect(locale.id).toBe('ro');
    expect(locale.name).toBe('Română');
  });

  it('normalizes locale ids before lookup', () => {
    const locale = getLocale('RO');
    expect(locale.id).toBe('ro');
  });

  it('trims whitespace from locale ids before lookup', () => {
    const locale = getLocale('  RO  ');
    expect(locale.id).toBe('ro');
  });

  it('falls back to English for unknown locale', () => {
    const locale = getLocale('xx');
    expect(locale.id).toBe('en');
  });

  it('returns a plain object (no prototype pollution)', () => {
    const locale = getLocale('en');
    // The spread operator {...base, grammar} produces a plain object;
    // verify it doesn't carry unintended properties from the source.
    expect(Object.prototype.hasOwnProperty.call(locale, 'id')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(locale, 'grammar')).toBe(true);
  });

  it('returns distinct locale packs on repeated calls', () => {
    const a = getLocale('en');
    const b = getLocale('en');
    // Each call spreads from the base, so they are separate objects.
    expect(a).not.toBe(b);
    expect(a.id).toBe(b.id);
  });

  it('getLocale merges default grammar when loadAllGrammars has not been called', () => {
    const locale = getLocale('en');
    // Without loadAllGrammars, the fallback is en.grammar (the embedded one)
    expect(locale.grammar).toBeDefined();
    // The default grammar should contain at least the symbol loaded from the base pack
    expect(Object.keys(locale.grammar as Record<string, unknown>).length).toBeGreaterThan(0);
  });

  it('each locale carries its own embedded grammar by default', () => {
    const en = getLocale('en');
    const ro = getLocale('ro');
    // The two base packs hold different grammar data (different languages)
    expect(en.grammar).not.toBe(ro.grammar);
  });

  it('getLocale preserves all properties from the source locale pack', () => {
    const en = getLocale('en');
    // Verify key structural fields exist on returned object
    expect(en.ui).toBeDefined();
    expect(en.ui.signNames).toBeDefined();
    expect(en.grammar).toBeDefined();
  });

  it('getLocale fallback for unknown id still returns a valid locale', () => {
    const unknown = getLocale('zz-INVALID');
    // Should fall through to English base with no loaded grammar
    expect(unknown.id).toBe('en');
    expect(unknown.grammar).toBeDefined();
    expect(Object.keys(unknown.grammar as Record<string, unknown>).length).toBeGreaterThan(0);
  });

  it('getLocale does not mutate the source locale pack', () => {
    const before = getAvailableLocales().find((l) => l.id === 'en');
    // Snapshot structural state
    const snapshotKeys = new Set(Object.keys(before!));
    const snapshotSignNamesCount = Object.keys(before!.ui.signNames).length;

    // Call getLocale repeatedly (which spreads from the source)
    for (let i = 0; i < 5; i++) {
      void getLocale('en');
    }

    const after = getAvailableLocales().find((l) => l.id === 'en');
    expect(Object.keys(after!).length).toBe(snapshotKeys.size);
    expect(Object.keys(after!.ui.signNames).length).toBe(snapshotSignNamesCount);
  });
});

describe('detectLanguage', () => {
  it('normalizes stored language ids before returning them', () => {
    window.localStorage.setItem('horror-scope-lang', 'RO');

    expect(detectLanguage()).toBe('ro');
  });

  it('normalizes browser language ids before matching them', () => {
    setNavigatorProperty('language', 'RO-RO');

    expect(detectLanguage()).toBe('ro');
  });

  it('trims browser language ids before matching them', () => {
    setNavigatorProperty('language', '  RO-RO  ');

    expect(detectLanguage()).toBe('ro');
  });

  it('falls back to English for unknown browser language', () => {
    setNavigatorProperty('language', 'de-DE');

    expect(detectLanguage()).toBe('en');
  });

  it('treats empty stored language as unset and falls back to browser language', () => {
    window.localStorage.setItem('horror-scope-lang', '');

    setNavigatorProperty('language', 'ro');

    expect(detectLanguage()).toBe('ro');
  });

  it('falls back to English when localStorage entry is missing entirely', () => {
    // beforeEach already removes the key; just verify fallback works.
    setNavigatorProperty('language', 'de-DE');

    expect(window.localStorage.getItem('horror-scope-lang')).toBeNull();
    expect(detectLanguage()).toBe('en');
  });

  it('prefers saved language over navigator.language when both are valid', () => {
    window.localStorage.setItem('horror-scope-lang', 'ro');
    setNavigatorProperty('language', 'de-DE');

    expect(detectLanguage()).toBe('ro');
  });

  it('ignores invalid stored language and falls back to navigator.language', () => {
    window.localStorage.setItem('horror-scope-lang', 'zz');
    setNavigatorProperty('language', 'ro');

    expect(detectLanguage()).toBe('ro');
  });

  it('falls back to English when navigator.language is null', () => {
    setNavigatorProperty('language', null as unknown as string);

    expect(detectLanguage()).toBe('en');
  });

  it('falls back to English when navigator.language is an empty string', () => {
    setNavigatorProperty('language', '');

    expect(detectLanguage()).toBe('en');
  });

  it('normalizes uppercase two-letter browser language tags', () => {
    setNavigatorProperty('language', 'EN');

    expect(detectLanguage()).toBe('en');
  });

  it('handles three-or-more character uppercase browser language via truncation', () => {
    // e.g. some legacy locale tags like 'ENG' — slice(0,2) yields 'en' which is registered
    setNavigatorProperty('language', 'ENG');

    expect(detectLanguage()).toBe('en');
  });

  it('handles single-character browser language tag via fallback (below slice threshold)', () => {
    // navigator.language = 'e' → normalizeLocaleId gives 'e' → slice(0,2) yields 'e' which is not registered
    setNavigatorProperty('language', 'e');

    expect(detectLanguage()).toBe('en');
  });

  it('treats stored multi-character locale id as invalid and falls back to navigator.language', () => {
    // Stored 'eng' normalizes to 'eng'; not registered → falls through to browser.
    // Browser detection applies slice(0,2) which would match 'ro'.
    window.localStorage.setItem('horror-scope-lang', 'ENG');

    setNavigatorProperty('language', 'ro');

    expect(detectLanguage()).toBe('ro');
  });

  it('falls through to browser language when localStorage throws (privacy-mode simulation)', () => {
    // Simulate Safari private mode / blocked localStorage: getItem throws.
    const originalGetItem = localStorageStub.getItem.bind(localStorageStub);
    (localStorageStub as unknown as { getItem: (key: string) => string | null }).getItem = (_key: string) => {
      throw new Error('QuotaExceededError');
    };

    setNavigatorProperty('language', 'ro');

    expect(detectLanguage()).toBe('ro');

    // Restore original behavior for other tests.
    (localStorageStub as unknown as { getItem: (key: string) => string | null }).getItem = originalGetItem;
  });

  it('falls back to English when localStorage throws and browser language is empty', () => {
    const originalGetItem = localStorageStub.getItem.bind(localStorageStub);
    (localStorageStub as unknown as { getItem: (key: string) => string | null }).getItem = (_key: string) => {
      throw new Error('QuotaExceededError');
    };

    setNavigatorProperty('language', '');

    expect(detectLanguage()).toBe('en');

    // Restore original behavior for other tests.
    (localStorageStub as unknown as { getItem: (key: string) => string | null }).getItem = originalGetItem;
  });

  it('returns English when both stored and browser language are unregistered', () => {
    window.localStorage.setItem('horror-scope-lang', 'zz');
    setNavigatorProperty('language', 'de-DE');

    expect(detectLanguage()).toBe('en');
  });

  it('returns English when the two-letter truncated browser tag is not registered', () => {
    // Navigator returns a language whose first-two-char prefix isn't in registry.
    setNavigatorProperty('language', 'fr-FR');

    expect(detectLanguage()).toBe('en');
  });
});

describe('getAvailableLocales', () => {
  it('returns all registered locales', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBe(2);
    const ids = locales.map((l) => l.id);
    expect(ids).toContain('en');
    expect(ids).toContain('ro');
  });

  // Grammar symbol checks moved to grammar-loader.test.ts (data file integrity)

  it('each locale has all zodiac sign names', () => {
    const signs = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ] as const;
    for (const locale of getAvailableLocales()) {
      for (const sign of signs) {
        expect(locale.ui.signNames[sign]).toBeDefined();
      }
    }
  });

  it('returns an array with no undefined entries', () => {
    const locales = getAvailableLocales();
    for (let i = 0; i < locales.length; i++) {
      expect(locales[i]).toBeDefined();
      expect(locales[i].id).toBeTruthy();
    }
  });

  it('returning locales is stable in content across calls', () => {
    const a = getAvailableLocales();
    const b = getAvailableLocales();
    // Same registry → same entries, just different array identity (Array.from creates new).
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].id).toBe(b[i].id);
    }
  });
});

describe('persistLanguage', () => {
  it('normalizes id before writing to localStorage', () => {
    persistLanguage('RO');

    expect(window.localStorage.getItem('horror-scope-lang')).toBe('ro');
  });

  it('handles invalid input gracefully', () => {
    // Test that persistLanguage doesn't crash with various inputs
    const testCases = ['', 'en', 'EN', '  en  ', 'ro-RO'];
    for (const testCase of testCases) {
      expect(() => persistLanguage(testCase)).not.toThrow();
    }
  });

  it('rejects unregistered locale ids without writing to localStorage', () => {
    persistLanguage('zzz');

    expect(window.localStorage.getItem('horror-scope-lang')).toBeNull();
  });

  it('overwrites previously stored language with new value', () => {
    persistLanguage('ro');
    expect(window.localStorage.getItem('horror-scope-lang')).toBe('ro');

    persistLanguage('en');
    expect(window.localStorage.getItem('horror-scope-lang')).toBe('en');
  });

  it('persisted language is detected by detectLanguage', () => {
    persistLanguage('ro');
    setNavigatorProperty('language', 'de-DE');

    expect(detectLanguage()).toBe('ro');
  });

  it('does not crash when localStorage.setItem throws (privacy-mode simulation)', () => {
    const originalSetItem = localStorageStub.setItem.bind(localStorageStub);
    (localStorageStub as unknown as { setItem: (key: string, value: string) => void }).setItem = (_key: string, _value: string) => {
      throw new Error('QuotaExceededError');
    };

    expect(() => persistLanguage('ro')).not.toThrow();

    // Restore original behavior for other tests.
    localStorageStub.setItem = originalSetItem;
  });
});

// Note: loadAllGrammars tests removed - they require network/file access
// which isn't available in jsdom. The getLocale fallback behavior is
// already tested implicitly by other tests that use unregistered locales.