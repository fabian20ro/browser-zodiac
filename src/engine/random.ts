import type { SeededRandom } from './types.ts';

/** Mulberry32 — fast 32-bit seeded PRNG */
export function mulberry32(seed: number): SeededRandom {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t = (t + Math.imul(t ^ (t >>> 7), 0x243f6a88)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simple string hash (djb2) → 32-bit integer */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33 + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** Normalize a time-part to zero-padded HH:MM. Handles "9" → "09", "14:3" → "14:03".
 * Rejects seconds precision — treats 'HH:MM:SS' as 'HH:MM'. */
function normalizeTimePart(timePart: string | undefined): string {
  if (!timePart) return '';
  const parts = timePart.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  // Validate range to prevent invalid seeds from malformed input
  if (h < 0 || h > 23) return '';
  if (m < 0 || m > 59) return '';
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function dailySeed(dateStr: string, salt: string, timePart?: string): number {
  const normalized = normalizeTimePart(timePart);
  const withTime = normalized ? dateStr + ':' + normalized : dateStr;
  return hashString(withTime + ':' + salt);
}
