import { describe, it, expect } from 'vitest';
import { assignSign, assignDailySign, assignSignWithSymbol, assignSigns, assignRandomSign, getSignElement, assignSignWithElement } from './sign-assigner.ts';
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

    it('maps fingerprints to signs via hashString % 12 on the normalized form', () => {
      for (const fp of ['hello', 'world', '', '🌟', 'test', 'abc\\0def']) {
        const normalized = fp.normalize().toLowerCase();
        // Inline djb2 so we don't leak internal hash into the test surface.
        let h = 5381;
        for (let i = 0; i < normalized.length; i++) {
          h = (h * 33 + normalized.charCodeAt(i)) | 0;
        }
        const expectedIndex = ((h >>> 0) % ZODIAC_SIGNS.length);
        expect(assignSign(fp)).toBe(ZODIAC_SIGNS[expectedIndex]);
      }
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

    it('treats dates as local calendar day — same day in different timezones yields the same sign', () => {
     // Both represent 2024-06-15 locally (ignoring timezone).
     const fingerprint = 'local-day-test';
     // In UTC mode: new Date(2024, 5, 15) is local June 15; +03:00 offset at 03:00 also has local date June 15.
     const a = new Date(2024, 5, 15); // Local midnight → 2024-06-15
     const b = new Date('2024-06-15T03:00:00+03:00'); // Same local day (UTC equivalent: 2024-06-15T00:00:00Z)
     expect(assignDailySign(fingerprint, a)).toBe(
       assignDailySign(fingerprint, b)
     );
    });

    it('is insensitive to fingerprint casing', () => {
     const date = new Date('2024-06-15');
     expect(assignDailySign('Fingerprint', date)).toBe(
       assignDailySign('fingerprint', date)
     );
    });

    it('throws a TypeError with a specific message when given an InvalidDate (e.g., new Date(NaN))', () => {
     const fingerprint = 'invalid-date-test';
     const invalidDate = new Date(NaN);
     expect(() => assignDailySign(fingerprint, invalidDate)).toThrow(TypeError);
     try {
       assignDailySign(fingerprint, invalidDate);
     } catch (err) {
       expect(err).toBeInstanceOf(TypeError);
       expect((err as TypeError).message).toBe('assignDailySign requires a valid Date');
     }
    });

    it('accepts out-of-range calendar dates by normalizing to the real local date (e.g., Feb 29 in non-leap year → March 1)', () => {
     const fingerprint = 'overflow-date-test';
     // In a non-leap year, JS Date constructor auto-normalizes month overflow:
     // new Date(2023, 1, 29) rolls forward to 2023-03-01 in local time.
     const normalizedDate = new Date(2023, 1, 29);
     expect(normalizedDate.getFullYear()).toBe(2023);
     // Month is zero-indexed: 2 === March (index 2)
     expect(normalizedDate.getMonth()).toBe(2);
     const sign = assignDailySign(fingerprint, normalizedDate);
     expect(ZODIAC_SIGNS).toContain(sign);
    });

    it('zero-pads month and day so single-digit dates hash identically regardless of construction', () => {
     const fingerprint = 'zeropad-test';
     // new Date(2024, 0, 5) → local midnight, getMonth()=0, getDate()=5
     // ISO string: "2024-01-05T00:00:00..." — has zero-padding in YYYY-MM-DD prefix.
     // But the production code uses .padStart(2, '0') on month/day extracted from Date
     // accessor methods, so single-digit values must still produce "01" and "05".
     const fromConstructor = new Date(2024, 0, 5);
     const fromISO = new Date('2024-01-05');
     const signA = assignDailySign(fingerprint, fromConstructor);
     const signB = assignDailySign(fingerprint, fromISO);
     expect(signA).toBe(signB);
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

    it('distributes signs roughly uniformly across a year of consecutive dates', () => {
     const counts: Record<string, number> = {};
     ZODIAC_SIGNS.forEach(s => counts[s] = 0);

     for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
       const date = new Date(2024, 0, 1 + dayOffset);
       const sign = assignDailySign('uniform-fingerprint', date);
       counts[sign]++;
     }

     for (const sign of ZODIAC_SIGNS) {
       expect(counts[sign]).toBeGreaterThan(20);
       expect(counts[sign]).toBeLessThan(50);
     }
    });

    it('treats 2024-12-31 as the same local day regardless of construction method — verifies boundary behavior', () => {
     const fingerprint = 'boundary-test';
     // new Date(year, monthIndex, day) constructs in local midnight.
     const fromConstructor = new Date(2024, 11, 31);
     // ISO string "2024-12-31" parses as UTC midnight; getDate() returns 31 locally only if timezone is UTC or east of UTC offset enough that local date remains Dec 31.
     const fromISO = new Date('2024-12-31');
     expect(fromConstructor.getFullYear()).toBe(2024);
     expect(fromConstructor.getMonth()).toBe(11);
     expect(fromConstructor.getDate()).toBe(31);
     expect(assignDailySign(fingerprint, fromConstructor)).toBe(
       assignDailySign(fingerprint, fromISO)
     );
    });
    });

  describe('assignSignWithSymbol', () => {
    it('returns a sign and its corresponding symbol', () => {
      const result = assignSignWithSymbol('test');
      expect(ZODIAC_SIGNS).toContain(result.sign);
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

  describe('assignSignWithElement', () => {
    it('returns a valid sign with its corresponding element', () => {
      const result = assignSignWithElement('test');
      expect(ZODIAC_SIGNS).toContain(result.sign);
      expect(['fire', 'earth', 'air', 'water']).toContain(result.element);
    });

    it('element matches getSignElement for the derived sign', () => {
      const result = assignSignWithElement('aries');
      expect(result.element).toBe(getSignElement(result.sign));
    });

    it('every zodiac sign maps to a defined symbol and consistent element — drift-proof across all 12 signs', () => {
      for (const sign of ZODIAC_SIGNS) {
        const withSymbol = assignSignWithSymbol(sign);
        const withElement = assignSignWithElement(sign);

        expect(ZODIAC_SYMBOLS[withSymbol.sign]).toBe(withSymbol.symbol);
        expect(getSignElement(withElement.sign)).toBe(withElement.element);
      }
    });

    it('covers all four elements across many fingerprints', () => {
      const seenElements = new Set<string>();
      for (let i = 0; i < ZODIAC_SIGNS.length * 25; i++) {
        const result = assignSignWithElement(`fingerprint-${i}`);
        expect(['fire', 'earth', 'air', 'water']).toContain(result.element);
        seenElements.add(result.element);
      }
      expect(seenElements.size).toBe(4);
    });

    it('is deterministic', () => {
      const fingerprint = 'element-determinism';
      const r1 = assignSignWithElement(fingerprint);
      const r2 = assignSignWithElement(fingerprint);
      expect(r1).toEqual(r2);
    });

    it('cross-checks against assignSign and getSignElement for every reachable sign — drift-proof', () => {
      for (let i = 0; i < ZODIAC_SIGNS.length * 50; i++) {
        const fp = `drift-test-${i}`;
        const derived = assignSignWithElement(fp);
        expect(derived.sign).toBe(assignSign(fp));
        expect(derived.element).toBe(getSignElement(derived.sign));
      }
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

    it('filters out null, undefined, and empty-string entries — does not throw on falsy input', () => {
      const mixed: Array<string | null | undefined> = ['alice', null, 'bob', '', undefined, 'carol'];
      expect(() => assignSigns(mixed)).not.toThrow();
      const signs = assignSigns(mixed);
      // Empty strings and falsy entries must be excluded from the output.
      for (const s of signs) {
        expect(s).toBeTruthy();
        expect(ZODIAC_SIGNS).toContain(s);
      }
    });

    it('preserves positional correspondence after filtering', () => {
      const fingerprints: Array<string | null | undefined> = ['alice', null, 'bob', undefined];
      const batchResult = assignSigns(fingerprints);
      const nonEmpty = fingerprints.filter(Boolean) as string[];
      expect(batchResult.length).toBe(nonEmpty.length);
      for (let i = 0; i < nonEmpty.length; i++) {
        expect(batchResult[i]).toBe(assignSign(nonEmpty[i]));
      }
    });
  });

  describe('getSignElement', () => {
    it('returns fire for aries, leo, sagittarius', () => {
      expect(getSignElement('aries')).toBe('fire');
      expect(getSignElement('leo')).toBe('fire');
      expect(getSignElement('sagittarius')).toBe('fire');
    });

    it('returns earth for taurus, virgo, capricorn', () => {
      expect(getSignElement('taurus')).toBe('earth');
      expect(getSignElement('virgo')).toBe('earth');
      expect(getSignElement('capricorn')).toBe('earth');
    });

    it('returns air for gemini, libra, aquarius', () => {
      expect(getSignElement('gemini')).toBe('air');
      expect(getSignElement('libra')).toBe('air');
      expect(getSignElement('aquarius')).toBe('air');
    });

    it('returns water for cancer, scorpio, pisces', () => {
      expect(getSignElement('cancer')).toBe('water');
      expect(getSignElement('scorpio')).toBe('water');
      expect(getSignElement('pisces')).toBe('water');
    });

    it('assigns every zodiac sign to a valid element — catches drift between ZODIAC_SIGNS and ELEMENT_BY_SIGN', () => {
      const elements = new Set<AstroElement>(['fire', 'earth', 'air', 'water']);
      for (const sign of ZODIAC_SIGNS) {
        expect(elements).toContain(getSignElement(sign));
      }
    });

    it('forms a bijective partition — each element covers exactly 3 signs, no duplicates, all 12 covered', () => {
      const counts: Record<string, number> = {};
      for (const el of ['fire', 'earth', 'air', 'water'] as AstroElement[]) {
        counts[el] = ZODIAC_SIGNS.filter(s => getSignElement(s) === el).length;
      }
      for (const el of ['fire', 'earth', 'air', 'water']) {
        expect(counts[el]).toBe(3);
      }
    });

    it('maps every zodiac sign — no sign left unassigned in ELEMENT_BY_SIGN', () => {
      const seen = new Set<string>();
      for (const sign of ZODIAC_SIGNS) {
        expect(getSignElement(sign)).toBeDefined();
        seen.add(sign);
      }
      expect(seen.size).toBe(ZODIAC_SIGNS.length);
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
