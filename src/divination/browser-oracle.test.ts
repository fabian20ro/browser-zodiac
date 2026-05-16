// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readBrowserOracle } from './browser-oracle.ts';

const originalUserAgent = navigator.userAgent;
const originalLanguage = navigator.language;
const originalPlatform = navigator.platform;
const originalHardwareConcurrency = navigator.hardwareConcurrency;
const originalOnLine = navigator.onLine;
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;
const originalScreenWidth = screen.width;
const originalScreenHeight = screen.height;
const originalDateTimeFormat = Intl.DateTimeFormat;

function setNavigatorProperty<K extends keyof Navigator>(key: K, value: Navigator[K]) {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  setNavigatorProperty('language', 'en-US');
  setNavigatorProperty('platform', 'MacIntel');
  setNavigatorProperty('hardwareConcurrency', 8);
  setNavigatorProperty('onLine', true);
  Object.defineProperty(screen, 'width', {
    configurable: true,
    value: 1920,
  });
  Object.defineProperty(screen, 'height', {
    configurable: true,
    value: 1080,
  });
  Object.defineProperty(Intl, 'DateTimeFormat', {
    configurable: true,
    value: function DateTimeFormat() {
      return {
        resolvedOptions: () => ({ timeZone: 'Europe/Bucharest' }),
      };
    },
  });
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: originalUserAgent,
  });
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 720,
  });
});

afterEach(() => {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: originalUserAgent,
  });
  setNavigatorProperty('language', originalLanguage);
  setNavigatorProperty('platform', originalPlatform);
  setNavigatorProperty('hardwareConcurrency', originalHardwareConcurrency);
  setNavigatorProperty('onLine', originalOnLine);
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: originalInnerHeight,
  });
  Object.defineProperty(screen, 'width', {
    configurable: true,
    value: originalScreenWidth,
  });
  Object.defineProperty(screen, 'height', {
    configurable: true,
    value: originalScreenHeight,
  });
  Object.defineProperty(Intl, 'DateTimeFormat', {
    configurable: true,
    value: originalDateTimeFormat,
  });
});

describe('readBrowserOracle', () => {
  it('classifies iPhone and iPad user agents as iOS even though they contain Mac OS X', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    });

    const profile = readBrowserOracle();
    const osReading = profile.readings.find((reading) => reading.key === 'elemental_os');

    expect(osReading?.raw).toBe('iOS');
  });

  it('still classifies desktop Mac user agents as macOS', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    });

    const profile = readBrowserOracle();
    const osReading = profile.readings.find((reading) => reading.key === 'elemental_os');

    expect(osReading?.raw).toBe('macOS');
  });

  it('classifies Android user agents as Android even though they often contain Linux', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    });

    const profile = readBrowserOracle();
    const osReading = profile.readings.find((reading) => reading.key === 'elemental_os');

    expect(osReading?.raw).toBe('Android');
  });

  it('classifies iPhone Chrome as Chrome instead of Safari', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1',
    });

    const profile = readBrowserOracle();
    const browserReading = profile.readings.find((reading) => reading.key === 'spirit_browser');

    expect(browserReading?.raw).toBe('Chrome');
  });

  it('classifies iPhone Firefox as Firefox instead of Safari', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15',
    });

    const profile = readBrowserOracle();
    const browserReading = profile.readings.find((reading) => reading.key === 'spirit_browser');

    expect(browserReading?.raw).toBe('Firefox');
  });

  it('still classifies desktop Linux user agents as Linux', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const profile = readBrowserOracle();
    const osReading = profile.readings.find((reading) => reading.key === 'elemental_os');

    expect(osReading?.raw).toBe('Linux');
  });

  it('includes stable browser properties in the fingerprint used for sign assignment', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    setNavigatorProperty('language', 'en-GB');
    setNavigatorProperty('platform', 'Win32');
    Object.defineProperty(screen, 'width', {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(screen, 'height', {
      configurable: true,
      value: 900,
    });

    const profile = readBrowserOracle();

    expect(profile.fingerprint).toBe(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36|en-GB|1440x900|Win32|Europe/Bucharest',
    );
  });

  it('trims browser language before using it in the fingerprint', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    setNavigatorProperty('language', '  en-US  ');

    const profile = readBrowserOracle();
    const languageReading = profile.readings.find((reading) => reading.key === 'cultural_destiny');

    expect(profile.fingerprint).toContain('|en-US|');
    expect(languageReading?.raw).toBe('en-US');
  });

  it('trims browser platform before using it in the fingerprint', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    setNavigatorProperty('platform', '  Win32  ');

    const profile = readBrowserOracle();
    const platformReading = profile.readings.find((reading) => reading.key === 'cosmic_platform');

    expect(profile.fingerprint).toContain('|Win32|');
    expect(platformReading?.raw).toBe('Win32');
  });

  it('classifies touch devices as sensitive and non-touch as numb', () => {
    // Test sensitive (touch enabled)
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    let profile = readBrowserOracle();
    let tactileReading = profile.readings.find((reading) => reading.key === 'tactile_sensibility');
    expect(tactileReading?.raw).toBe('sensitive');

    // Test numb (touch disabled/zero)
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0,
    });

    profile = readBrowserOracle();
    tactileReading = profile.readings.find((reading) => reading.key === 'tactile_sensibility');
    expect(tactileReading?.raw).toBe('numb');
  });
});
