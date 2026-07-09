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
});
