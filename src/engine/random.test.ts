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

  it('handles negative seeds (normalized via |0)', () => {
    const rng = mulberry32(-1);
    for (let i = 0; i < 50; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('handles zero seed', () => {
    const rng = mulberry32(0);
    for (let i = 0; i < 50; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('handles float seeds by truncating to int via |0', () => {
    // Float seeds should behave identically after bitwise normalization
    const rngInt = mulberry32(42);
    const rngFloat = mulberry32(42.7);
    for (let i = 0; i < 100; i++) {
      expect(rngFloat()).toBe(rngInt());
    }
  });

  it('handles seeds larger than signed int max', () => {
    const rng = mulberry32(2 ** 31 + 7);
    for (let i = 0; i < 50; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('negative seeds are deterministic', () => {
    const rng1 = mulberry32(-42);
    const rng2 = mulberry32(-42);
    for (let i = 0; i < 50; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('zero and non-zero seeds produce different sequences', () => {
    const rngA = mulberry32(0);
    const rngB = mulberry32(1);
    const seqA = Array.from({ length: 5 }, () => rngA());
    const seqB = Array.from({ length: 5 }, () => rngB());
    expect(seqA).not.toEqual(seqB);
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

  it('is sensitive to character order (abc ≠ cba)', () => {
    expect(hashString('abc')).not.toBe(hashString('cba'));
  });

  it('distributes across the full range for diverse inputs', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      hashes.add(String(hashString(`input-${i}`)));
    }
    // With 2^32 space and 500 inputs, near-collision-free is essentially guaranteed
    expect(hashes.size).toBe(500);
  });

  it('handles long strings without overflow surprises', () => {
    const long = 'a'.repeat(10000);
    const hash = hashString(long);
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash >>> 0).toBe(hash); // round-trip confirms unsigned 32-bit
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

  it('returns an unsigned 32-bit integer usable as mulberry32 seed', () => {
    const seed = dailySeed('2026-07-09', 'aries');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
    // round-trip confirms unsigned 32-bit representation is preserved
    expect(seed >>> 0).toBe(seed);
    // verify it can seed the PRNG without error
    const rng = mulberry32(seed);
    for (let i = 0; i < 10; i++) {
      expect(rng()).toBeGreaterThanOrEqual(0);
      expect(rng()).toBeLessThan(1);
    }
  });
});
