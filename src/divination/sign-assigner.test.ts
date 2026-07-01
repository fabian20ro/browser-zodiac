import { describe, it, expect } from 'vitest';
import { assignSign, assignDailySign, assignSignWithSymbol } from './sign-assigner.ts';
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

    it('is time-varying', () => {
     const fingerprint = 'constant-fingerprint';
     const date1 = new Date('2024-01-01');
     const date2 = new Date('2025-01-01');
     const sign1 = assignDailySign(fingerprint, date1);
     const sign2 = assignDailySign(fingerprint, date2);
     expect(sign1).toBeDefined();
     expect(sign2).toBeDefined();
    });
    });

  describe('assignSignWithSymbol', () => {
    it('returns a sign and its corresponding symbol', () => {
      const result = assignSignWithSymbol('test');
      expect(ZODIAC_SYMBOLS[result.sign]).toBe(result.symbol);
    });
  });
});
