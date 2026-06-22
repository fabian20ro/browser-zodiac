import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readBrowserOracle } from './browser-oracle.ts';

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
    // The fingerprint should have the extra parameters: colorScheme and timeOfDay
    // Expected format: ${ua}|${lang}|${screenRes}|${platform}|${timezone}|${networkSpeed}|${colorScheme}|${timeOfDay}
    // Based on mocks: Chrome|en-US|1920x1080|MacIntel|UTC|4g|light|deep_night
    expect(profile.fingerprint).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36|en-US|1920x1080|MacIntel|UTC|4g|light|deep_night');
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

  it('includes tactile_sensibility in readings', () => {
    const profile = readBrowserOracle();
    const tactileReading = profile.readings.find(r => r.key === 'tactile_sensibility');
    expect(tactileReading).toBeDefined();
    expect(typeof tactileReading?.raw).toBe('string');
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

  it('detects Chrome on iOS via CriOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) CriOS/91.0.4472.114 Mobile/15E148',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'iPhone',
      onLine: true,
      maxTouchPoints: 5,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Chrome');
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

  it('detects Opera via OPR', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4441.86 Safari/537.36 OPR/55.0.2844.95',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'Windows',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Opera');
  });

  it('detects correct cosmic mood for different hours', () => {
    const testCases = [
      { hour: 2, expected: 'deep_night' },
      { hour: 8, expected: 'morning' },
      { hour: 14, expected: 'afternoon' },
      { hour: 20, expected: 'evening' },
      { hour: 22, expected: 'night' },
    ];

    for (const tc of testCases) {
      vi.setSystemTime(new Date(`2024-01-01T${tc.hour.toString().padStart(2, '0')}:00:00`));
      const profile = readBrowserOracle();
      const moodReading = profile.readings.find(r => r.key === 'cosmic_mood');
      expect(moodReading?.raw).toBe(tc.expected);
    }
  });

  it('handles missing navigator connection', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 8,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
    });
    const profile = readBrowserOracle();
    const netReading = profile.readings.find(r => r.key === 'network_speed');
    expect(netReading?.raw).toBe('unknown');
  });

  it('handles missing screen properties', () => {
    vi.stubGlobal('screen', undefined);
    const profile = readBrowserOracle();
    const resReading = profile.readings.find(r => r.key === 'life_resolution');
    expect(resReading?.raw).toBe('0x0');
  });

  it('detects Android even if Linux is present in UA', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Android 10; Linux; SM-T530) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'Android',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
    expect(osReading?.raw).toBe('Android');
  });

  it('detects Edge on Windows', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4449.82 Safari/537.36 Edg/91.0.864.52',
      language: 'en-US',
      hardwareConcurrency: 4,
      platform: 'Windows NT 10.0; Win64; x64',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    expect(browserReading?.raw).toBe('Edge');
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

  it('handles zero hardware concurrency', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0',
      language: 'en-US',
      hardwareConcurrency: 0,
      platform: 'MacIntel',
      onLine: true,
      maxTouchPoints: 0,
      connection: { effectiveType: '4g' },
    });
    const profile = readBrowserOracle();
    const parallelReading = profile.readings.find(r => r.key === 'parallel_lives');
    expect(parallelReading?.raw).toBe('unknowable');
  });
});
