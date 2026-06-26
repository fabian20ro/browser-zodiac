import { hashString } from '../engine/random.ts';
import { ZODIAC_SIGNS, type ZodiacSign } from '../horoscope/zodiac.ts';

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
  const normalized = `${fingerprint}:${dateStr}`.normalize().toLowerCase();
  const hash = hashString(normalized);
  const index = hash % ZODIAC_SIGNS.length;
  return ZODIAC_SIGNS[index];
}
