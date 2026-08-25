import { hashString, mulberry32 } from '../engine/random';
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, type ZodiacSign } from '../horoscope/zodiac';

export type AstroElement = 'fire' | 'earth' | 'air' | 'water';

const ELEMENT_BY_SIGN: Record<ZodiacSign, AstroElement> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
};

/** Returns the astrological element (fire/earth/air/water) for a zodiac sign. */
export function getSignElement(sign: ZodiacSign): AstroElement {
  return ELEMENT_BY_SIGN[sign];
}

function _assignFromHash(hash: number, length: number): ZodiacSign {
  const index = (hash % length + length) % length;
  return ZODIAC_SIGNS[index >= length ? 0 : index];
}

export function assignSign(fingerprint: string): ZodiacSign {
  if (typeof fingerprint !== 'string') {
    throw new TypeError('assignSign requires a string fingerprint');
  }
  const normalized = fingerprint.normalize().toLowerCase();
  const hash = hashString(normalized);
  return _assignFromHash(hash, ZODIAC_SIGNS.length);
}

/**
 * Assigns a sign based on fingerprint and a specific date to allow for time-varying results.
 * Uses the local calendar day (not UTC), so two Date objects representing the same local
 * date in different timezones produce the same result.
 */
export function assignDailySign(fingerprint: string, date: Date): ZodiacSign {
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError('assignDailySign requires a valid Date');
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const normalized = `${fingerprint}:${dateStr}`.toLowerCase();
  const hash = hashString(normalized);
  return _assignFromHash(hash, ZODIAC_SIGNS.length);
}

/**
 * Assigns a sign with a specific symbol for visualization.
 */
export function assignSignWithSymbol(fingerprint: string): { sign: ZodiacSign; symbol: string } {
  const sign = assignSign(fingerprint);
  return { sign, symbol: ZODIAC_SYMBOLS[sign] };
}

/**
 * Assigns a sign with its astrological element (fire/earth/air/water).
 */
export function assignSignWithElement(fingerprint: string): { sign: ZodiacSign; element: AstroElement } {
  const sign = assignSign(fingerprint);
  return { sign, element: getSignElement(sign) };
}

/**
 * Assigns signs to a batch of fingerprints. Useful for reading multiple people at once.
 */
export function assignSigns(fingerprints: string[]): ZodiacSign[] {
  return fingerprints.filter(Boolean).map(assignSign);
}

/**
 * Assigns a random zodiac sign using the seeded PRNG.
 * Without a seed, each invocation produces a fresh unpredictable result.
 * With a numeric seed, the same seed always yields the same sign, making
 * "random readings" reproducible (e.g. shareable by seed). Useful for
 * "random reading" features and testing.
 */
export function assignRandomSign(seed?: number): ZodiacSign {
  if (seed !== undefined && !Number.isFinite(seed)) {
    throw new TypeError('assignRandomSign requires a finite numeric seed');
  }
  const rng = mulberry32(Math.floor(seed ?? Math.random() * 0x80000000));
  return _assignFromHash(rng() * ZODIAC_SIGNS.length | 0, ZODIAC_SIGNS.length);
}
