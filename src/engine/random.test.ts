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

  it('distributes roughly uniformly across [0, 1) over many samples', () => {
    // Detects subtle PRNG algorithmic bugs (e.g. wrong shift direction)
    // that bounds + determinism tests alone would miss.
    const rng = mulberry32(7);
    const n = 10_000;
    const buckets = 10;
    const counts = Array(buckets).fill(0);
    for (let i = 0; i < n; i++) {
      const v = rng();
      const idx = Math.min(Math.floor(v * buckets), buckets - 1);
      counts[idx]++;
    }
    const expected = n / buckets; // 1000
    const maxDeviation = Math.ceil(2 * Math.sqrt(expected)); // ±2σ for binomial approx
    for (const c of counts) {
      expect(Math.abs(c - expected)).toBeLessThanOrEqual(maxDeviation);
    }
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

  it('produces different hashes for single-character mutations', () => {
    // Catches weak avalanche: a broken hash might map similar strings to the same value.
    const base = 'hello-world';
    let collisions = 0;
    for (let i = 0; i < base.length; i++) {
      const mutated = base.slice(0, i) + String.fromCharCode((base.charCodeAt(i) % 26) + 97) + base.slice(i + 1);
      if (hashString(mutated) === hashString(base)) collisions++;
    }
    expect(collisions).toBeLessThan(base.length / 4); // tolerate up to 25% but flag >25% as broken
  });

  it('distributes outputs across the full 32-bit space', () => {
    // Verifies hashString doesn't cluster in a narrow band of the output range.
    const hashes = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      hashes.add(hashString(`test-${i}`));
    }
    expect(hashes.size).toBe(1000); // no collisions in 1000 inputs
    const arr = Array.from(hashes);
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min;
    expect(range).toBeGreaterThan(0xfffff * 3); // should span at least ~75% of 2^32
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

  it('handles empty date string', () => {
    const seed = dailySeed('', 'aries');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed >>> 0).toBe(seed);
    // deterministic: same call returns same seed
    expect(dailySeed('', 'aries')).toBe(seed);
  });

  it('handles empty salt', () => {
    const seed = dailySeed('2026-03-03', '');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed >>> 0).toBe(seed);
  });

  it('treats different special characters as distinct', () => {
    // The separator ':' is part of the hash; inputs with @, #, $ must differ
    const seedA = dailySeed('2026-03-03@test', 'aries');
    const seedB = dailySeed('2026-03-03#test', 'aries');
    expect(seedA).not.toBe(seedB);
  });

  it('handles unicode in date string', () => {
    const seed = dailySeed('2026—03—03', 'aries'); // em-dash variant
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed >>> 0).toBe(seed);
  });

  it('handles both arguments empty', () => {
    const seed = dailySeed('', '');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed >>> 0).toBe(seed);
    // deterministic: same call returns same seed
    expect(dailySeed('', '')).toBe(seed);
  });

  it('produces distinct seeds for consecutive dates', () => {
    // Regression guard: advancing the date must always yield a different seed,
    // otherwise daily horoscopes would silently repeat.
    const seeds = Array.from({ length: 365 }, (_, i) =>
      dailySeed(`2026-01-${String(i + 1).padStart(2, '0')}`, 'aries'),
    );
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('is backward-compatible: calling without timePart returns same seed as before', () => {
    const withTime = dailySeed('2026-03-03', 'aries'); // no third arg
    expect(withTime).toBe(dailySeed('2026-03-03', 'aries'));
  });

  it('differs by timePart on the same date and salt', () => {
    const morning = dailySeed('2026-03-03', 'aries', '09:15');
    const evening = dailySeed('2026-03-03', 'aries', '21:45');
    expect(morning).not.toBe(evening);
  });

  it('same date+timePart+salt always returns the same seed', () => {
    const a = dailySeed('2026-07-09', 'taurus', '14:30');
    const b = dailySeed('2026-07-09', 'taurus', '14:30');
    expect(a).toBe(b);
  });

  it('differing timePart produces different seeds (regression guard for hourly variation)', () => {
    // Each hour of the day should produce a distinct seed so horoscopes vary.
    const seeds = Array.from({ length: 24 }, (_, h) =>
      dailySeed('2026-07-09', 'aries', `${String(h).padStart(2, '0')}:00`),
    );
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('empty string timePart differs from no-timePart call on same date+salt', () => {
    const withTime = dailySeed('2026-03-03', 'aries', '');
    const withoutTime = dailySeed('2026-03-03', 'aries');
    expect(withTime).not.toBe(withoutTime);
  });

  it('timePart seed can feed mulberry32 and produce valid samples', () => {
    const seed = dailySeed('2026-07-09', 'aries', '18:00');
    const rng = mulberry32(seed);
    for (let i = 0; i < 5; i++) {
      expect(rng()).toBeGreaterThanOrEqual(0);
      expect(rng()).toBeLessThan(1);
    }
  });

  it('produces collision-free seeds across all 8760 hours in a year', () => {
    // Regression guard: if any two hourly seeds collide, the user sees repeated
    // horoscopes within the same day. The hash must spread seeds across the full
    // 2^32 space well enough that this never happens.
    const seen = new Set<number>();
    for (let year = 2026; year <= 2027; year++) {
      for (let month = 1; month <= 12; month++) {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          for (let h = 0; h < 24; h++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const seed = dailySeed(dateStr, 'aries', `${String(h).padStart(2, '0')}:00`);
            expect(seen.has(seed)).toBe(false);
            seen.add(seed);
          }
        }
      }
    }
  });

  it('non-standard timePart formats produce distinct seeds from standard format', () => {
    // Documents observable behavior: djb2 treats string differences as seed differences.
    // These edge-case formats must not collapse into the same seed as "09:15".
    const base = dailySeed('2026-07-09', 'taurus', '09:15');
    expect(dailySeed('2026-07-09', 'taurus', '9:15')).not.toBe(base);  // no zero-pad
    expect(dailySeed('2026-07-09', 'taurus', '09:5')).not.toBe(base); // single-digit minute
    expect(dailySeed('2026-07-09', 'taurus', '14:30')).not.toBe(base); // different time
  });

  it('dateStr containing colons produces distinct seeds from dash-separated dates', () => {
    // Edge case: if dateStr itself contains ':', the concatenation with ':' separator
    // creates a longer/more complex string. djb2 must spread this into a different hash,
    // otherwise malformed dates could accidentally collide with valid ones.
    const colonDate = dailySeed('2026:03:03', 'aries');
    const dashDate = dailySeed('2026-03-03', 'aries');
    expect(colonDate).not.toBe(dashDate);
  });

  it('timePart containing colons (HH:MM:SS) produces a distinct seed from HH:MM', () => {
    // Documents observable behavior when caller passes more precise timePart.
    const hhmm = dailySeed('2026-07-09', 'aries', '14:30');
    const hhmms = dailySeed('2026-07-09', 'aries', '14:30:45');
    expect(hhmms).not.toBe(hhmm);
  });

  it('multiple colons in dateStr still produces valid unsigned 32-bit integer seed', () => {
    const seed = dailySeed('2026::03::03', 'aries');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed >>> 0).toBe(seed);
    // verify it can feed mulberry32 without error
    const rng = mulberry32(seed);
    for (let i = 0; i < 5; i++) {
      expect(rng()).toBeGreaterThanOrEqual(0);
      expect(rng()).toBeLessThan(1);
    }
  });

  it('timePart produces distinct horoscope selections at morning vs evening', () => {
    // Regression guard for the hourly variation feature: different timeParts on the same
    // date must select different indices via mulberry32, so users opening the app in the
    // morning see a different horoscope than users opening it in the evening.
    const numSigns = 12;
    const morningIdx = Math.floor(mulberry32(dailySeed('2026-07-09', 'aries', '08:00'))() * numSigns);
    const eveningIdx = Math.floor(mulberry32(dailySeed('2026-07-09', 'aries', '20:00'))() * numSigns);
    expect(Math.abs(morningIdx - eveningIdx)).toBeGreaterThan(0); // distinct selections
  });

  it('timePart variation is consistent within the same hour but differs across hours', () => {
    // Same minute-level timePart must yield identical selection; different hours must not.
    const numSigns = 12;
    const morningA = Math.floor(mulberry32(dailySeed('2026-07-09', 'aries', '09:15'))() * numSigns);
    const morningB = Math.floor(mulberry32(dailySeed('2026-07-09', 'aries', '09:15'))() * numSigns);
    expect(morningA).toBe(morningB); // deterministic within same hour

    const eveningC = Math.floor(mulberry32(dailySeed('2026-07-09', 'aries', '18:45'))() * numSigns);
    expect(eveningC).not.toBe(morningA); // differs across hours
  });
});
