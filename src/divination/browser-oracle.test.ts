import { describe, it, expect, vi } from "vitest";
import { readBrowserOracle } from "./browser-oracle";

describe("browser-oracle", () => {
  it("reads browser from user agent", () => {
    // Mocking globals
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T23:00:00Z'));

    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      language: "en-US",
      platform: "MacIntel",
      maxTouchPoints: 2,
      onLine: true,
    });
    vi.stubGlobal("window", {
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: (query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
      }),
    });
    vi.stubGlobal("screen", {
      width: 1920,
      height: 1080,
    });
    vi.stubGlobal("Intl", {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({ timeZone: "UTC" }),
      }),
    });

    const oracle = readBrowserOracle();
    expect(oracle.readings.find(r => r.key === "spirit_browser")?.raw).toBe("Chrome");
    expect(oracle.readings.find(r => r.key === "elemental_os")?.raw).toBe("macOS");
    expect(oracle.readings.find(r => r.key === "soul_alignment")?.raw).toBe("dark");
    expect(oracle.readings.find(r => r.key === "cosmic_mood")?.raw).toBe("night");

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});