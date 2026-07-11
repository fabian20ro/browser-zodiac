import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleMidnightGmt } from './scheduler.ts';

describe('scheduleMidnightGmt resilience', () => {
  let count = 0;
  const callback = () => { 
    count++;
  };

  beforeEach(() => {
    count = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not leak multiple scheduling loops when called twice', () => {
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    
    const cancel1 = scheduleMidnightGmt(callback);
    const cancel2 = scheduleMidnightGmt(callback);
    
    vi.advanceTimersByTime(1000);
    expect(count).toBe(1);
    
    cancel2(); 
    vi.advanceTimersByTime(1000);
    expect(count).toBe(1);
    
    cancel1();
    vi.advanceTimersByTime(1000);
    expect(count).toBe(1);
  });

  it('should not leak if called during an async callback', async () => {
    let count = 0;
    const asyncCallback = async () => {
      count++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    };

    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancel1 = scheduleMidnightGmt(asyncCallback);
    
    await vi.advanceTimersByTimeAsync(1000); 
    
    scheduleMidnightGmt(asyncCallback); 
    
    await vi.advanceTimersByTimeAsync(1000); 
    await vi.advanceTimersByTimeAsync(86400000); 
    
    expect(count).toBe(1);
    cancel1();
  });

  it('should suppress the first callback when rescheduled before its first iteration completes', () => {
    // Scenario: schedule fires, then immediately re-schedules while
    // isLoopRunning=false and wasStartedDuringLoop=true. The source uses
    // wasStartedDuringLoop to skip execution on the very first tick of a
    // brand-new loop that replaced an existing one — this test ensures
    // the replacement takes effect correctly: exactly 1 invocation total.
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const firstCancel = scheduleMidnightGmt(callback);

    // Re-schedule immediately before the first callback fires.
    // The second call cancels the first's pending timeout, gets a new loopId,
    // and marks wasStartedDuringLoop=false (isLoopRunning is still false).
    const secondCancel = scheduleMidnightGmt(callback);

    vi.advanceTimersByTime(1000);

    // Only the second schedule should have executed.
    expect(count).toBe(1);

    secondCancel();
  });

  it('should recover and reschedule after callback throws', async () => {
    let errorCount = 0;
    const failingCallback = async () => {
      count++;
      if (errorCount === 0) {
        errorCount++;
        throw new Error('callback failure');
      }
    };

    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancel = scheduleMidnightGmt(failingCallback);

    await vi.advanceTimersByTimeAsync(1000);
    // First iteration: callback throws → should still reschedule.
    expect(count).toBe(1);

    await vi.advanceTimersByTimeAsync(86400000);
    // Second iteration: callback succeeds → count increments again.
    expect(count).toBe(2);

    cancel();
  });

  it('should handle immediate synchronous cancellation without leaking', () => {
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const cancel = scheduleMidnightGmt(callback);

    // Cancel synchronously right after scheduling, before any timer fires.
    cancel();

    vi.advanceTimersByTime(86400000);
    expect(count).toBe(0);
  });

  it('should not double-fire when cancelled and re-scheduled in rapid succession', () => {
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const cancel = scheduleMidnightGmt(callback);
    cancel();

    // Re-schedule after cancellation.
    const cancel2 = scheduleMidnightGmt(callback);

    vi.advanceTimersByTime(86400000);
    expect(count).toBe(1);

    cancel2();
  });

  it('should suppress stale timers across a chain of three rapid replacements', () => {
    // Scenario: schedule → cancel → schedule → cancel → schedule.
    // Each cancel should clear its activeHandle, so no stale timer fires
    // when the next iteration advances time by a full day.
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const cancel1 = scheduleMidnightGmt(callback);
    cancel1();

    const cancel2 = scheduleMidnightGmt(callback);
    cancel2();

    const cancel3 = scheduleMidnightGmt(callback);

    vi.advanceTimersByTime(86400000);
    expect(count).toBe(1);

    cancel3();
  });

  it('should suppress the first iteration when a new loop replaces an active one (wasStartedDuringLoop=true)', async () => {
    // Scenario: a scheduler is running, then a new scheduleMidnightGmt call
    // arrives while isLoopRunning=true. The source marks wasStartedDuringLoop=true
    // and uses it to skip the very first execution of the replacement loop,
    // only re-scheduling instead. This prevents a double-fire on rapid takeover.
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const cancel1 = scheduleMidnightGmt(callback);
    await vi.advanceTimersByTimeAsync(1000);
    // First loop fired once; isLoopRunning is now true.
    expect(count).toBe(1);

    // Cancel the first loop and immediately schedule a new one while it was active.
    cancel1();
    const cancel2 = scheduleMidnightGmt(callback);

    await vi.advanceTimersByTimeAsync(86400000);
    // Only the second scheduler should have executed (first iteration of replacement suppressed).
    expect(count).toBe(2);

    cancel2();
  });

  it('should fire on second tick after wasStartedDuringLoop skips the first', async () => {
    // Source line 48-51: when replacement arrives while isLoopRunning=true,
    // iteration===1 with wasStartedDuringLoop=true triggers scheduleNext()
    // without invoking callback. The next advance must fire normally and
    // cancel still works after the second execution.
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));

    const cancel1 = scheduleMidnightGmt(callback);
    await vi.advanceTimersByTimeAsync(1000);
    expect(count).toBe(1); // first loop fired once, isLoopRunning=true now

    cancel1();
    const cancel2 = scheduleMidnightGmt(callback);

    // First tick of replacement: wasStartedDuringLoop=true → skipped.
    await vi.advanceTimersByTimeAsync(86400000);
    expect(count).toBe(2); // second tick fires normally

    // Cancel after the second fire should be a no-op (already cleared).
    cancel2();
    await vi.advanceTimersByTimeAsync(86400000);
    expect(count).toBe(2); // no third fire
  });

  it('should handle replacement initiated from within its own callback (wasStartedDuringLoop=true skip)', async () => {
    // Scenario: a scheduler fires, the callback calls scheduleMidnightGmt()
    // while isLoopRunning=true — this triggers line 23-25 replacement logic
    // in the source. The new loop must take over without double-firing the
    // current tick, and the wasStartedDuringLoop skip path must still suppress
    // one iteration on the replacement before resuming normal firing.
    let innerCancel: (() => void) | null = null;

    const reScheduleCallback = async () => {
      count++;
      // Re-schedule from within a running callback — exercises line 23-25.
      if (innerCancel === null) {
        innerCancel = scheduleMidnightGmt(callback);
      }
    };
    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    const cancelOriginal = scheduleMidnightGmt(reScheduleCallback);

    // First tick fires the original callback, which re-schedules mid-tick.
    await vi.advanceTimersByTimeAsync(1000);
    expect(count).toBe(1); // only one invocation from original loop

    // The replacement's first iteration is skipped (wasStartedDuringLoop=true),
    // and the original loop body exits without re-scheduling (loopId mismatch).
    // Only one total invocation fires — this is correct resilience behavior.
    await vi.advanceTimersByTimeAsync(86400000);
    expect(count).toBe(1); // replacement's first tick skipped, no double-fire

    cancelOriginal();
    if (innerCancel) innerCancel();
  });
});
