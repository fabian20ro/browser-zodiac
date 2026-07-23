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

  it('returns a Date with zero minutes, seconds, and milliseconds', () => {
    // Observable contract: the next GMT midnight must be an exact boundary — no
    // sub-hour drift from implementation changes (e.g. using setUTCHours vs
    // setUTCDate+setUTCHours).
    const now = new Date('2026-06-15T14:37:22.123Z');
    const midnight = getNextMidnightGmt(now);
    expect(midnight.getUTCHours()).toBe(0);
    expect(midnight.getUTCMinutes()).toBe(0);
    expect(midnight.getUTCSeconds()).toBe(0);
    expect(midnight.getUTCMilliseconds()).toBe(0);
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

  it('cancels a pending scheduler before its first tick', () => {
    const callback = vi.fn();
    // Set time BEFORE calling the function
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancel = scheduleMidnightGmt(callback);

    // Cancel immediately — before any timer has fired
    cancel();

    // Advance to past the scheduled midnight — callback must NOT fire
    vi.advanceTimersByTime(1000);
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

  it('a new scheduler cancels the previous one', async () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    // Set time at midnight so next midnight is exactly 24h away (86400000ms)
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    scheduleMidnightGmt(firstCallback);
    await vi.advanceTimersByTimeAsync(86400000);
    expect(firstCallback).toHaveBeenCalledTimes(1);

    // Start a new scheduler — should cancel any pending handle from the first
    scheduleMidnightGmt(secondCallback);
    await vi.advanceTimersByTimeAsync(86400000);
    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('skips the first iteration when scheduled during an active loop', async () => {
    let callCount = 0;
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(() => {
      callCount++;
      // While executing the first callback, start a new scheduler — it should skip its first iteration
      scheduleMidnightGmt(() => {
        callCount++;
      });
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(callCount).toBe(1); // only the outer callback fires; inner's first tick is skipped

    // Advance to next midnight — inner scheduler's skip-tick fires (no-op), callCount stays at 1
    vi.setSystemTime(new Date('2026-01-02T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callCount).toBe(1); // inner scheduler skipped its first iteration as documented

    // Advance to the following midnight — inner scheduler's actual callback fires
    vi.setSystemTime(new Date('2026-01-03T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callCount).toBe(2); // inner scheduler's iteration finally runs after the skip
  });

  it('skips its first iteration when scheduleMidnightGmt is called during callback execution', async () => {
    // Observable contract: when scheduleMidnightGmt() is invoked from within an
    // actively executing callback (not at loop setup time), wasStartedDuringLoop=true —
    // the inner scheduler must skip its first scheduled tick and resume on the next.
    let callCount = 0;
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(() => {
      callCount++;
      // Trigger a nested scheduler while still executing the outer callback —
      // this sets wasStartedDuringLoop=true for the inner loop.
      scheduleMidnightGmt(() => {
        callCount++;
      });
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(callCount).toBe(1); // outer fires; inner's first tick is skipped due to active-loop flag

    // Advance to the next midnight — inner scheduler skips its first iteration, reschedules
    vi.setSystemTime(new Date('2026-01-02T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callCount).toBe(1); // inner scheduler still skipped its first iteration

    // Advance to the following midnight — inner scheduler's actual callback fires now
    vi.setSystemTime(new Date('2026-01-03T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callCount).toBe(2); // inner scheduler fires after the skip tick
  });

  it('fires its first iteration normally when not scheduled during an active loop', async () => {
    // Observable contract: when scheduleMidnightGmt is called outside any active loop,
    // wasStartedDuringLoop=false — the scheduler must fire its callback at the first
    // scheduled midnight without skipping. This verifies the happy-path skip-tick logic.
    const callback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(callback);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance to next midnight — second iteration fires normally too
    vi.setSystemTime(new Date('2026-01-02T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('fires after ~24h when scheduled exactly at midnight', async () => {
    const callback = vi.fn();
    // At exact midnight, getNextMidnightGmt returns next-day midnight (86400000ms away).
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    scheduleMidnightGmt(callback);

    await vi.advanceTimersByTimeAsync(86399999);
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires within 1ms when delay would otherwise be sub-millisecond', async () => {
    // At 23:59:59.999Z, getNextMidnightGmt returns ~86400000ms away (next day).
    // This test verifies the Math.max(..., 1) floor path isn't triggered by normal midnight scheduling.
    const callback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.999Z'));
    scheduleMidnightGmt(callback);

    await vi.advanceTimersByTimeAsync(2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('awaits an async callback before rescheduling the next tick', async () => {
    // Observable contract: if the callback returns a Promise, the scheduler must
    // wait for resolution before scheduling the next midnight — otherwise long-running
    // tasks can overlap or miss their next window.
    let resolveTask!: () => void;
    const task = new Promise<void>(r => { resolveTask = r; });

    const callback = vi.fn(async () => {
      await task;
    });
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(callback);

    // Fire first tick — callback starts executing and awaits the unresolved promise
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance time past midnight a full day later — second call should NOT fire yet,
    // because the scheduler is still waiting for the async callback to resolve.
    vi.setSystemTime(new Date('2026-01-02T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callback).toHaveBeenCalledTimes(1); // still just 1 — task unresolved

    // Now resolve the pending task — scheduler should reschedule and fire again at next midnight
    resolveTask();
    await vi.advanceTimersByTimeAsync(1);

    // Advance to the following midnight (scheduler already past this one)
    vi.setSystemTime(new Date('2026-01-03T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callback).toHaveBeenCalledTimes(3); // initial + immediate reschedule after await resolves + next midnight tick
  });

  it('is safe to cancel after the callback has already fired', async () => {
    // Observable contract: callers must not need to track whether a loop has completed
    // before calling its cancel function — double cancellation (after fire) must not throw.
    const callback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancel = scheduleMidnightGmt(callback);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Cancel after the loop has fired — must not throw.
    expect(() => cancel()).not.toThrow();
  });

  it('a new scheduler fires normally after cancelling a completed one', async () => {
    // Observable contract: after cancellation of an already-completed loop, a fresh
    // scheduleMidnightGmt call should fire at its first scheduled midnight — not skip
    // or double-fire due to stale state from the previous loop.
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const cancelFirst = scheduleMidnightGmt(firstCallback);
    await vi.advanceTimersByTimeAsync(1000);
    expect(firstCallback).toHaveBeenCalledTimes(1);

    // Cancel the completed loop — must not throw, state should be reset.
    cancelFirst();

    // Start a new scheduler immediately after cancellation.
    scheduleMidnightGmt(secondCallback);

    // Advance to next midnight (24h later).
    vi.setSystemTime(new Date('2026-01-03T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(secondCallback).toHaveBeenCalledTimes(1);

    // Advance to the following midnight — should fire again.
    vi.setSystemTime(new Date('2026-01-04T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(secondCallback).toHaveBeenCalledTimes(2);
  });

  it('a new scheduler does not double-fire when the old one completed mid-cycle', async () => {
    // Observable contract: if an old loop has already fired and is rescheduling itself,
    // calling scheduleMidnightGmt again must cancel the old pending handle cleanly —
    // the new scheduler's first tick fires exactly once at the next midnight.
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    scheduleMidnightGmt(firstCallback);
    await vi.advanceTimersByTimeAsync(1000);
    expect(firstCallback).toHaveBeenCalledTimes(1);

    // Advance just past midnight — the first scheduler is now rescheduling for next day.
    vi.setSystemTime(new Date('2026-01-02T00:00:01.000Z'));
    scheduleMidnightGmt(secondCallback);

    // First callback must NOT have fired again (it was cancelled by the new call).
    expect(firstCallback).toHaveBeenCalledTimes(1);

    // Advance to next midnight from second scheduler's perspective (~24h away).
    vi.setSystemTime(new Date('2026-01-03T23:59:59.000Z'));
    await vi.advanceTimersByTimeAsync(86400000);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('cancel during active callback execution leaves state clean for a new scheduler', async () => {
    // Observable contract: canceling while the current callback is still executing must
    // not corrupt module-level state — subsequent scheduling should behave normally, firing
    // at its first scheduled midnight without skip-tick or double-fire surprises.
    let outerCallCount = 0;
    const outerCallback = () => {
      outerCallCount++;
      if (outerCallCount === 1) {
        scheduleMidnightGmt(() => {}); // inner scheduler: should be skipped since active loop is true
      }
    };
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancelOuter = scheduleMidnightGmt(outerCallback);

    await vi.advanceTimersByTimeAsync(1000);
    expect(outerCallCount).toBe(1); // outer fired once

    // Cancel while still inside the callback's setTimeout handler — state is mid-execution.
    cancelOuter();

    // Start a new scheduler immediately after cancellation during execution.
    const newCallback = vi.fn();
    vi.setSystemTime(new Date('2026-01-03T23:59:59.000Z'));
    scheduleMidnightGmt(newCallback);

    // Advance to next midnight — new scheduler must fire exactly once at its first tick.
    await vi.advanceTimersByTimeAsync(1000);
    expect(newCallback).toHaveBeenCalledTimes(1);
  });

  it('only the latest callback fires when two are scheduled synchronously', async () => {
    // Observable contract: when scheduleMidnightGmt() is called twice in rapid succession
    // (without any time advance between calls), only the most recent scheduler should fire —
    // the earlier one must be cancelled before its timer can tick. The first callback should
    // never execute, and the second should fire exactly once at midnight.
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    scheduleMidnightGmt(firstCallback);
    scheduleMidnightGmt(secondCallback);

    // No time advance — both are set up synchronously; first is cancelled before any tick
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).not.toHaveBeenCalled();

    // Advance past midnight — only the second scheduler fires
    await vi.advanceTimersByTimeAsync(1000);
    expect(firstCallback).toHaveBeenCalledTimes(0);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

});
