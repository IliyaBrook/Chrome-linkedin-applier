import { describe, expect, it } from 'vitest';
import { getTime } from './time-format';

describe('getTime', () => {
  it('returns zero-padded 2-char fields', () => {
    const t = getTime(new Date(2024, 0, 5, 7, 9));
    expect(t.day).toBe('05');
    expect(t.month).toBe('01');
    expect(t.year).toBe('24');
    expect(t.hour).toBe('07');
    expect(t.minute).toBe('09');
  });

  it('handles double-digit values without altering them', () => {
    const t = getTime(new Date(2024, 11, 31, 23, 59));
    expect(t).toEqual({ day: '31', month: '12', year: '24', hour: '23', minute: '59' });
  });

  it('takes 2-digit suffix of the year', () => {
    expect(getTime(new Date(1999, 0, 1)).year).toBe('99');
    expect(getTime(new Date(2099, 0, 1)).year).toBe('99');
  });
});
