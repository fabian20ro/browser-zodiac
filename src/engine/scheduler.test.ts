import { describe, it, expect, vi } from 'vitest';
import { msUntilNextMidnightGmt, toGmtDateString, scheduleMidnightGmt } from './scheduler.ts';

describe('msUntilNextMidnightGmt', () => {
  it('returns 24 hours when called at exactly midnight UTC', () => {
    const midnight = new Date('2026-03-03T00:00:00.000Z');
    expect(msUntilNextMidnightGmt(midnight)).toBe(24 * 60 * 60 * 1000);
  });

  it('returns 12 hours when called at noon UTC', () => {
    const noon = new Date('2026-03-03T12:00:00.000Z');
    expect(msUntilNextMidnightGmt(noon)).toBe(12 * 60 * 60 * 1000);
  });

  it('returns 1 ms just before midnight', () => {
    const almostMidnight = new Date('2026-03-03T23:59:59.999Z');
    expect(msUntilNextMidnightGmt(almostMidnight)).toBe(1);
  });

  it('handles month boundary (Feb to Mar)', () => {
    const endOfFeb = new Date('2026-02-28T23:59:59.000Z');
    expect(msUntilNextMidnightGmt(endOfFeb)).toBe(1000);
  });

  it('handles year boundary (Dec 31 to Jan 1)', () => {
    const newYearsEve = new Date('2026-12-31T23:00:00.000Z');
    expect(msUntilNextMidnightGmt(newYearsEve)).toBe(60 * 60 * 1000);
  });

  it('always returns a positive number', () => {
    const times = [
      new Date('2026-01-01T00:00:00.001Z'),
      new Date('2026-06-15T08:30:00.000Z'),
      new Date('2026-12-31T23:59:59.999Z'),
    ];
    for (const t of times) {
      expect(msUntilNextMidnightGmt(t)).toBeGreaterThan(0);
    }
  });
});

describe('toGmtDateString', () => {
  it('returns YYYY-MM-DD for a UTC midnight date', () => {
    expect(toGmtDateString(new Date('2026-03-03T00:00:00.000Z'))).toBe('2026-03-03');
  });

  it('returns the UTC date regardless of time', () => {
    expect(toGmtDateString(new Date('2026-03-04T04:00:00.000Z'))).toBe('2026-03-04');
  });

  it('handles year boundary', () => {
    expect(toGmtDateString(new Date('2027-01-01T00:00:00.000Z'))).toBe('2027-01-01');
  });
});

describe('scheduleMidnightGmt', () => {
  it('stops rescheduling after cancel is called from the callback', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T23:59:59.999Z'));

    let calls = 0;
    let cancel = () => {};

    cancel = scheduleMidnightGmt(() => {
      calls += 1;
      cancel();
    });

    vi.advanceTimersByTime(1);
    expect(calls).toBe(1);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(calls).toBe(1);

    vi.useRealTimers();
  });
});
