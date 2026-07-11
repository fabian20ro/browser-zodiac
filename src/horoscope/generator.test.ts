import { describe, it, expect } from 'vitest';
import { generateHoroscope } from './generator.ts';
import { ZODIAC_SYMBOLS } from './zodiac.ts';
import type { LocalePack } from '../i18n/types.ts';
import type { DivinationProfile } from '../divination/browser-oracle.ts';

const minimalLocale: LocalePack = {
  id: 'test',
  name: 'Test',
  ui: {
    title: 'Test',
    subtitle: 'Test',
    yourSign: 'Sign',
    dailyHoroscope: 'Horoscope',
    luckyNumber: 'Lucky',
    luckyColor: 'Color',
    cosmicWarning: 'Warning',
    compatibility: 'Compat',
    browserDivination: 'Divination',
    randomizeSign: 'Randomize',
    regenerate: 'Regenerate',
    copyHoroscope: 'Copy',
    copiedHoroscope: 'Copied!',
    interpretWithAI: 'Interpret',
    aiInterpretQuery: 'interpret this: ',
    generatedBy: 'Generated',
    footer: 'Footer',
    signNames: {
      aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini',
      cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo',
      libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius',
      capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
    },
    divinationLabels: {},
  },
  grammar: {
    origin: ['Your fate is sealed'],
    warning: ['Beware'],
    luckyColor: ['blue'],
    compatibility: ['Gemini'],
  },
};

const minimalDivination: DivinationProfile = {
  readings: [
    { key: 'spirit_browser', raw: 'Chrome', interpretation: '' },
  ],
  fingerprint: 'test-fingerprint',
};

const fixedDate = new Date('2026-03-03');

describe('generateHoroscope', () => {
  it('returns a complete horoscope object', () => {
    const h = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    expect(h.sign).toBe('aries');
    expect(h.signSymbol).toBe(ZODIAC_SYMBOLS.aries);
    expect(h.text).toBeDefined();
    expect(h.warning).toBeDefined();
    expect(h.luckyColor).toBeDefined();
    expect(h.compatibility).toBeDefined();
    expect(h.date).toBe('2026-03-03');
  });

  it('lucky number is between 1 and 99', () => {
    for (const sign of ['aries', 'leo', 'pisces'] as const) {
      const h = generateHoroscope(sign, minimalLocale, minimalDivination, fixedDate);
      expect(h.luckyNumber).toBeGreaterThanOrEqual(1);
      expect(h.luckyNumber).toBeLessThanOrEqual(99);
    }
  });

  it('is deterministic — same inputs produce same output', () => {
    const h1 = generateHoroscope('taurus', minimalLocale, minimalDivination, fixedDate);
    const h2 = generateHoroscope('taurus', minimalLocale, minimalDivination, fixedDate);
    expect(h1).toEqual(h2);
  });

  it('different signs produce different horoscopes', () => {
    const h1 = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    const h2 = generateHoroscope('pisces', minimalLocale, minimalDivination, fixedDate);
    expect(h1.luckyNumber).not.toBe(h2.luckyNumber);
  });

  it('different dates produce different horoscopes', () => {
    const h1 = generateHoroscope('aries', minimalLocale, minimalDivination, new Date('2026-03-03'));
    const h2 = generateHoroscope('aries', minimalLocale, minimalDivination, new Date('2026-03-04'));
    expect(h1.luckyNumber).not.toBe(h2.luckyNumber);
  });

  it('is deterministic — same inputs with same consultation produce same output', () => {
    const h1 = generateHoroscope('taurus', minimalLocale, minimalDivination, fixedDate, 3);
    const h2 = generateHoroscope('taurus', minimalLocale, minimalDivination, fixedDate, 3);
    expect(h1).toEqual(h2);
  });

  it('different consultation numbers produce different horoscopes', () => {
    const h1 = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate, 0);
    const h2 = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate, 1);
    expect(h1.luckyNumber).not.toBe(h2.luckyNumber);
  });

  it('consultation 0 matches default (no consultation argument)', () => {
    const withDefault = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    const withExplicitZero = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate, 0);
    expect(withDefault).toEqual(withExplicitZero);
  });

  it('injects divination readings as grammar symbols', () => {
    const locale: LocalePack = {
      ...minimalLocale,
      grammar: {
        ...minimalLocale.grammar,
        origin: ['Your browser is #spirit_browser#'],
      },
    };
    const h = generateHoroscope('aries', locale, minimalDivination, fixedDate);
    expect(h.text).toBe('Your browser is Chrome');
  });

  it('signName injected as grammar symbol flows into expanded text', () => {
    const locale: LocalePack = {
      ...minimalLocale,
      grammar: {
        ...minimalLocale.grammar,
        origin: ['#signName#, the stars align today'],
      },
    };
    const h = generateHoroscope('aries', locale, minimalDivination, fixedDate);
    expect(h.text).toBe('Aries, the stars align today');
  });

  it('preserves multiple distinct divination readings in merged grammar', () => {
    const locale: LocalePack = {
      ...minimalLocale,
      grammar: {
        ...minimalLocale.grammar,
        origin: ['#spirit_browser# visits #numen_fortuna#'],
      },
    };
    const multiReadingDivination: DivinationProfile = {
      readings: [
        { key: 'spirit_browser', raw: 'Chrome', interpretation: '' },
        { key: 'numen_fortuna', raw: 'the Loyal Dog', interpretation: '' },
      ],
      fingerprint: 'multi-fp',
    };
    const h = generateHoroscope('aries', locale, multiReadingDivination, fixedDate);
    expect(h.text).toBe('Chrome visits the Loyal Dog');
  });

  it('throws on unrecognized zodiac sign key instead of silent undefined injection', () => {
    const unknownLocale: LocalePack = { ...minimalLocale }; // no signNames for 'bogus'
    expect(() => generateHoroscope('bogus' as ZodiacSign, unknownLocale, minimalDivination, fixedDate)).toThrow(
      'Unrecognized zodiac sign key',
    );
  });

  it('divination readings overwrite colliding locale grammar symbols', () => {
    const locale: LocalePack = {
      ...minimalLocale,
      grammar: {
        ...minimalLocale.grammar,
        warning: ['ignore danger'],
      },
    };
    const divinationWithCollision: DivinationProfile = {
      ...minimalDivination,
      readings: [
        { key: 'warning', raw: 'SHE PULLS THE KNIFE FIRST', interpretation: '' },
      ],
      fingerprint: 'collision-fp',
    };
    const h = generateHoroscope('aries', locale, divinationWithCollision, fixedDate);
    expect(h.warning).toBe('SHE PULLS THE KNIFE FIRST');
  });

  it.each(Object.keys(ZODIAC_SYMBOLS) as ZodiacSign[])(
    'every zodiac sign %s generates without error and produces all fields',
    (sign) => {
      const h = generateHoroscope(sign, minimalLocale, minimalDivination, fixedDate);
      expect(h.sign).toBe(sign);
      expect(h.signSymbol).toBeDefined();
      expect(typeof h.text).toBe('string');
      expect(h.text.length).toBeGreaterThan(0);
      expect(typeof h.warning).toBe('string');
      expect(h.warning.length).toBeGreaterThan(0);
      expect(typeof h.luckyColor).toBe('string');
      expect(h.luckyColor.length).toBeGreaterThan(0);
      expect(typeof h.compatibility).toBe('string');
      expect(h.compatibility.length).toBeGreaterThan(0);
      expect(Number.isInteger(h.luckyNumber)).toBe(true);
      expect(h.luckyNumber).toBeGreaterThanOrEqual(1);
      expect(h.luckyNumber).toBeLessThanOrEqual(99);
    },
  );

  it('uses only the date portion (day-level) when deriving seeds', () => {
    const hDay = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    const hMidnight = generateHoroscope('aries', minimalLocale, minimalDivination, new Date('2026-03-03T00:00:00Z'));
    const hNoon = generateHoroscope('aries', minimalLocale, minimalDivination, new Date('2026-03-03T12:00:00Z'));
    expect(hDay.luckyNumber).toBe(hMidnight.luckyNumber);
    expect(hDay.luckyNumber).toBe(hNoon.luckyNumber);
  });

  it('uses sign as salt when consultation is 0, and "sign:N" otherwise', () => {
    const hDefault = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    const hZero = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate, 0);
    const hOne = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate, 1);
    expect(hDefault.luckyNumber).toBe(hZero.luckyNumber);
    // Sign-only salt vs "sign:1" must produce different output
    expect(hDefault.luckyNumber).not.toBe(hOne.luckyNumber);
  });

  it('is deterministic across all fields (text, warning, color, compatibility) — not just luckyNumber', () => {
    const h1 = generateHoroscope('leo', minimalLocale, minimalDivination, fixedDate);
    const h2 = generateHoroscope('leo', minimalLocale, minimalDivination, fixedDate);
    expect(h1.text).toBe(h2.text);
    expect(h1.warning).toBe(h2.warning);
    expect(h1.luckyColor).toBe(h2.luckyColor);
    expect(h1.compatibility).toBe(h2.compatibility);
  });

  it('produces a date string in YYYY-MM-DD format', () => {
    const h = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(h.date).toBe('2026-03-03');
  });

  it('generates non-empty text from every grammar section (#origin#, #warning#, etc.)', () => {
    const h = generateHoroscope('aries', minimalLocale, minimalDivination, fixedDate);
    expect(h.text.length).toBeGreaterThan(10);
    expect(h.warning.length).toBeGreaterThan(1);
  });

  it('deterministic across consultations (each consultation is stable)', () => {
    const hA = generateHoroscope('gemini', minimalLocale, minimalDivination, fixedDate, 7);
    const hB = generateHoroscope('gemini', minimalLocale, minimalDivination, fixedDate, 7);
    expect(hA.text).toBe(hB.text);
    expect(hA.luckyNumber).toBe(hB.luckyNumber);
    expect(hA.warning).toBe(hB.warning);
    expect(hA.luckyColor).toBe(hB.luckyColor);
    expect(hA.compatibility).toBe(hB.compatibility);
  });

  it('divination readings overwrite colliding locale grammar symbols in every section', () => {
    const locale: LocalePack = {
      ...minimalLocale,
      grammar: {
        ...minimalLocale.grammar,
        warning: ['ignore danger'],
        compatibility: ['peaceful'],
        luckyColor: ['red'],
      },
    };
    const divinationWithCollisions: DivinationProfile = {
      readings: [
        { key: 'warning', raw: 'SHE PULLS THE KNIFE FIRST', interpretation: '' },
        { key: 'compatibility', raw: 'SCORPIO', interpretation: '' },
        { key: 'luckyColor', raw: 'BLACK', interpretation: '' },
      ],
      fingerprint: 'triple-collision-fp',
    };
    const h = generateHoroscope('aries', locale, divinationWithCollisions, fixedDate);
    expect(h.warning).toBe('SHE PULLS THE KNIFE FIRST');
    expect(h.compatibility).toBe('SCORPIO');
    expect(h.luckyColor).toBe('BLACK');
  });

  it('throws on unrecognized zodiac sign key in every locale that lacks the symbol', () => {
    const emptySignsLocale: LocalePack = { ...minimalLocale, ui: { ...minimalLocale.ui, signNames: {} } };
    expect(() => generateHoroscope('bogus' as ZodiacSign, emptySignsLocale, minimalDivination, fixedDate)).toThrow(
      'Unrecognized zodiac sign key',
    );
  });

  it('produces distinct horoscopes for every pair of different signs', () => {
    const signs = Object.keys(ZODIAC_SYMBOLS) as ZodiacSign[];
    const all = signs.map((sign) => generateHoroscope(sign, minimalLocale, minimalDivination, fixedDate));

    for (let i = 0; i < all.length - 1; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(all[i].sign).not.toBe(all[j].sign);
        // Each sign should produce a different lucky number — with high probability.
        expect(all[i].luckyNumber).not.toBe(all[j].luckyNumber);
      }
    }
  });
});
