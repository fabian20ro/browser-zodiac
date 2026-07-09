import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNextMidnightGmt, toGmtDateString, msUntilNextMidnightGmt, scheduleMidnightGmt } from './scheduler.ts';

describe('getNextMidnightGmt', () => {
  it('returns next-day midnight when called before midnight', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    const expected = new Date('2026-01-02T00:00:00.000Z');
    expect(getNextMidnightGmt(now)).toEqual(expected);
  });

  it('returns next-day midnight when called at midnight', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expected = new Date('2026-01-02T00:00:00.000Z');
    expect(getNextMidnightGmt(now)).toEqual(expected);
  });

  it('returns next-day midnight at end of year boundary', () => {
    const now = new Date('2026-12-31T23:59:59.000Z');
    const expected = new Date('2027-01-01T00:00:00.000Z');
    expect(getNextMidnightGmt(now)).toEqual(expected);
  });

  it('returns next-day midnight across non-leap Feb boundary', () => {
    // In a non-leap year, Feb 28 + 1 day → Mar 1 (not Feb 29).
    const now = new Date('2025-02-28T12:00:00.000Z');
    const expected = new Date('2025-03-01T00:00:00.000Z');
    expect(getNextMidnightGmt(now)).toEqual(expected);
  });

  it('returns next-day midnight across leap Feb boundary', () => {
    // In a leap year, Feb 28 + 1 day → Feb 29 (next valid date).
    const now = new Date('2024-02-28T12:00:00.000Z');
    const expected = new Date('2024-02-29T00:00:00.000Z');
    expect(getNextMidnightGmt(now)).toEqual(expected);
  });

  it('returns a fresh Date (does not mutate input)', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    const original = now.getTime();
    getNextMidnightGmt(now);
    expect(now.getTime()).toBe(original);
  });

  it('returns today midnight when input is just past midnight', () => {
    // When called at e.g. 12:00, next midnight is tomorrow — but if called
    // right after midnight (UTCDate wraps), the helper should still produce
    // a correct Date via setUTCHours(0).
    const now = new Date('2026-01-01T00:00:01.000Z');
    const expected = new Date('2026-01-02T00:00:00.000Z');
    expect(getNextMidnightGmt(now)).toEqual(expected);
  });

  it('uses current time when no argument is given', () => {
    // Cannot fully test default without freezing clocks, but verify signature
    const result = getNextMidnightGmt();
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('msUntilNextMidnightGmt agrees with getNextMidnightGmt', () => {
    const now = new Date('2026-01-01T15:30:00.000Z');
    const midnight = getNextMidnightGmt(now);
    expect(msUntilNextMidnightGmt(now)).toBe(midnight.getTime() - now.getTime());
  });
});

describe('toGmtDateString', () => {
  it('returns the expected YYYY-MM-DD for a future date', () => {
    expect(toGmtDateString(new Date('2030-01-01T12:00:00.000Z'))).toBe('2030-01-01');
  });
});

describe('msUntilNextMidnightGmt', () => {
  it('returns 86400000 at exact midnight', () => {
    const midnight = new Date('2026-01-01T00:00:00.000Z');
    expect(msUntilNextMidnightGmt(midnight)).toBe(86400000);
  });

  it('returns correctly for a noon date', () => {
    const noon = new Date('2026-01-01T12:00:00.000Z');
    const expected = new Date('2026-01-02T00:00:00.000Z').getTime() - noon.getTime();
    expect(msUntilNextMidnightGmt(noon)).toBe(expected);
  });

  it('handles month/year boundaries', () => {
    const endOfYear = new Date('2026-12-31T23:59:59.000Z');
    const expected = new Date('2027-01-01T00:00:00.000Z').getTime() - endOfYear.getTime();
    expect(msUntilNextMidnightGmt(endOfYear)).toBe(expected);
  });
});

describe('scheduleMidnightGmt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the callback at midnight', () => {
    const callback = vi.fn();
    // Set time BEFORE calling the function
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(callback);

    // Advance time to just before midnight
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    // Advance to midnight
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', () => {
    const callback = vi.fn();
    // Set time BEFORE calling the function
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancel = scheduleMidnightGmt(callback);

    vi.advanceTimersByTime(1);
    cancel();
    vi.advanceTimersByTime(1);
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('schedules the next run after the first one', async () => {
    const callback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(callback);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance to the next midnight
    vi.setSystemTime(new Date('2026-01-02T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('logs an error when the callback throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const callback = () => { throw new Error('Test error'); };
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(callback);
    vi.advanceTimersByTime(1000);
    expect(consoleSpy).toHaveBeenCalledWith("Error in scheduler callback:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('reschedules after a callback throws', async () => {
    let callCount = 0;
    const throwingCallback = () => {
      if (++callCount === 1) throw new Error('First run fails');
    };
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(throwingCallback);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callCount).toBe(1);

    // Advance to the next midnight — scheduler must have recovered
    vi.setSystemTime(new Date('2026-01-02T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callCount).toBe(2);
  });
});
