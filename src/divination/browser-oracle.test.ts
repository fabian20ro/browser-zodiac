// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readBrowserOracle } from './browser-oracle.ts';

const originalUserAgent = navigator.userAgent;
const originalLanguage = navigator.language;
const originalPlatform = navigator.platform;
const originalHardwareConcurrency = navigator.hardwareConcurrency;
const originalOnLine = navigator.onLine;
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

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
});
