import type { DivinationReading, DivinationProfile } from './types';
export type { DivinationProfile };
import { readingInterpretations } from './interpretations';

function detectBrowser(ua: string): string {
  if (ua.includes('Firefox') || ua.includes('FxiOS')) return 'Firefox';
  if (ua.includes('Edg') || ua.includes('EdgiOS')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera') || ua.includes('OPiOS')) return 'Opera';
  if (ua.includes('Chrome') || ua.includes('CriOS')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function detectOS(ua: string): string {
  if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) return 'iOS';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

function getColorScheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) return 'dark';
  return 'light';
}

function getTimeOfDay(hour: number): string {
  if (hour < 6) return 'deep_night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function readBrowserOracle(): DivinationProfile {
  const ua = navigator?.userAgent || '';
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const screenRes = `${screen?.width || 0}x${screen?.height || 0}`;
  const lang = (navigator?.language || '').trim();
  const colorScheme = getColorScheme();
  const hour = new Date().getHours();
  const timeOfDay = getTimeOfDay(hour);
  const cores = navigator?.hardwareConcurrency || 0;
  const platform = (navigator?.platform || 'unknown').trim() || 'unknown';
  const online = navigator?.onLine ?? false;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Void';
  const windowSize = `${window?.innerWidth || 0}x${window?.innerHeight || 0}`;
  const touchPoints = navigator?.maxTouchPoints || 0;
  const navConn = navigator && (navigator as any).connection;
  const networkSpeed = navConn?.effectiveType || 'unknown';
  const devicePixelRatio = window?.devicePixelRatio || 1;
  const timezoneOffsetMinutes = navigator ? new Date().getTimezoneOffset() : null;

  const readings: DivinationReading[] = [
    {
      key: 'spirit_browser',
      raw: browser,
      interpretation: readingInterpretations['spirit_browser'](browser),
    },
    {
      key: 'elemental_os',
      raw: os,
      interpretation: readingInterpretations['elemental_os'](os),
    },
    {
      key: 'life_resolution',
      raw: screenRes,
      interpretation: readingInterpretations['life_resolution'](screenRes),
    },
    {
      key: 'soul_window',
      raw: windowSize,
      interpretation: readingInterpretations['soul_window'](windowSize),
    },
    {
      key: 'cultural_destiny',
      raw: lang,
      interpretation: readingInterpretations['cultural_destiny'](lang),
    },
    {
      key: 'soul_alignment',
      raw: colorScheme,
      interpretation: readingInterpretations['soul_alignment'](colorScheme),
    },
    {
      key: 'cosmic_mood',
      raw: timeOfDay,
      interpretation: readingInterpretations['cosmic_mood'](timeOfDay),
    },
    {
      key: 'parallel_lives',
      raw: cores > 0 ? String(cores) : 'unknowable',
      interpretation: readingInterpretations['parallel_lives'](cores > 0 ? String(cores) : 'unknowable'),
    },
    {
      key: 'vibration_intensity',
      raw: cores > 0 ? String(cores) : 'unknowable',
      interpretation: readingInterpretations['vibration_intensity'](cores > 0 ? String(cores) : 'unknowable'),
    },
    {
      key: 'network_speed',
      raw: networkSpeed,
      interpretation: readingInterpretations['network_speed'](networkSpeed),
    },
    {
      key: 'cosmic_latency',
      raw: navigator ? ((navigator as any).connection?.rtt?.toString() || 'unknown') : 'unknown',
      interpretation: readingInterpretations['cosmic_latency'](navigator ? ((navigator as any).connection?.rtt?.toString() || 'unknown') : 'unknown'),
    },
    {
      key: 'cosmic_resonance',
      raw: online ? 'harmonious' : 'discordant',
      interpretation: readingInterpretations['cosmic_resonance'](online ? 'harmonious' : 'discordant'),
    },
    {
      key: 'cosmic_luck',
      raw: online ? 'auspicious' : 'ominous',
      interpretation: readingInterpretations['cosmic_luck'](online ? 'auspicious' : 'ominous'),
    },
    {
      key: 'cosmic_platform',
      raw: platform,
      interpretation: readingInterpretations['cosmic_platform'](platform),
    },
    {
      key: 'social_connectivity',
      raw: online ? 'connected' : 'hermit',
      interpretation: readingInterpretations['social_connectivity'](online ? 'connected' : 'hermit'),
    },
    {
      key: 'cosmic_timezone',
      raw: timezone,
      interpretation: readingInterpretations['cosmic_timezone'](timezone),
    },
    {
      key: 'cosmic_noise',
      raw: ua.length.toString(),
      interpretation: readingInterpretations['cosmic_noise'](ua.length.toString() || 'unknown'),
    },
    {
      key: 'cosmic_focus',
      raw: navigator ? ((navigator as any).deviceMemory?.toString() || 'unknown') : 'unknown',
      interpretation: readingInterpretations['cosmic_focus'](navigator ? ((navigator as any).deviceMemory?.toString() || 'unknown') : 'unknown'),
    },
    {
      key: 'tactile_sensibility',
      raw: touchPoints > 0 ? 'sensitive' : 'numb',
      interpretation: readingInterpretations['tactile_sensibility'](touchPoints > 0 ? 'sensitive' : 'numb'),
    },
    {
      key: 'pixel_density',
      raw: devicePixelRatio.toString(),
      interpretation: readingInterpretations['pixel_density'](devicePixelRatio.toString()),
    },
    {
      key: 'cosmic_timezone_offset',
      raw: timezoneOffsetMinutes !== null ? String(timezoneOffsetMinutes) : 'unknown',
      interpretation: readingInterpretations['cosmic_timezone_offset'](timezoneOffsetMinutes !== null ? String(timezoneOffsetMinutes) : 'unknown'),
    },
  ];

  const fingerprint = `${ua}|${lang}|${screenRes}|${platform}|${timezone}|${networkSpeed}|${colorScheme}|${timeOfDay}|${devicePixelRatio}`;

  return { readings, fingerprint };
}
