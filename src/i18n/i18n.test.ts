// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLocale, getAvailableLocales, detectLanguage } from './index.ts';

const originalLanguage = navigator.language;

function setNavigatorProperty<K extends keyof Navigator>(key: K, value: Navigator[K]) {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  localStorage.removeItem('horror-scope-lang');
});

afterEach(() => {
  localStorage.removeItem('horror-scope-lang');
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

  it('falls back to English for unknown locale', () => {
    const locale = getLocale('xx');
    expect(locale.id).toBe('en');
  });
});

describe('detectLanguage', () => {
  it('normalizes stored language ids before returning them', () => {
    localStorage.setItem('horror-scope-lang', 'RO');

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
});
