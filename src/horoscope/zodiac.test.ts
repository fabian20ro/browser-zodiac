import { describe, it, expect } from 'vitest';
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, randomSign, getSignDisplayName, getSignByDate, ZodiacSign } from './zodiac.ts';
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

  it('given a specific current sign, returns only other signs', () => {
    const seed = 42;
    const rng = mulberry32(seed);
    const result = randomSign('libra', rng);
    expect(result).not.toBe('libra');
    expect(ZODIAC_SIGNS).toContain(result);
  });

  it('unrecognized current sign is never returned as output (defensive)', () => {
    const seed = 99;
    const rng = mulberry32(seed);
    const result = randomSign('nonexistent' as any, rng);
    expect(ZODIAC_SIGNS).toContain(result);
    expect(result).not.toBe('nonexistent');
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

describe('getSignByDate', () => {
  it('returns aries for March 21 (start of zodiac year)', () => {
    expect(getSignByDate(3, 21)).toBe('aries');
  });

  it('returns the correct sign for start dates of all signs', () => {
    const expected = [
      [3, 21, 'aries' as const],
      [4, 20, 'taurus' as const],
      [5, 21, 'gemini' as const],
      [6, 21, 'cancer' as const],
      [7, 23, 'leo' as const],
      [8, 23, 'virgo' as const],
      [9, 23, 'libra' as const],
      [10, 23, 'scorpio' as const],
      [11, 22, 'sagittarius' as const],
      [12, 22, 'capricorn' as const],
      [1, 20, 'aquarius' as const],
      [2, 19, 'pisces' as const],
    ];

    for (const [month, day, sign] of expected) {
      expect(getSignByDate(month, day), `${sign} start date`).toBe(sign);
    }
  });

  it('returns mid-period dates correctly', () => {
    expect(getSignByDate(4, 10)).toBe('aries');       // Mid Aries (Mar 21 – Apr 19)
    expect(getSignByDate(7, 5)).toBe('cancer');        // Mid Cancer (Jun 21 – Jul 22)
    expect(getSignByDate(9, 15)).toBe('virgo');        // Late Virgo (Aug 23 – Sep 22)
    expect(getSignByDate(12, 31)).toBe('capricorn');   // Late Capricorn (Dec 22 – Jan 19)
    expect(getSignByDate(6, 10)).toBe('gemini');       // Mid Gemini (May 21 – Jun 20)
  });

  it('returns null for invalid month', () => {
    expect(getSignByDate(0, 15)).toBeNull();
    expect(getSignByDate(13, 15)).toBeNull();
  });

  it('returns null for invalid day of month', () => {
    expect(getSignByDate(2, 30)).toBeNull();  // Feb never has 30 days
    expect(getSignByDate(4, 31)).toBeNull();  // April only has 30 days
  });

  it('returns null for non-integer inputs', () => {
    expect(getSignByDate(1.5, 15)).toBeNull();
    expect(getSignByDate(2, 15.7)).toBeNull();
    expect(getSignByDate(NaN, 15)).toBeNull();
  });

  it('covers all 12 signs across a full year', () => {
    const signSet = new Set<string>();

    // Check start dates of all signs
    for (let m = 1; m <= 12; m++) {
      const result = getSignByDate(m, 1);
      if (result) {
        signSet.add(result);
      }
    }

    expect(signSet.size).toBe(12); // All signs covered
  });

  it('tests all boundary dates including wrap-around', () => {
    const boundaries: [number, number][] = [
      [3, 21], [4, 20], [5, 21], [6, 21],
      [7, 23], [8, 23], [9, 23], [10, 23],
      [11, 22], [12, 22], [1, 20], [2, 19]
    ];

    const expectedSigns = ['aries', 'taurus', 'gemini', 'cancer',
                           'leo', 'virgo', 'libra', 'scorpio',
                           'sagittarius', 'capricorn', 'aquarius', 'pisces'];

    for (let i = 0; i < boundaries.length; i++) {
      const [m, d] = boundaries[i];
      expect(getSignByDate(m, d), `boundary ${i} (${m}/${d})`).toBe(expectedSigns[i]);
    }
  });

  it('tests mid-period dates for all signs', () => {
    // Mid-range dates within each sign's period
    const expected: [number, number, ZodiacSign][] = [
      [4, 10, 'aries'],       // Aries: Mar 21 – Apr 19
      [5, 10, 'taurus'],      // Taurus: Apr 20 – May 20
      [6, 10, 'gemini'],      // Gemini: May 21 – Jun 20
      [7, 10, 'cancer'],      // Cancer: Jun 21 – Jul 22
      [8, 5, 'leo'],          // Leo: Jul 23 – Aug 22
      [9, 5, 'virgo'],        // Virgo: Aug 23 – Sep 22
      [10, 5, 'libra'],       // Libra: Sep 23 – Oct 22
      [11, 5, 'scorpio'],     // Scorpio: Oct 23 – Nov 21
      [12, 5, 'sagittarius'], // Sagittarius: Nov 22 – Dec 21
      [12, 28, 'capricorn'],  // Capricorn: Dec 22 – Jan 19
      [2, 5, 'aquarius'],     // Aquarius: Jan 20 – Feb 18
      [3, 5, 'pisces'],       // Pisces: Feb 19 – Mar 20
    ];

    for (const [m, d, sign] of expected) {
      expect(getSignByDate(m, d), `${sign} mid-period (${m}/${d})`).toBe(sign);
    }
  });

  it('tests year-wrap-around boundary dates', () => {
    // Capricorn ends Jan 19, Pisces starts Feb 19 — test the Dec/Jan transition
    expect(getSignByDate(12, 31)).toBe('capricorn');   // Last day of Capricorn period
    expect(getSignByDate(1, 19)).toBe('capricorn');    // End of Capricorn
    expect(getSignByDate(1, 20)).toBe('aquarius');     // Start of Aquarius (wraps to next year)
    expect(getSignByDate(2, 18)).toBe('aquarius');     // Last day of Aquarius
    expect(getSignByDate(2, 19)).toBe('pisces');       // Start of Pisces
    expect(getSignByDate(3, 20)).toBe('pisces');       // End of Pisces
    expect(getSignByDate(3, 21)).toBe('aries');        // Start of Aries (new zodiac year)

    // Test edge cases around the wrap-around
    expect(getSignByDate(12, 22)).toBe('capricorn');   // First day Capricorn period
    expect(getSignByDate(1, 1)).toBe('capricorn');     // Jan 1 in middle of Capricorn period
    expect(getSignByDate(2, 19)).toBe('pisces');       // Pisces starts here
  });
});
