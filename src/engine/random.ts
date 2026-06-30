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

/** Create a daily seed from date string + extra salt */
export function dailySeed(dateStr: string, salt: string): number {
  return hashString(dateStr + ':' + salt);
}
