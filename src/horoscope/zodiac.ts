export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

import type { SeededRandom } from '../engine/types.ts';

export function randomSign(current: ZodiacSign, rng?: SeededRandom): ZodiacSign {
  const others = ZODIAC_SIGNS.filter((s) => s !== current);
  const randomFn = rng ?? Math.random;
  return others[Math.floor(randomFn() * others.length)];
}

export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  aries: '\u2648',
  taurus: '\u2649',
  gemini: '\u264A',
  cancer: '\u264B',
  leo: '\u264C',
  virgo: '\u264D',
  libra: '\u264E',
  scorpio: '\u264F',
  sagittarius: '\u2650',
  capricorn: '\u2651',
  aquarius: '\u2652',
  pisces: '\u2653',
};

const DISPLAY_NAME_CACHE: Partial<Record<ZodiacSign, string>> = {};

function titlecase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function getSignDisplayName(sign: ZodiacSign): string {
  if (!DISPLAY_NAME_CACHE[sign]) {
    DISPLAY_NAME_CACHE[sign] = titlecase(sign);
  }
  return DISPLAY_NAME_CACHE[sign];
}

interface SignBoundary {
  month: number;
  day: number;
  sign: ZodiacSign;
}

export const ZODIAC_BOUNDARIES: SignBoundary[] = [
  { month: 3, day: 21, sign: 'aries' },
  { month: 4, day: 20, sign: 'taurus' },
  { month: 5, day: 21, sign: 'gemini' },
  { month: 6, day: 21, sign: 'cancer' },
  { month: 7, day: 23, sign: 'leo' },
  { month: 8, day: 23, sign: 'virgo' },
  { month: 9, day: 23, sign: 'libra' },
  { month: 10, day: 23, sign: 'scorpio' },
  { month: 11, day: 22, sign: 'sagittarius' },
  { month: 12, day: 22, sign: 'capricorn' },
  { month: 1, day: 20, sign: 'aquarius' },
  { month: 2, day: 19, sign: 'pisces' },
];

/** Encode a date as a single integer for comparison (year-agnostic) */
function encodeDate(month: number, day: number): number {
  return month * 100 + day;
}

/** Check if encoded date 'current' falls between two boundaries (inclusive start, exclusive end). */
export function isInRange(current: number, startEnc: number, endEnc: number): boolean {
  // Handle year wrap cases properly using modular logic

  const startMonth = Math.floor(startEnc / 100);
  const endMonth = Math.floor(endEnc / 100);

  // If start is in later-year section (month >= 3) and end wraps to early year (month < 3):
  if (startMonth >= 3 && endMonth < 3) {
    return current >= startEnc || current < endEnc;
  }

  // Standard case: both in same section
  return current >= startEnc && current < endEnc;
}

/**
 * Returns the tropical zodiac sign for a given birthday.
 * Uses standard astronomical date ranges.
 *
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @returns The corresponding ZodiacSign, or null if invalid date
 */
export function getSignByDate(month: number, day: number): ZodiacSign | null {
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  const daysInMonth = new Date(2024, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return null;
  }

  const currentEnc = encodeDate(month, day);

  for (let i = 0; i < ZODIAC_BOUNDARIES.length; i++) {
    const startBoundary = ZODIAC_BOUNDARIES[i];
    const nextBoundary = ZODIAC_BOUNDARIES[(i + 1) % ZODIAC_BOUNDARIES.length];

    const startEnc = encodeDate(startBoundary.month, startBoundary.day);
    const endEnc = encodeDate(nextBoundary.month, nextBoundary.day);

    if (isInRange(currentEnc, startEnc, endEnc)) {
      return startBoundary.sign;
    }
  }

  return null;
}
