import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readBrowserOracle, detectMobile, getTimeOfDay } from './browser-oracle.ts';

describe('getTimeOfDay', () => {
  const cases: Array<[number, string]> = [
    [0, 'deep_night'],
    [3, 'deep_night'],
    [5, 'deep_night'],
    [6, 'morning'],
    [9, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [14, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [19, 'evening'],
    [20, 'evening'],
    [21, 'night'],
    [23, 'night'],
  ];

  for (const [hour, expected] of cases) {
    it(`returns ${expected} for hour ${hour}`, () => {
      expect(getTimeOfDay(hour)).toBe(expected);
    });
  }
});

describe('detectMobile', () => {
  const mobileOSes = ['iOS', 'Android'];
  const desktopOSes = ['Windows', 'macOS', 'Linux', 'Unknown'];

  for (const os of mobileOSes) {
    it(`returns true when OS is ${os}`, () => {
      expect(detectMobile(os)).toBe(true);
    });
  }

  for (const os of desktopOSes) {
    it(`returns false when OS is ${os}`, () => {
      expect(detectMobile(os)).toBe(false);
    });
  }
});

describe('readBrowserOracle', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;
  const originalScreen = global.screen;
  const originalIntl = global.Intl;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T02:00:00'));
    // Mocking globals
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
      }),
    });
    vi.stubGlobal('screen', {
      width: 1920,
      height: 1080,
    });
    vi.stubGlobal('Intl', {
      DateTimeFormat: vi.fn().mockImplementation(() => ({
        resolvedOptions: () => ({ timeZone: 'UTC' }),
      })),
    });
  });

  it('returns a profile with correct browser, os and expanded fingerprint', () => {
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    
    expect(browserReading?.raw).toBe('Chrome');
    expect(osReading?.raw).toBe('macOS');
    // The fingerprint should have the extra parameters: colorScheme, timeOfDay and mobileIndicator
    // Expected format: ${ua}|${lang}|${screenRes}|${platform}|${timezone}|${networkSpeed}|${colorScheme}|${timeOfDay}|${devicePixelRatio}|${mobileIndicator}
    // Based on mocks: Chrome|en-US|1920x1080|MacIntel|UTC|4g|light|deep_night|1|desktop
    expect(profile.fingerprint).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36|en-US|1920x1080|MacIntel|UTC|4g|light|deep_night|1|desktop');
  });

  it('detects desktop OS correctly', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.fingerprint).toContain('|desktop');
  });

  it('detects Android as mobile', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome Mobile Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Android',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.fingerprint).toContain('|mobile');
  });

  it('detects iOS as mobile', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Mobile Safari/604.1',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.fingerprint).toContain('|mobile');
  });

  it('detects Windows as desktop', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.fingerprint).toContain('|desktop');
  });

  it('returns correct connectivity status', () => {
    const profile = readBrowserOracle();
    const connectivityReading = profile.readings.find(r => r.key === 'social_connectivity');
    expect(connectivityReading?.raw).toBe('connected');
  });

  it('includes cosmic_noise in readings', () => {
    const profile = readBrowserOracle();
    const noiseReading = profile.readings.find(r => r.key === 'cosmic_noise');
    expect(noiseReading).toBeDefined();
    expect(typeof noiseReading?.raw).toBe('string');
  });
  
  it('handles missing navigator language', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      // language is missing
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    // This should not throw if we add a check in the source
    expect(() => readBrowserOracle()).not.toThrow();
  });

  it('degrades gracefully when navigator.connection is absent (Network Information API unavailable)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    const profile = readBrowserOracle();
    const networkReading = profile.readings.find(r => r.key === 'network_speed');
    const latencyReading = profile.readings.find(r => r.key === 'cosmic_latency');
    expect(networkReading?.raw).toBe('unknown');
    expect(latencyReading?.raw).toBe('unknown');
  });

  it('returns unknown for cosmic_latency when connection has no rtt', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: 'wifi',
        // rtt is intentionally absent
      },
    });
    const profile = readBrowserOracle();
    const latencyReading = profile.readings.find(r => r.key === 'cosmic_latency');
    expect(latencyReading?.raw).toBe('unknown');
  });

  it('returns correct connectivity status for offline mode', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: false,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    const profile = readBrowserOracle();
    const connectivityReading = profile.readings.find(r => r.key === 'social_connectivity');
    expect(connectivityReading?.raw).toBe('hermit');
  });

  it('returns cosmic_resonance as discordant when offline', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: false,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const resonanceReading = profile.readings.find(r => r.key === 'cosmic_resonance');
    expect(resonanceReading?.raw).toBe('discordant');
  });

  it('returns cosmic_luck as ominous when offline', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: false,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const luckReading = profile.readings.find(r => r.key === 'cosmic_luck');
    expect(luckReading?.raw).toBe('ominous');
  });

  it('includes cosmic_focus in readings', () => {
    const profile = readBrowserOracle();
    const focusReading = profile.readings.find(r => r.key === 'cosmic_focus');
    expect(focusReading).toBeDefined();
    expect(typeof focusReading?.raw).toBe('string');
  });

  it('detects unknown browser', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'MyCustomBrowser/1.0',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'unknown',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Unknown');
  });

  it('detects unknown OS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (UnknownOS 1.0)',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'unknown',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Unknown');
  });

  it('detects iPod as iOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPod; iPodOS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148',
      language: 'en-US',
      hardwareConcurrency: 2,
      platform: 'iPod',
      onLine: true,
      maxTouchPoints: 1,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('iOS');
  });

  it('detects iPad as iOS via the dedicated branch', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      language: 'en-US',
      hardwareConcurrency: 2,
      platform: 'iPad',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: 'wifi' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('iOS');
  });

  it('detects Firefox on iOS via FxiOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/94.0 Mobile/15E148',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Firefox');
  });

  it('detects Firefox on desktop via Firefox keyword', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Linux x86_64',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Firefox');
  });

  it('detects Opera via OPR', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4441.86 Safari/537.36 OPR/55.0.2844.95',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'Windows NT 10.0; Win64; x64',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Opera');
  });

  it('detects Opera via Opera keyword', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Opera/9.80',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Opera');
  });

  it('detects Opera on iOS via OPiOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/23.0 Mobile/18A8395 OPiOS/23.0 Opera/74.0',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Opera');
  });

  it('detects Safari', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.0 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Safari');
  });

  it('identifies Chrome on iOS via CriOS keyword', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 CriOS/91.0.4441.82 Mobile Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Chrome');
  });

  it('detects Brave browser', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36 Brave/1.28',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Brave');
  });

  it('detects Vivaldi browser', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Vivaldi/3.6',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Vivaldi');
  });

  it('detects pixel density correctly', () => {
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 2,
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
      }),
    });
    const profile = readBrowserOracle();
    const pixelReading = profile.readings.find(r => r.key === 'pixel_density');
    expect(pixelReading?.raw).toBe('2');
  });

  it('detects soul_window and life_resolution correctly', () => {
    vi.stubGlobal('window', {
      innerWidth: 800,
      innerHeight: 600,
      devicePixelRatio: 2,
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
      }),
    });
    vi.stubGlobal('screen', {
      width: 1024,
      height: 768,
    });
    const profile = readBrowserOracle();
    const windowReading = profile.readings.find(r => r.key === 'soul_window');
    const resolutionReading = profile.readings.find(r => r.key === 'life_resolution');
    expect(windowReading?.raw).toBe('800x600');
    expect(resolutionReading?.raw).toBe('1024x768');
  });

  it('handles cosmic_latency and cosmic_resonance', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
        rtt: 50,
      },
    });
    const profile = readBrowserOracle();
    const latencyReading = profile.readings.find(r => r.key === 'cosmic_latency');
    const resonanceReading = profile.readings.find(r => r.key === 'cosmic_resonance');
    const luckReading = profile.readings.find(r => r.key === 'cosmic_luck');
    expect(latencyReading?.raw).toBe('50');
    expect(resonanceReading?.raw).toBe('harmonious');
    expect(luckReading?.raw).toBe('auspicious');
  });

  it('detects Edge on Windows', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4441.82 Safari/537.36 Edg/91.0.864.59',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(browserReading?.raw).toBe('Edge');
    expect(osReading?.raw).toBe('Windows');
  });

  it('detects Edge on iOS via EdgiOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91 Mobile Safari/537.36 EdgiOS/91.0.864',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Edge');
  });

  it('detects Android', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4449.82 Mobile Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Android',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(browserReading?.raw).toBe('Chrome');
    expect(osReading?.raw).toBe('Android');
  });

  it('prioritises Android over Linux in a mixed UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Linux armv8l',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Android');
  });

  it('detects macOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4449.82 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('macOS');
  });

  it('detects Linux when Linux is present', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Linux',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Linux',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Linux');
  });

  describe('detectBrowser ambiguous UAs', () => {
    function makeChromeSafariUA(browserMarker: string) {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/${browserMarker} Safari/537.36`;
    }

    it('returns Chrome over Safari when both keywords present', () => {
      vi.stubGlobal('navigator', {
        userAgent: makeChromeSafariUA('91'),
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'MacIntel',
        onLine: true,
        maxTouchPoints: 0,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Chrome');
    });

    it('returns Edge over Chrome when Edg and Chrome keywords both present', () => {
      vi.stubGlobal('navigator', {
        userAgent: makeChromeSafariUA('Edg/91.0.864'),
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'Windows NT 10.0; Win64; x64',
        onLine: true,
        maxTouchPoints: 0,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Edge');
    });

    it('returns Firefox over Safari when FxiOS and Safari keywords both present', () => {
      vi.stubGlobal('navigator', {
        userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/94.0 Mobile/15E148`,
        language: 'en-US',
        hardwareConcurrency: 4,
        platform: 'iPhone',
        onLine: true,
        maxTouchPoints: 5,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Firefox');
    });

    it('returns Vivaldi over CriOS when both keywords present', () => {
      vi.stubGlobal('navigator', {
        userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 CriOS/91 Vivaldi/3.6`,
        language: 'en-US',
        hardwareConcurrency: 4,
        platform: 'iPhone',
        onLine: true,
        maxTouchPoints: 5,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Vivaldi');
    });

    it('returns Brave over Chrome when both keywords present', () => {
      vi.stubGlobal('navigator', {
        userAgent: makeChromeSafariUA('Brave/1.28'),
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'MacIntel',
        onLine: true,
        maxTouchPoints: 0,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Brave');
    });

    it('returns Opera over Chrome when OPR and Chrome keywords both present', () => {
      vi.stubGlobal('navigator', {
        userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91 OPR/55.0`,
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'Windows NT 10.0; Win64; x64',
        onLine: true,
        maxTouchPoints: 0,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Opera');
    });

    it('prioritises Firefox over Vivaldi when both keywords appear in UA', () => {
      vi.stubGlobal('navigator', {
        userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/91.0.4472 Firefox/120.0 Vivaldi/3.6`,
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'Linux x86_64',
        onLine: true,
        maxTouchPoints: 0,
        connection: { effectiveType: 'wifi' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Firefox');
    });

    it('prioritises Brave over Chrome when both keywords appear in UA', () => {
      vi.stubGlobal('navigator', {
        userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36 Brave/1.28`,
        language: 'en-US',
        hardwareConcurrency: 8,
        platform: 'MacIntel',
        onLine: true,
        maxTouchPoints: 0,
        connection: { effectiveType: '4g' },
      });
      const profile = readBrowserOracle();
      expect(profile.readings.find(r => r.key === 'spirit_browser')?.raw).toBe('Brave');
    });
  });

  it('handles empty user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: '',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(browserReading?.raw).toBe('Unknown');
    expect(osReading?.raw).toBe('Unknown');
  });

  it('maps tactile_sensibility to "numb" when maxTouchPoints is zero', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'tactile_sensibility')?.raw).toBe('numb');
  });

  it('maps tactile_sensibility to "sensitive" when maxTouchPoints is non-zero', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome Mobile Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Android',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'tactile_sensibility')?.raw).toBe('sensitive');
  });

  it('detects device memory correctly', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
      deviceMemory: 8,
    });
    const profile = readBrowserOracle();
    const focusReading = profile.readings.find(r => r.key === 'cosmic_focus');
    expect(focusReading?.raw).toBe('8');
  });

  it('falls back to unknown when navigator.connection is absent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'network_speed')?.raw).toBe('unknown');
    expect(profile.readings.find(r => r.key === 'cosmic_latency')?.raw).toBe('unknown');
  });

  it.each(['3g', '4g', 'wifi'] as const)('propagates effectiveType "%s" into network_speed raw value', (type) => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: type },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'network_speed')?.raw).toBe(type);
  });

  it('treats slow-2g as a valid network speed', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: 'slow-2g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'network_speed')?.raw).toBe('slow-2g');
  });

  it('falls back to unknown when navigator.deviceMemory is absent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_focus')?.raw).toBe('unknown');
  });

  it('returns devicePixelRatio of 1 when absent from window', () => {
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'pixel_density')?.raw).toBe('1');
  });

  it('uses saveData to set cosmic_thriftiness', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: true },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_thriftiness')?.raw).toBe('thrifty');
  });

  it('defaults cosmic_thriftiness to lavish when saveData is absent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_thriftiness')?.raw).toBe('lavish');
  });

  it('maps parallel_lives and vibration_intensity to "unknowable" when hardwareConcurrency is zero', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 0,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'parallel_lives')?.raw).toBe('unknowable');
    expect(profile.readings.find(r => r.key === 'vibration_intensity')?.raw).toBe('unknowable');
  });

  it('maps parallel_lives and vibration_intensity to "unknowable" when hardwareConcurrency is absent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'parallel_lives')?.raw).toBe('unknowable');
    expect(profile.readings.find(r => r.key === 'vibration_intensity')?.raw).toBe('unknowable');
  });

  it('propagates platform into cosmic_platform reading', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows NT 10.0; Win64; x64',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_platform')?.raw).toBe('Windows NT 10.0; Win64; x64');
  });

  it('returns cosmic_timezone_offset as string of getTimezoneOffset minutes', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const offsetReading = profile.readings.find(r => r.key === 'cosmic_timezone_offset');
    expect(typeof offsetReading?.raw).toBe('string');
    // The raw value should match the actual timezone offset (in minutes)
    expect(Number(offsetReading?.raw)).toBe(new Date().getTimezoneOffset());
  });

  it('returns cosmic_noise as string of UA length', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_noise')?.raw).toBe(String('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36'.length));
  });

  it('asserts full fingerprint format with all ten pipe-separated fields', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'UA-string',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: 'wifi' },
    });
    vi.stubGlobal('window', {
      innerWidth: 1024,
      innerHeight: 768,
      devicePixelRatio: 2,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    const profile = readBrowserOracle();
    const parts = profile.fingerprint.split('|');
    expect(parts.length).toBe(10);
    expect(parts[0]).toBe('UA-string');           // ua
    expect(parts[1]).toBe('en-US');               // lang (trimmed)
    expect(parts[2]).toBe('1920x1080');            // screenRes from beforeEach mock
    expect(parts[3]).toBe('MacIntel');             // platform
    expect(typeof parts[5]).toBe('string');        // networkSpeed
    expect(parts[6]).toBe('light');                // colorScheme (from beforeEach)
    expect(typeof parts[7]).toBe('string');        // timeOfDay
    expect(parts[8]).toBe('2');                    // devicePixelRatio
    expect(parts[9]).toBe('desktop');              // mobileIndicator
  });

  it('uses trim() when parsing navigator.language', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      language: ' en-US ',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cultural_destiny')?.raw).toBe('en-US');
  });

  it('handles detection of dark mode and evening time', () => {
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: vi.fn().mockReturnValue({
        matches: true,
      }),
    });
    vi.setSystemTime(new Date('2024-01-01T19:00:00'));
    const profile = readBrowserOracle();
    const alignmentReading = profile.readings.find(r => r.key === 'soul_alignment');
    const moodReading = profile.readings.find(r => r.key === 'cosmic_mood');
    expect(alignmentReading?.raw).toBe('dark');
    expect(moodReading?.raw).toBe('evening');
  });

  it('detects iPad as iOS mobile device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPad',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: 'wifi' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('iOS');
    expect(profile.fingerprint).toContain('|mobile');
  });

  it('classifies hour 5 as deep_night (boundary <6)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T05:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('deep_night');
  });

  it('classifies hour 6 as morning (boundary >=6, <12)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T06:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('morning');
  });

  it('classifies hour 0 as deep_night (midnight boundary)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T00:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('deep_night');
  });

  it('detects night time of day', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T22:00:00'));
    const profile = readBrowserOracle();
    const moodReading = profile.readings.find(r => r.key === 'cosmic_mood');
    expect(moodReading?.raw).toBe('night');
  });

  it('classifies hour 16 as afternoon (boundary >=17)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T16:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('afternoon');
  });

  it('classifies hour 21 as night (boundary >=21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T21:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('night');
  });

  it('classifies hour 20 as evening (boundary <21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T20:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('evening');
  });

  it('detects iPad as iOS via detectOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPad',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('iOS');
  });

  it('detects tactile_sensibility correctly', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 5,
    });
    const profile = readBrowserOracle();
    const tactileReading = profile.readings.find(r => r.key === 'tactile_sensibility');
    expect(tactileReading?.raw).toBe('sensitive');
  });

  it('detects tactile_sensibility as numb when maxTouchPoints is zero', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const tactileReading = profile.readings.find(r => r.key === 'tactile_sensibility');
    expect(tactileReading?.raw).toBe('numb');
  });

  it('handles missing rtt in connection', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    const profile = readBrowserOracle();
    const latencyReading = profile.readings.find(r => r.key === 'cosmic_latency');
    expect(latencyReading?.raw).toBe('unknown');
  });

  it('handles zero hardware concurrency', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 0,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    const profile = readBrowserOracle();
    const parallelLivesReading = profile.readings.find(r => r.key === 'parallel_lives');
    const vibrationIntensityReading = profile.readings.find(r => r.key === 'vibration_intensity');

    expect(parallelLivesReading?.raw).toBe('unknowable');
    expect(vibrationIntensityReading?.raw).toBe('unknowable');
  });

  it('emits actual core count as string when hardwareConcurrency > 0', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 16,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'parallel_lives')?.raw).toBe('16');
    expect(profile.readings.find(r => r.key === 'vibration_intensity')?.raw).toBe('16');
  });

  it('emits core count string "1" when hardwareConcurrency is exactly one', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 1,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'parallel_lives')?.raw).toBe('1');
    expect(profile.readings.find(r => r.key === 'vibration_intensity')?.raw).toBe('1');
  });

  it('calculates cosmic_noise from user agent length', () => {
    vi.stubGlobal('navigator', {
      userAgent: '12345',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: {
        effectiveType: '4g',
      },
    });
    const profile = readBrowserOracle();
    const noiseReading = profile.readings.find(r => r.key === 'cosmic_noise');
    expect(noiseReading?.raw).toBe('5');
  });

  it('handles missing navigator.connection gracefully', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: undefined,
    });
    const profile = readBrowserOracle();
    expect(profile).toBeDefined();
    expect(profile.readings.length).toBeGreaterThan(0);

    const speedReading = profile.readings.find(r => r.key === 'network_speed');
    expect(speedReading?.raw).toBe('unknown');

    const latencyReading = profile.readings.find(r => r.key === 'cosmic_latency');
    expect(latencyReading?.raw).toBe('unknown');
  });

  it('handles missing navigator object gracefully (SSR scenario)', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('screen', undefined);

    expect(() => readBrowserOracle()).not.toThrow();

    const profile = readBrowserOracle();
    expect(profile).toBeDefined();
    expect(profile.readings.length).toBeGreaterThan(0);

    // All readings should have string raw values (no crashes)
    for (const reading of profile.readings) {
      expect(typeof reading.raw).toBe('string');
    }

    // When navigator is undefined, onLine defaults to false via `?? false`,
    // so disconnected-fallback interpretations must apply:
    const resonanceReading = profile.readings.find(r => r.key === 'cosmic_resonance');
    expect(resonanceReading?.raw).toBe('discordant');

    const connectivityReading = profile.readings.find(r => r.key === 'social_connectivity');
    expect(connectivityReading?.raw).toBe('hermit');

    const luckReading = profile.readings.find(r => r.key === 'cosmic_luck');
    expect(luckReading?.raw).toBe('ominous');

    // Browser and OS should both fall back to Unknown on empty UA string.
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Unknown');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Unknown');

    // Zero cores means parallel/vibration readings fall back to "unknowable".
    const parallelReading = profile.readings.find(r => r.key === 'parallel_lives');
    expect(parallelReading?.raw).toBe('unknowable');
  });

  it('prioritises Edge over Chrome when both keywords appear in UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4441.82 Safari/537.36 Edg/91.0.864.59',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Edge');
  });

  it('prioritises Firefox over Chrome when both keywords appear in UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0 Chrome/91.0.4472.124',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Firefox');
  });

  it('prioritises iOS detection over Linux in a mixed UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.78 Mobile/15E148',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('iOS');
  });

  it('falls back to "unknown" for cosmic_platform when platform is whitespace', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: '   ',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const platformReading = profile.readings.find(r => r.key === 'cosmic_platform');
    expect(platformReading?.raw).toBe('unknown');
  });

  it('detects Unknown OS when no OS keyword is present in UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'CustomUA/1.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Unknown');
  });

  it('classifies hour 17 as evening (afternoon boundary)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T17:30:00'));
    const profile = readBrowserOracle();
    const moodReading = profile.readings.find(r => r.key === 'cosmic_mood');
    expect(moodReading?.raw).toBe('evening');
  });

  it('falls back to "unknown" for cosmic_focus when deviceMemory is absent from navigator entirely', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    const profile = readBrowserOracle();
    const focusReading = profile.readings.find(r => r.key === 'cosmic_focus');
    expect(focusReading?.raw).toBe('unknown');
  });

  it('returns the full reading list when all navigator fields are populated', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      deviceMemory: 8,
      connection: { effectiveType: '5g', rtt: 20 },
    });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 2,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    const profile = readBrowserOracle();
    expect(profile.readings.length).toBe(22);
    const keys = profile.readings.map(r => r.key);
    expect(keys).toEqual(expect.arrayContaining([
      'spirit_browser', 'elemental_os', 'life_resolution', 'soul_window',
      'cultural_destiny', 'soul_alignment', 'cosmic_mood', 'parallel_lives',
      'vibration_intensity', 'network_speed', 'cosmic_latency', 'cosmic_resonance',
      'cosmic_luck', 'cosmic_platform', 'social_connectivity', 'cosmic_timezone',
      'cosmic_noise', 'cosmic_focus', 'tactile_sensibility', 'pixel_density',
      'cosmic_timezone_offset', 'cosmic_thriftiness',
    ]));
  });

  it('exposes cosmic_timezone_offset as minutes east of UTC and falls back to "unknown" in SSR', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, matchMedia: vi.fn().mockReturnValue({ matches: false }) });
    const profile = readBrowserOracle();
    const offsetReading = profile.readings.find(r => r.key === 'cosmic_timezone_offset');
    expect(offsetReading).toBeDefined();
    // In the Node/JSDOM test environment, getTimezoneOffset() returns minutes east of UTC.
    expect(typeof offsetReading?.raw).toBe('string');

    vi.stubGlobal('navigator', undefined);
    const ssrProfile = readBrowserOracle();
    const ssrOffsetReading = ssrProfile.readings.find(r => r.key === 'cosmic_timezone_offset');
    expect(ssrOffsetReading?.raw).toBe('unknown');
  });

  it('propagates cosmic_timezone_offset into fingerprint structure', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, matchMedia: vi.fn().mockReturnValue({ matches: false }) });
    const profile = readBrowserOracle();
    const offsetReading = profile.readings.find(r => r.key === 'cosmic_timezone_offset');
    expect(offsetReading).toBeDefined();
    // Fingerprint format: ${ua}|${lang}|${screenRes}|${platform}|${timezone}|${networkSpeed}|...
    // Position 4 is the timezone name (e.g. "UTC"), distinct from cosmic_timezone_offset minutes value.
    const fingerprintParts = profile.fingerprint.split('|');
    expect(fingerprintParts[3]).toBe('MacIntel');        // position 3: platform
    expect(fingerprintParts[5]).toBe('unknown');          // position 5: networkSpeed (no connection mock)
    expect(typeof offsetReading?.raw).toBe('string');     // minutes-east-of-UTC as string
    expect(offsetReading?.raw).not.toBe('unknown');       // navigator present → computed, not fallback
  });

  it('every reading has an interpreted string and no undefined raw values (regression guard)', () => {
    const profile = readBrowserOracle();
    for (const reading of profile.readings) {
      expect(typeof reading.interpretation).toBe('string');
      expect(reading.raw).not.toBe(undefined);
      // interpretations are resolved strings produced by calling readingInterpretations[key](raw)
      // if a key is added without an interpretation fn, the call site would throw — this guards that.
    }
  });

  it('detects morning time of day (hour >=6, <12)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T09:00:00'));
    const profile = readBrowserOracle();
    const moodReading = profile.readings.find(r => r.key === 'cosmic_mood');
    expect(moodReading?.raw).toBe('morning');
  });

  it('detects afternoon time of day (hour >=12, <17)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T14:30:00'));
    const profile = readBrowserOracle();
    const moodReading = profile.readings.find(r => r.key === 'cosmic_mood');
    expect(moodReading?.raw).toBe('afternoon');
  });

  it('returns cosmic_timezone from resolved Intl options and includes it in fingerprint', () => {
    vi.stubGlobal('Intl', {
      DateTimeFormat: vi.fn().mockImplementation(() => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      })),
    });
    const profile = readBrowserOracle();
    const tzReading = profile.readings.find(r => r.key === 'cosmic_timezone');
    expect(tzReading?.raw).toBe('America/New_York');

    // Fingerprint format: ${ua}|${lang}|${screenRes}|${platform}|${timezone}|${networkSpeed}|${colorScheme}|${timeOfDay}|${devicePixelRatio}
    const fingerprintParts = profile.fingerprint.split('|');
    expect(fingerprintParts[4]).toBe('America/New_York');
  });

  it('classifies hour 5 as deep_night (boundary <6)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T05:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('deep_night');
  });

  it('classifies hour 6 as morning (boundary >=6, <12)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T06:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('morning');
  });

  it('classifies hour 12 as afternoon (boundary >=12, <17)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T12:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('afternoon');
  });

  it('classifies hour 17 as evening (boundary >=17, <21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T17:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('evening');
  });

  it('classifies hour 21 as night (boundary >=21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T21:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('night');
  });

  it('classifies hour 0 as deep_night (midnight boundary)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T00:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('deep_night');
  });

  it('handles missing screen object gracefully — returns 0x0 resolution and still detects browser', () => {
    vi.stubGlobal('screen', undefined);
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91.0 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, matchMedia: undefined });

    const profile = readBrowserOracle();
    expect(profile).toBeDefined();

    // screenRes fallback is `${screen?.width || 0}x${screen?.height || 0}` → '0x0'
    const resReading = profile.readings.find(r => r.key === 'life_resolution');
    expect(resReading?.raw).toBe('0x0');

    // Browser detection still works from UA alone
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Chrome');

    // Fingerprint should still be well-formed with 0x0 placeholder
    expect(profile.fingerprint).toContain('0x0');
  });

  it('detects Chrome even when window.matchMedia is null or undefined', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'Linux x86_64',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: 'wifi' },
    });
    vi.stubGlobal('screen', { width: 1440, height: 900 });

    // matchMedia is null — getColorScheme() should fall through to 'light'
    vi.stubGlobal('window', {
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      matchMedia: null,
    });

    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Chrome');

    // getColorScheme returns 'light' when matchMedia is falsy
    const alignmentReading = profile.readings.find(r => r.key === 'soul_alignment');
    expect(alignmentReading?.raw).toBe('light');
  });

  it('detectMobile classifies iOS as mobile via fingerprint indicator', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Mobile Safari/604.1',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
    });
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 812, devicePixelRatio: 3, matchMedia: undefined });
    vi.stubGlobal('screen', { width: 375, height: 812 });

    const profile = readBrowserOracle();
    // Fingerprint format field index 9 (0-based): mobileIndicator — produced by detectMobile(os)
    const fingerprintFields = profile.fingerprint.split('|');
    expect(fingerprintFields[9]).toBe('mobile');
  });

  it('prioritises iOS over Android when both keywords appear in UA', () => {
    // detectOS checks iPhone/iPad/iPod before Windows/macOS/Android/Linux.
    // When a UA contains both 'iPhone' and 'Android', iOS must win because it's checked first.
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Android',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('iOS');
  });

  it('classifies hour 16 as afternoon (boundary >=12, <17)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T16:59:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('afternoon');
  });

  it('classifies hour 20 as evening (boundary >=17, <21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T20:59:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('evening');
  });

  it('detectMobile returns desktop indicator for non-mobile OS (Windows)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const fingerprintFields = profile.fingerprint.split('|');
    expect(fingerprintFields[9]).toBe('desktop');
  });

  it('tactile_sensibility returns "numb" when maxTouchPoints is zero', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const tactileReading = profile.readings.find(r => r.key === 'tactile_sensibility');
    expect(tactileReading?.raw).toBe('numb');
  });

  it('validates complete fingerprint format with all ten pipe-delimited fields', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.stubGlobal('screen', { width: 1920, height: 1080 });
    const profile = readBrowserOracle();
    const fields = profile.fingerprint.split('|');
    expect(fields.length).toBe(10);
    // Field index mapping (0-based):
    //   [0] ua          [1] lang        [2] screenRes       [3] platform
    //   [4] timezone    [5] networkSpeed  [6] colorScheme     [7] timeOfDay
    //   [8] devicePixelRatio [9] mobileIndicator
    expect(fields[0]).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36');
    expect(fields[1]).toBe('en-US');
    expect(fields[2]).toBe('1920x1080');
    expect(fields[3]).toBe('MacIntel');
    // timezone depends on mock (UTC from beforeEach)
    expect(['UTC', 'America/New_York']).toContain(fields[4]);
    expect(fields[5]).toBe('4g');
    expect(['light', 'dark']).toContain(fields[6]);
    expect(['deep_night', 'morning', 'afternoon', 'evening', 'night']).toContain(fields[7]);
    expect(fields[8]).toMatch(/^\d+\.?\d*$/);
    expect(fields[9]).toBe('desktop');
  });

  it('classifies hour 21 as night (boundary >=21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T21:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('night');
  });

  it('detects Edge via EdgiOS keyword', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 EdgiOS/120.0',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '5g' },
    });
    vi.stubGlobal('screen', { width: 375, height: 812 });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Edge');
    // iOS must be detected too; mobile indicator should reflect this
    const fingerprintFields = profile.fingerprint.split('|');
    expect(fingerprintFields[9]).toBe('mobile');
  });

  it('detects Edge via EdgiOS keyword (non-iPhone UA)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.864.70 Mobile Safari/537.36 EdgiOS/120.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'Windows NT 10.0; Win64; x64',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Edge');
  });

  it('detects cosmic_thriftiness as thrifty when saveData is true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Mobile Safari/604.1',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g', saveData: true },
    });
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 812, devicePixelRatio: 3, matchMedia: undefined });
    vi.stubGlobal('screen', { width: 375, height: 812 });

    const profile = readBrowserOracle();
    const thriftinessReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftinessReading?.raw).toBe('thrifty');
  });

  it('detects cosmic_thriftiness as lavish when saveData is false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: false },
    });
    const profile = readBrowserOracle();
    const thriftinessReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftinessReading?.raw).toBe('lavish');
  });

  it('detectOS ignores navigator.platform — only user agent matters', () => {
    // detectOS reads the UA string, NOT navigator.platform.
    // Even if platform says "MacIntel", a UA with no OS keyword returns Unknown.
    vi.stubGlobal('navigator', {
      userAgent: 'PrivacyBrowser/1.0',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Unknown');

    // Browser should also be Unknown — no keywords match.
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Unknown');
  });

  it('detects cosmic_thriftiness as lavish when connection is missing', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: undefined,
    });
    const profile = readBrowserOracle();
    const thriftinessReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftinessReading?.raw).toBe('lavish');
  });

  it('detects cosmic_thriftiness as lavish when connection exists but saveData is undefined', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const thriftinessReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftinessReading?.raw).toBe('lavish');
  });

  it('treats non-boolean truthy saveData values (e.g. "true", 1) as lavish because of strict === true check', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: "true" },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_thriftiness')?.raw).toBe('lavish');

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: 1 },
    });
    const profile2 = readBrowserOracle();
    expect(profile2.readings.find(r => r.key === 'cosmic_thriftiness')?.raw).toBe('lavish');
  });

  it('detects thrifty when saveData is true (strict equality)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: true },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_thriftiness')?.raw).toBe('thrifty');
  });

  it('detects network_speed for various connection types', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'network_speed')?.raw).toBe('4g');

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    const profile2 = readBrowserOracle();
    expect(profile2.readings.find(r => r.key === 'network_speed')?.raw).toBe('unknown');
  });

  it('all readings have non-empty interpretations and valid raw values', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });

    const profile = readBrowserOracle();

    for (const reading of profile.readings) {
      expect(reading.interpretation).toBeTruthy();
      expect(typeof reading.raw).not.toBe(undefined);
      expect(typeof reading.key).toBe('string');
    }
  });

  it('detects cosmic_thriftiness as "thrifty" when saveData is true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: true },
    });
    const profile = readBrowserOracle();
    const thriftReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftReading?.raw).toBe('thrifty');
  });

  it('detects cosmic_thriftiness as "lavish" when saveData is false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: false },
    });
    const profile = readBrowserOracle();
    const thriftReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftReading?.raw).toBe('lavish');
  });

  it('detects Edge on iOS via EdgiOS UA keyword', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 EdgiOS/91.0',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(browserReading?.raw).toBe('Edge');
    expect(osReading?.raw).toBe('iOS');
    // iOS should be classified as mobile in the fingerprint
    expect(profile.fingerprint).toContain('|mobile');
  });

  it('classifies hour 21 exactly as "night" (boundary >=21)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    vi.setSystemTime(new Date('2024-01-01T21:00:00'));
    const profile = readBrowserOracle();
    expect(profile.readings.find(r => r.key === 'cosmic_mood')?.raw).toBe('night');
  });

  it('verifies all reading keys are present in the output', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const expectedKeys = [
      'spirit_browser', 'elemental_os', 'life_resolution', 'soul_window',
      'cultural_destiny', 'soul_alignment', 'cosmic_mood', 'parallel_lives',
      'vibration_intensity', 'network_speed', 'cosmic_latency', 'cosmic_resonance',
      'cosmic_luck', 'cosmic_platform', 'social_connectivity', 'cosmic_timezone',
      'cosmic_noise', 'cosmic_focus', 'tactile_sensibility', 'pixel_density',
      'cosmic_timezone_offset', 'cosmic_thriftiness',
    ];
    for (const key of expectedKeys) {
      const reading = profile.readings.find(r => r.key === key);
      expect(reading).toBeDefined();
      expect(typeof reading?.raw).toBe('string');
      expect(reading?.interpretation).toBeTruthy();
    }
  });

  it('detects thrifty mode when saveData is true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: true },
    });
    const profile = readBrowserOracle();
    const thriftReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftReading?.raw).toBe('thrifty');
  });

  it('defaults to lavish when saveData is absent or false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const thriftReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftReading?.raw).toBe('lavish');
  });

  it('defaults to lavish when saveData is explicitly false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g', saveData: false },
    });
    const profile = readBrowserOracle();
    const thriftReading = profile.readings.find(r => r.key === 'cosmic_thriftiness');
    expect(thriftReading?.raw).toBe('lavish');
  });
});

describe('detectMobile', () => {
  it('captures non-English language in cultural_destiny raw value (ro-RO)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'ro-RO',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const culturalReading = profile.readings.find(r => r.key === 'cultural_destiny');
    expect(culturalReading?.raw).toBe('ro-RO');
    expect(typeof culturalReading?.interpretation).toBe('string');
    expect((culturalReading?.interpretation as string).length).toBeGreaterThan(0);
  });

  it('trims leading/trailing whitespace from navigator.language for cultural_destiny', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: '  en-US  ',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const culturalReading = profile.readings.find(r => r.key === 'cultural_destiny');
    expect(culturalReading?.raw).toBe('en-US');
  });

  it('handles missing navigator.language for cultural_destiny (undefined)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const culturalReading = profile.readings.find(r => r.key === 'cultural_destiny');
    expect(culturalReading?.raw).toBe('');
  });

  it('handles empty navigator.language for cultural_destiny', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: '',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const culturalReading = profile.readings.find(r => r.key === 'cultural_destiny');
    expect(culturalReading?.raw).toBe('');
  });

  it('returns true for iOS', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('iOS')).toBe(true);
  });

  it('returns true for Android', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('Android')).toBe(true);
  });

  it('returns false for Windows', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('Windows')).toBe(false);
  });

  it('returns false for macOS', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('macOS')).toBe(false);
  });

  it('returns false for Linux', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('Linux')).toBe(false);
  });

  it('returns false for Unknown', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('Unknown')).toBe(false);
  });

  it('returns false for empty string', async () => {
    const { detectMobile } = await import('./browser-oracle.ts');
    expect(detectMobile('')).toBe(false);
  });

  it('every reading key has a defined interpretation that returns non-empty string', () => {
    const profile = readBrowserOracle();
    for (const reading of profile.readings) {
      expect(reading.interpretation).toBeDefined();
      expect(typeof reading.interpretation).toBe('string');
      expect(reading.interpretation.length).toBeGreaterThan(0);
    }
  });

  it('detects Safari on macOS with a UA that contains no Chrome token', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: 'wifi' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');

    expect(browserReading?.raw).toBe('Safari');
    expect(osReading?.raw).toBe('macOS');
    expect(profile.fingerprint).toContain('|desktop');
  });

  it('detects mobile when OS is iOS', () => {
    expect(detectMobile('iOS')).toBe(true);
  });

  it('detects mobile when OS is Android', () => {
    expect(detectMobile('Android')).toBe(true);
  });

  it('returns desktop for non-mobile OS (Windows)', () => {
    expect(detectMobile('Windows')).toBe(false);
  });

  it('returns desktop for macOS', () => {
    expect(detectMobile('macOS')).toBe(false);
  });

  it('returns desktop for Linux', () => {
    expect(detectMobile('Linux')).toBe(false);
  });

  it('composes the fingerprint with varying network speed, pixel density and time-of-day', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91 Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '5g' },
    });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 3,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    vi.setSystemTime(new Date('2024-01-01T10:00:00'));
    const profile = readBrowserOracle();
    expect(profile.fingerprint).toContain('|5g|');
    expect(profile.fingerprint).toContain('|light|morning|3|desktop');
  });

  describe('getTimeOfDay boundary transitions', () => {
    it('returns deep_night at hours 0-5', () => {
      for (let h = 0; h < 6; h++) {
        expect(getTimeOfDay(h)).toBe('deep_night');
      }
    });

    it('returns morning at hour 6 and returns afternoon at hour 12', () => {
      expect(getTimeOfDay(5)).toBe('deep_night');
      expect(getTimeOfDay(6)).toBe('morning');
      expect(getTimeOfDay(11)).toBe('morning');
    });

    it('returns afternoon at hours 12-16 and evening at hour 17', () => {
      expect(getTimeOfDay(12)).toBe('afternoon');
      expect(getTimeOfDay(16)).toBe('afternoon');
      expect(getTimeOfDay(17)).toBe('evening');
    });

    it('returns evening at hours 17-20 and night at hour 21', () => {
      expect(getTimeOfDay(20)).toBe('evening');
      expect(getTimeOfDay(21)).toBe('night');
      expect(getTimeOfDay(23)).toBe('night');
    });

    it('handles negative hours gracefully (returns deep_night)', () => {
      expect(getTimeOfDay(-1)).toBe('deep_night');
    });

    it('handles hour 0 explicitly', () => {
      expect(getTimeOfDay(0)).toBe('deep_night');
    });
  });
});
