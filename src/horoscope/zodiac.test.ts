import { describe, it, expect } from 'vitest';
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, randomSign, getSignDisplayName } from './zodiac.ts';
import { mulberry32 } from '../engine/random.ts';

describe('ZODIAC_SIGNS', () => {
  it('has exactly 12 signs', () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
  });

  it('has no duplicates', () => {
    expect(new Set(ZODIAC_SIGNS).size).toBe(12);
  });
});

describe('ZODIAC_SYMBOLS', () => {
  it('has a symbol for every sign', () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(ZODIAC_SYMBOLS[sign]).toBeDefined();
      expect(ZODIAC_SYMBOLS[sign].length).toBeGreaterThan(0);
    }
  });

  it('has no extra symbols beyond the 12 signs', () => {
    const symbolKeys = new Set(Object.keys(ZODIAC_SYMBOLS));
    for (const sign of ZODIAC_SIGNS) {
      expect(symbolKeys.has(sign)).toBe(true);
    }
    expect(symbolKeys.size).toBe(12);
  });

  it('maps canonical signs to their Unicode symbols', () => {
    const expected = {
      aries: '\u2648', taurus: '\u2649', gemini: '\u264A', cancer: '\u264B',
      leo: '\u264C', virgo: '\u264D', libra: '\u264E', scorpio: '\u264F',
      sagittarius: '\u2650', capricorn: '\u2651', aquarius: '\u2652', pisces: '\u2653',
    };
    for (const sign of ZODIAC_SIGNS) {
      expect(ZODIAC_SYMBOLS[sign], `${sign} symbol`).toBe(expected[sign]);
    }
  });

  it('each symbol is a single character', () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(ZODIAC_SYMBOLS[sign].length).toBe(1);
    }
  });

  it('every zodiac sign has both a symbol and a display name', () => {
    const allSignKeys = new Set(Object.keys(ZODIAC_SYMBOLS));
    for (const sign of ZODIAC_SIGNS) {
      expect(ZODIAC_SYMBOLS[sign], `${sign} missing symbol`).toBeTruthy();
      expect(getSignDisplayName(sign), `${sign} missing display name`).toBeTruthy();
      allSignKeys.delete(sign);
    }
    expect(allSignKeys.size, 'extra symbols beyond 12 signs').toBe(0);
  });
});

describe('randomSign', () => {
  it('returns a different sign than the current one', () => {
    for (const sign of ZODIAC_SIGNS) {
      for (let i = 0; i < 20; i++) {
        expect(randomSign(sign)).not.toBe(sign);
      }
    }
  });

  it('returns a valid zodiac sign', () => {
    for (let i = 0; i < 50; i++) {
      const result = randomSign('aries');
      expect(ZODIAC_SIGNS).toContain(result);
    }
  });

  it('is deterministic with a seeded RNG', () => {
    const seed = 123;
    const rng1 = mulberry32(seed);
    const rng2 = mulberry32(seed);
    
    const res1 = randomSign('aries', rng1);
    const res2 = randomSign('aries', rng2);
    
    expect(res1).toBe(res2);
  });

  it('returns a valid sign when given an unrecognized input', () => {
    for (let i = 0; i < 50; i++) {
      const result = randomSign('nonexistent' as any);
      expect(ZODIAC_SIGNS).toContain(result);
    }
  });
});

describe('getSignDisplayName', () => {
  it('every sign has a symbol AND a display name', () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(ZODIAC_SYMBOLS[sign], `${sign} symbol`).toBeDefined();
      const displayName = getSignDisplayName(sign);
      expect(displayName, `${sign} display name`).toBeTruthy();
    }
  });

  it('returns a capitalized name for every sign', () => {
    for (const sign of ZODIAC_SIGNS) {
      const display = getSignDisplayName(sign);
      expect(display).toBe(display[0].toUpperCase() + display.slice(1).toLowerCase());
    }
  });

  it('returns consistent names across calls', () => {
    const ariesDisplay = getSignDisplayName('aries');
    expect(ariesDisplay).toBe('Aries');
    expect(getSignDisplayName('leo')).toBe('Leo');
    expect(getSignDisplayName('pisces')).toBe('Pisces');
  });

  it('maps every sign to its canonical display name', () => {
    const expected: Record<string, string> = {
      aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
      leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
      sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
    };
    for (const sign of ZODIAC_SIGNS) {
      expect(getSignDisplayName(sign), `${sign} display name`).toBe(expected[sign]);
    }
  });

  it('has no duplicate display names', () => {
    const names = ZODIAC_SIGNS.map((sign) => getSignDisplayName(sign));
    expect(new Set(names).size).toBe(12);
  });
});
