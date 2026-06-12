import { describe, it, expect } from 'vitest';
import { toGmtDateString } from './scheduler.ts';

describe('toGmtDateString', () => {
  it('returns the expected YYYY-MM-DD for a future date', () => {
    expect(toGmtDateString(new Date('2030-01-01T12:00:00.000Z'))).toBe('2030-01-01');
  });
});
