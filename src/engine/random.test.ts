import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, dailySeed } from './random.ts';

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

describe('hashString', () => {
  it('returns consistent values for the same input', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('returns different values for different inputs', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const hash = hashString('test');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it('handles empty string', () => {
    const hash = hashString('');
    expect(hash).toBe(5381); // djb2 initial value, no iterations
  });
});

describe('dailySeed', () => {
  it('is deterministic for same date and salt', () => {
    expect(dailySeed('2026-03-03', 'aries')).toBe(dailySeed('2026-03-03', 'aries'));
  });

  it('differs by date', () => {
    expect(dailySeed('2026-03-03', 'aries')).not.toBe(dailySeed('2026-03-04', 'aries'));
  });

  it('differs by salt', () => {
    expect(dailySeed('2026-03-03', 'aries')).not.toBe(dailySeed('2026-03-03', 'taurus'));
  });
});
