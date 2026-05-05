import { describe, expect, it } from 'vitest';
import { appendApplyHistoryEntry, buildHistoryEntry } from './apply-history';
import { AA_HISTORY_LIMIT, type ApplyHistoryEntry } from './types';

const sampleEntry = (overrides: Partial<ApplyHistoryEntry> = {}): ApplyHistoryEntry => ({
  timestamp: 0,
  jobId: 'j',
  title: 't',
  companyName: 'c',
  url: 'u',
  applied: true,
  reason: 'applied',
  description: null,
  ...overrides,
});

describe('appendApplyHistoryEntry', () => {
  it('prepends the new entry (newest first)', () => {
    const result = appendApplyHistoryEntry(
      [sampleEntry({ timestamp: 1, jobId: 'old' })],
      sampleEntry({ timestamp: 2, jobId: 'new' }),
    );
    expect(result.map((e) => e.jobId)).toEqual(['new', 'old']);
  });

  it('returns a new array (does not mutate)', () => {
    const original = [sampleEntry({ timestamp: 1 })];
    const before = [...original];
    appendApplyHistoryEntry(original, sampleEntry({ timestamp: 2 }));
    expect(original).toEqual(before);
  });

  it('trims to the limit', () => {
    const list = Array.from({ length: 10 }, (_, i) =>
      sampleEntry({ timestamp: i, jobId: String(i) }),
    );
    const result = appendApplyHistoryEntry(list, sampleEntry({ timestamp: 99, jobId: 'top' }), 5);
    expect(result).toHaveLength(5);
    expect(result[0].jobId).toBe('top');
  });

  it('uses AA_HISTORY_LIMIT by default', () => {
    const overflow = Array.from({ length: AA_HISTORY_LIMIT + 5 }, (_, i) =>
      sampleEntry({ timestamp: i, jobId: String(i) }),
    );
    const result = appendApplyHistoryEntry(overflow, sampleEntry({ jobId: 'newest' }));
    expect(result).toHaveLength(AA_HISTORY_LIMIT);
    expect(result[0].jobId).toBe('newest');
  });
});

describe('buildHistoryEntry', () => {
  it('coerces missing strings to empty / null', () => {
    const e = buildHistoryEntry({}, 1234);
    expect(e).toEqual({
      timestamp: 1234,
      jobId: null,
      title: '',
      companyName: '',
      url: '',
      applied: false,
      reason: 'other',
      description: null,
    });
  });

  it('forces reason="applied" when applied=true regardless of input', () => {
    const e = buildHistoryEntry({ applied: true, reason: 'badWord' }, 0);
    expect(e.reason).toBe('applied');
    expect(e.applied).toBe(true);
  });

  it('uses provided reason when applied=false', () => {
    const e = buildHistoryEntry({ applied: false, reason: 'titleSkip' }, 0);
    expect(e.reason).toBe('titleSkip');
  });

  it('trims title and companyName', () => {
    const e = buildHistoryEntry(
      { title: '  Engineer  ', companyName: ' Acme ', applied: true },
      0,
    );
    expect(e.title).toBe('Engineer');
    expect(e.companyName).toBe('Acme');
  });
});
