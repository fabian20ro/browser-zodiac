import type { SeededRandom } from './types.ts';

/** Mulberry32 — fast 32-bit seeded PRNG. Returns a constant-zero RNG when the seed is NaN or ±Infinity, matching the sign-assigner fallback pattern for degenerate input. */
export function mulberry32(seed: number): SeededRandom {
  if (!Number.isFinite(seed)) return () => 0;
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

export function dailySeed(dateStr: string, salt: string, timePart?: string): number {
  let withTime = dateStr;
  if (timePart) {
    const parts = timePart.split(':');
    const h = Number(parts[0]) || 0;
    const m = Number(parts[1]) || 0;
    if (!(h < 0 || h > 23) && !(m < 0 || m > 59)) {
      withTime += ':' + `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }
  return hashString(withTime + ':' + salt);
}
