import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readBrowserOracle } from './browser-oracle.ts';

describe('readBrowserOracle', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;
  const originalScreen = global.screen;
  const originalIntl = global.Intl;

  beforeEach(() => {
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

  it('includes network_speed in readings', () => {
    const profile = readBrowserOracle();
    const networkReading = profile.readings.find(r => r.key === 'network_speed');
    expect(networkReading).toBeDefined();
    expect(typeof networkReading?.raw).toBe('string');
  });
  
  it('handles unknown browser and os', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'UnknownAgent',
      language: 'en-US',
      hardwareConcurrency: 0,
      platform: 'unknown',
      onLine: false,
      maxTouchPoints: 0,
      connection: {
        effectiveType: 'unknown',
      },
    });
    const profile = readBrowserOracle();
    const browserReading = profile.readings.find(r => r.key === 'spirit_browser');
    const osReading = profile.readings.find(r => r.key === 'elemental_os');
      
    expect(browserReading?.raw).toBe('Unknown');
    expect(osReading?.raw).toBe('Unknown');
  });

  it('includes tactile_sensibility in readings', () => {
    const profile = readBrowserOracle();
    const tactileReading = profile.readings.find(r => r.key === 'tactile_sensibility');
    expect(tactileReading).toBeDefined();
    expect(typeof tactileReading?.raw).toBe('string');
  });
});
