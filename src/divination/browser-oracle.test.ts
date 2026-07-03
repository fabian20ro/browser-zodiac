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

});
