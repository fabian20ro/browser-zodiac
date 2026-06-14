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


  it('includes tactile_sensibility in readings', () => {
    const profile = readBrowserOracle();
    const tactileReading = profile.readings.find(r => r.key === 'tactile_sensibility');
    expect(tactileReading).toBeDefined();
    expect(typeof tactileReading?.raw).toBe('string');
  });
});

afterEach(() => {
  vi.useRealTimers();
});
afterEach(() => { vi.useRealTimers(); });
