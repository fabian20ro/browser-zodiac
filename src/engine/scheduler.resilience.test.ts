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

  it('should wait for an async callback to resolve before scheduling the next iteration', async () => {
    let callbackCalls = 0;
    const asyncCallback = async () => {
      callbackCalls++;
      // Use a setTimeout to simulate async work
      await new Promise(resolve => setTimeout(resolve, 1000));
    };

    vi.setSystemTime(new Date('2026-01-01T23:59:59.000Z'));
    scheduleMidnightGmt(asyncCallback);

    // Advance time to trigger the first callback
    vi.advanceTimersByTime(1001);
    
    // Wait for the async callback to finish
    await vi.advanceTimersByTimeAsync(1000);
    
    expect(callbackCalls).toBe(1);
    
    // Advance time to trigger the second callback
    await vi.advanceTimersByTimeAsync(86400000);
    expect(callbackCalls).toBe(2);
  });
});
