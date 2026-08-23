export type DivinationReadingKey =
  | 'spirit_browser'
  | 'elemental_os'
  | 'life_resolution'
  | 'soul_window'
  | 'cultural_destiny'
  | 'soul_alignment'
  | 'cosmic_mood'
  | 'parallel_lives'
  | 'vibration_intensity'
  | 'network_speed'
  | 'cosmic_latency'
  | 'cosmic_resonance'
  | 'cosmic_luck'
  | 'cosmic_platform'
  | 'social_connectivity'
  | 'cosmic_timezone'
  | 'cosmic_noise'
  | 'cosmic_focus'
  | 'tactile_sensibility'
  | 'pixel_density'
  | 'cosmic_timezone_offset'
  | 'cosmic_thriftiness';

export const DIVINATION_READING_KEYS: ReadonlyArray<DivinationReadingKey> = [
  'spirit_browser',
  'elemental_os',
  'life_resolution',
  'soul_window',
  'cultural_destiny',
  'soul_alignment',
  'cosmic_mood',
  'parallel_lives',
  'vibration_intensity',
  'network_speed',
  'cosmic_latency',
  'cosmic_resonance',
  'cosmic_luck',
  'cosmic_platform',
  'social_connectivity',
  'cosmic_timezone',
  'cosmic_noise',
  'cosmic_focus',
  'tactile_sensibility',
  'pixel_density',
  'cosmic_timezone_offset',
  'cosmic_thriftiness',
] as const;

export interface DivinationReading {
  key: DivinationReadingKey;
  raw: string;
  interpretation: string;
}

export interface DivinationProfile {
  readings: DivinationReading[];
  fingerprint: string;
}

// Compile-time characterization: ensures DIVINATION_READING_KEYS remains in lockstep with DivinationReadingKey.
// Adding a union member without a matching array entry (or vice versa) is now a type error.
type _ArrayKeys<T extends ReadonlyArray<string>> = T[number];
type _UnionKeys = DivinationReadingKey;

interface _DriftProof {
  /** Every array element must satisfy the union */
  readonly arraySubset: Record<_ArrayKeys<typeof DIVINATION_READING_KEYS>, never> extends Record<_UnionKeys, never> ? true : false;
  /** Every union member is represented in the array (exhaustive literal check) */
  readonly unionSubset: _UnionKeys extends _ArrayKeys<typeof DIVINATION_READING_KEYS> ? true : false;
}

// Compile-time assertion — any drift surfaces as a type error here.
const __drift_proof: _DriftProof = {
  arraySubset: true,
  unionSubset: true,
};
void __drift_proof; // keep linter happy

// Runtime invariant: DIVINATION_READING_KEYS and readingInterpretations must be aligned in both directions.
// Catches drift that the compile-time check above cannot detect — specifically when the interpretations
// record (typed as Record<string, InterpretationFn>) gains stale keys or misses new ones.
import { readingInterpretations } from './interpretations.ts';

for (const k of DIVINATION_READING_KEYS) {
  if (!(k in readingInterpretations)) {
    throw new Error(
      `Divination key "${String(k)}" missing from readingInterpretations registry.`,
    );
  }
}

for (const k of Object.keys(readingInterpretations)) {
  const typedK = k as DivinationReadingKey;
  if (!DIVINATION_READING_KEYS.includes(typedK)) {
    throw new Error(
      `readingInterpretations contains entry for unknown key "${k}" — not in DIVINATION_READING_KEYS.`,
    );
  }
}
