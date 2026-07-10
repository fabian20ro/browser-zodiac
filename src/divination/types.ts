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

export interface DivinationReading {
  key: DivinationReadingKey;
  raw: string;
  interpretation: string;
}

export interface DivinationProfile {
  readings: DivinationReading[];
  fingerprint: string;
}
