import { describe, it, expect } from 'vitest';
import { toGmtDateString, msUntilNextMidnightGmt } from './scheduler.ts';

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
