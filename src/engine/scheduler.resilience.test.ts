import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleMidnightGmt } from './scheduler.ts';

describe('scheduleMidnightGmt resilience', () => {
  let count = 0;
  const callback = () => { 
    count++;
    console.log('Callback called, count:', count);
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
});
