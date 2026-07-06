import { describe, it, expect } from 'vitest';
import { assignSign, assignDailySign, assignSignWithSymbol, assignSigns, assignRandomSign } from './sign-assigner.ts';
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS } from '../horoscope/zodiac.ts';

describe('sign-assigner', () => {
  describe('assignSign', () => {
    it('returns a valid zodiac sign', () => {
      const sign = assignSign('some-fingerprint');
      expect(ZODIAC_SIGNS).toContain(sign);
    });

    it('is deterministic', () => {
      const fingerprint = 'constant-fingerprint';
      const sign1 = assignSign(fingerprint);
      const sign2 = assignSign(fingerprint);
      expect(sign1).toBe(sign2);
    });

    it('returns taurus for "test"', () => {
      expect(assignSign('test')).toBe('taurus');
    });
    it('returns sagittarius for "🌟"', () => {
      expect(assignSign('🌟')).toBe('sagittarius');
    });

    it('handles empty string', () => {
      expect(assignSign('')).toBe('virgo');
    });

    it('handles very long strings', () => {
      const longString = 'a'.repeat(10000);
      expect(ZODIAC_SIGNS).toContain(assignSign(longString));
    });

    it('distributes signs roughly uniformly', () => {
      const counts: Record<string, number> = {};
      ZODIAC_SIGNS.forEach(s => counts[s] = 0);

      for (let i = 0; i < 1200; i++) {
        const sign = assignSign(`fingerprint-${i}`);
        counts[sign]++;
      }

      for (const sign of ZODIAC_SIGNS) {
        expect(counts[sign]).toBeGreaterThan(70);
        expect(counts[sign]).toBeLessThan(130);
      }
    });

    it('handles varied string lengths and characters', () => {
      const signs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const fingerprint = 'a'.repeat(i) + '!@#$%^&*()_+';
        signs.add(assignSign(fingerprint));
      }
      expect(signs.size).toBeGreaterThan(0);
      expect(signs.size).toBeLessThanOrEqual(ZODIAC_SIGNS.length);
    });

    it('ensures all zodiac signs are reachable', () => {
      const seenSigns = new Set<string>();
      for (let i = 0; i < 500; i++) {
        seenSigns.add(assignSign(`fingerprint-${i}`));
      }
      expect(seenSigns.size).toBe(ZODIAC_SIGNS.length);
    });

    it('handles strings with null characters', () => {
      const sign = assignSign('abc\0def');
      expect(ZODIAC_SIGNS).toContain(sign);
    });

    it('is invariant to unicode normalization', () => {
      const s1 = 'é';
      const s2 = 'e\u0301';
      expect(assignSign(s1)).toBe(assignSign(s2));
    });

    it('is case-insensitive', () => {
      const variants = [
        'John',
        'john',
        'JoHn',
        'jOHn',
      ];
      const results = new Set(variants.map(assignSign));
      expect(results.size).toBe(1);
    });
    });

  describe('assignDailySign', () => {
    it('returns a valid zodiac sign', () => {
     const sign = assignDailySign('some-fingerprint', new Date('2024-01-01'));
     expect(ZODIAC_SIGNS).toContain(sign);
    });

    it('is deterministic for the same date', () => {
     const fingerprint = 'constant-fingerprint';
     const date = new Date('2024-06-28');
     const sign1 = assignDailySign(fingerprint, date);
     const sign2 = assignDailySign(fingerprint, date);
     expect(sign1).toBe(sign2);
    });

    it('is insensitive to the time part of the date', () => {
     const fingerprint = 'fingerprint';
     const date1 = new Date('2024-01-01T10:00:00Z');
     const date2 = new Date('2024-01-01T23:59:59Z');
     expect(assignDailySign(fingerprint, date1)).toBe(assignDailySign(fingerprint, date2));
    });

    it('works with a dynamically created Date object', () => {
     const fingerprint = 'dynamic-date-test';
     const now = new Date();
     const sign = assignDailySign(fingerprint, now);
     expect(ZODIAC_SIGNS).toContain(sign);
     // Second call with same dynamic date must be deterministic
     const nowCopy = new Date(now.getTime());
     expect(assignDailySign(fingerprint, nowCopy)).toBe(sign);
    });

    it('is time-varying', () => {
     const fingerprint = 'constant-fingerprint';
     const date1 = new Date('2024-01-01');
     const date2 = new Date('2025-01-01');
     const sign1 = assignDailySign(fingerprint, date1);
     const sign2 = assignDailySign(fingerprint, date2);
     expect(sign1).not.toBe(sign2);
    });

    it('treats dates as UTC — same calendar day in different timezones yields different signs', () => {
     // '2024-06-15T00:00:00Z' is 2024-06-15 UTC.
     // '2024-06-15T00:00:00+03:00' is 2024-06-14 in UTC, so the daily hash uses a different dateStr.
     const fingerprint = 'utc-test';
     const utcDate = new Date('2024-06-15T00:00:00Z');
     const shiftedDate = new Date('2024-06-15T00:00:00+03:00');
     expect(assignDailySign(fingerprint, utcDate)).not.toBe(
       assignDailySign(fingerprint, shiftedDate)
     );
    });

    it('treats equivalent UTC instants as the same day — different ISO offsets with same moment yield identical signs', () => {
     // Both dates below encode 2024-06-15T05:00:00Z in absolute time.
     // Different local representations must collapse to the same dateStr via toISOString().split('T')[0].
     const fingerprint = 'equiv-instant-test';
     const a = new Date('2024-06-15T08:00:00+03:00'); // UTC 05:00
     const b = new Date('2024-06-14T23:00:00-06:00'); // UTC 05:00
     expect(assignDailySign(fingerprint, a)).toBe(
       assignDailySign(fingerprint, b)
     );
    });

    it('throws when given an InvalidDate (e.g., new Date(NaN))', () => {
     const fingerprint = 'invalid-date-test';
     const invalidDate = new Date(NaN);
     expect(() => assignDailySign(fingerprint, invalidDate)).toThrow();
    });

    it('returns different signs for different dates with the same fingerprint', () => {
     const fingerprint = 'daily-test-fingerprint';
     const seenDays: string[] = [];
     let foundTwoDifferent = false;
     for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
       const date = new Date(2024, 0, 1 + dayOffset);
       const sign = assignDailySign(fingerprint, date);
       if (!seenDays.includes(sign)) {
         seenDays.push(sign);
         if (seenDays.length >= 2) {
           foundTwoDifferent = true;
           break;
         }
       }
     }
     expect(foundTwoDifferent).toBe(true);
    });
    });

  describe('assignSignWithSymbol', () => {
    it('returns a sign and its corresponding symbol', () => {
      const result = assignSignWithSymbol('test');
      expect(ZODIAC_SYMBOLS[result.sign]).toBe(result.symbol);
    });

    it('returns valid symbols for every zodiac sign', () => {
      for (const sign of ZODIAC_SIGNS) {
        expect(ZODIAC_SYMBOLS[sign]).toBeDefined();
      }
    });

    it('does not map two signs to the same symbol', () => {
      const symbols = new Set(Object.values(ZODIAC_SYMBOLS));
      expect(symbols.size).toBe(ZODIAC_SIGNS.length);
    });
  });

  describe('assignSigns', () => {
    it('returns an array of signs for each fingerprint', () => {
      const fingerprints = ['alice', 'bob', 'carol'];
      const signs = assignSigns(fingerprints);
      expect(signs).toHaveLength(3);
      for (const sign of signs) {
        expect(ZODIAC_SIGNS).toContain(sign);
      }
    });

    it('handles empty array', () => {
      expect(assignSigns([])).toEqual([]);
    });

    it('is deterministic', () => {
      const fingerprints = ['alice', 'bob'];
      const signs1 = assignSigns(fingerprints);
      const signs2 = assignSigns(fingerprints);
      expect(signs1).toEqual(signs2);
    });

    it('returns valid zodiac signs', () => {
      const fingerprints = Array.from({ length: 50 }, (_, i) => `user-${i}`);
      const signs = assignSigns(fingerprints);
      for (const sign of signs) {
        expect(ZODIAC_SIGNS).toContain(sign);
      }
    });

    it('preserves positional correspondence with individual results', () => {
      const fingerprints = ['alice', 'bob', 'carol'];
      const batchResult = assignSigns(fingerprints);
      for (let i = 0; i < fingerprints.length; i++) {
        expect(batchResult[i]).toBe(assignSign(fingerprints[i]));
      }
    });

    it('maps each fingerprint in a long list to its individual equivalent', () => {
      const fingerprints = Array.from({ length: 20 }, (_, i) => `user-${i}`);
      const batchResult = assignSigns(fingerprints);
      for (let i = 0; i < fingerprints.length; i++) {
        expect(batchResult[i]).toBe(assignSign(fingerprints[i]));
      }
    });
  });

  describe('assignRandomSign', () => {
    it('returns a valid zodiac sign', () => {
      const sign = assignRandomSign();
      expect(ZODIAC_SIGNS).toContain(sign);
    });

    it('produces different results across many calls (not constant)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        seen.add(assignRandomSign());
      }
      expect(seen.size).toBeGreaterThan(2);
    });

    it('distributes roughly uniformly across all signs', () => {
      const counts: Record<string, number> = {};
      ZODIAC_SIGNS.forEach(s => counts[s] = 0);

      for (let i = 0; i < 1200; i++) {
        const sign = assignRandomSign();
        counts[sign]++;
      }

      for (const sign of ZODIAC_SIGNS) {
        expect(counts[sign]).toBeGreaterThan(40);
        expect(counts[sign]).toBeLessThan(160);
      }
    });

    it('does not require a fingerprint', () => {
      const sign = assignRandomSign();
      expect(ZODIAC_SIGNS).toContain(sign);
    });
  });
});
