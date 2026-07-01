import { hashString } from '../engine/random';
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, type ZodiacSign } from '../horoscope/zodiac';

export function assignSign(fingerprint: string): ZodiacSign {
  const normalized = fingerprint.normalize().toLowerCase();
  const hash = hashString(normalized);
  const index = hash % ZODIAC_SIGNS.length;
  return ZODIAC_SIGNS[index];
}

/**
 * Assigns a sign based on fingerprint and a specific date to allow for time-varying results.
 */
export function assignDailySign(fingerprint: string, date: Date): ZodiacSign {
  const dateStr = date.toISOString().split('T')[0];
  const normalized = `${fingerprint}:${dateStr}`.toLowerCase();
  const hash = hashString(normalized);
  const index = hash % ZODIAC_SIGNS.length;
  return ZODIAC_SIGNS[index];
}

/**
 * Assigns a sign with a specific symbol for visualization.
 */
export function assignSignWithSymbol(fingerprint: string): { sign: ZodiacSign; symbol: string } {
  const sign = assignSign(fingerprint);
  return { sign, symbol: ZODIAC_SYMBOLS[sign] };
}
