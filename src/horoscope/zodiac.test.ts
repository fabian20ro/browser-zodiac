import { describe, it, expect } from 'vitest';
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, randomSign } from './zodiac.ts';
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
});
