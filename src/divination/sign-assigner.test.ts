import { describe, it, expect } from 'vitest';
import { assignSign } from './sign-assigner.ts';
import { ZODIAC_SIGNS } from '../horoscope/zodiac.ts';

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

    it('test debug', () => {
      console.log('sign(test):', assignSign('test'));
    });
    it('test emoji debug', () => {
      console.log('sign(emoji):', assignSign('🌟'));
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

      // With 1200 iterations, each sign should have ~100.
      // Allow a reasonable margin of error for djb2/modulo distribution.
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

    it('handles non-latin characters', () => {
      const nonLatinString = 'こんにちは';
      const sign = assignSign(nonLatinString);
      expect(ZODIAC_SIGNS).toContain(sign);
    });
  });
});
