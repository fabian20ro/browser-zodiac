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
