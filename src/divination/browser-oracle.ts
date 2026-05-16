export interface DivinationReading {
  key: string;
  raw: string;
  interpretation: string;
}

export interface DivinationProfile {
  readings: DivinationReading[];
  fingerprint: string;
}

function detectBrowser(ua: string): string {
  if (ua.includes('Firefox') || ua.includes('FxiOS')) return 'Firefox';
  if (ua.includes('Edg') || ua.includes('EdgiOS')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera') || ua.includes('OPiOS')) return 'Opera';
  if (ua.includes('Chrome') || ua.includes('CriOS')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function detectOS(ua: string): string {
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

function getColorScheme(): 'dark' | 'light' {
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
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
  const ua = navigator.userAgent;
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const screenRes = `${screen.width}x${screen.height}`;
  const lang = navigator.language.trim();
  const colorScheme = getColorScheme();
  const hour = new Date().getHours();
  const timeOfDay = getTimeOfDay(hour);
  const cores = navigator.hardwareConcurrency || 0;
  const platform = (navigator.platform || 'unknown').trim() || 'unknown';
  const online = navigator.onLine;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Void';
  const windowSize = `${window.innerWidth}x${window.innerHeight}`;

  const readings: DivinationReading[] = [
    {
      key: 'spirit_browser',
      raw: browser,
      interpretation: '',
    },
    {
      key: 'elemental_os',
      raw: os,
      interpretation: '',
    },
    {
      key: 'life_resolution',
      raw: screenRes,
      interpretation: '',
    },
    {
      key: 'soul_window',
      raw: windowSize,
      interpretation: '',
    },
    {
      key: 'cultural_destiny',
      raw: lang,
      interpretation: '',
    },
    {
      key: 'soul_alignment',
      raw: colorScheme,
      interpretation: '',
    },
    {
      key: 'temporal_energy',
      raw: timeOfDay,
      interpretation: '',
    },
    {
      key: 'parallel_lives',
      raw: cores > 0 ? String(cores) : 'unknowable',
      interpretation: '',
    },
    {
      key: 'cosmic_platform',
      raw: platform,
      interpretation: '',
    },
    {
      key: 'social_connectivity',
      raw: online ? 'connected' : 'hermit',
      interpretation: '',
    },
    {
      key: 'cosmic_timezone',
      raw: timezone,
      interpretation: '',
    },
  ];

  // Fingerprint from stable properties for sign assignment
  const fingerprint = `${ua}|${lang}|${screenRes}|${platform}|${timezone}`;

  return { readings, fingerprint };
}
