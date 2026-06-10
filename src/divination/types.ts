export interface DivinationReading {
  key: string;
  raw: string;
  interpretation: string;
}

export interface DivinationProfile {
  readings: DivinationReading[];
  fingerprint: string;
}
