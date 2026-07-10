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
    expect(ZODIAC_SYMBOLS['aries']).toBe('\u2648');
    expect(ZODIAC_SYMBOLS['taurus']).toBe('\u2649');
    expect(ZODIAC_SYMBOLS['leo']).toBe('\u264C');
    expect(ZODIAC_SYMBOLS['scorpio']).toBe('\u264F');
    expect(ZODIAC_SYMBOLS['sagittarius']).toBe('\u2650');
  });

  it('each symbol is a single character', () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(ZODIAC_SYMBOLS[sign].length).toBe(1);
    }
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

  it('has no duplicate display names', () => {
    const names = ZODIAC_SIGNS.map((sign) => getSignDisplayName(sign));
    expect(new Set(names).size).toBe(12);
  });
});
