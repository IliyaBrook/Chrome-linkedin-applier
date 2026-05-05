import { describe, expect, it } from 'vitest';
import {
  applyReasonFilter,
  applySearchFilter,
  applyStatusFilter,
  summarize,
  toCsv,
  uniqueReasons,
} from '@/entrypoints/apply-history/filtering';
import type { ApplyHistoryEntry } from '@/lib/types';

const entry = (overrides: Partial<ApplyHistoryEntry>): ApplyHistoryEntry => ({
  timestamp: 1700000000000,
  jobId: 'job-1',
  title: 'Senior React Engineer',
  companyName: 'Acme',
  url: 'https://linkedin.com/jobs/view/1',
  applied: true,
  reason: 'applied',
  description: null,
  ...overrides,
});

describe('applyStatusFilter', () => {
  const data = [
    entry({ jobId: 'a', applied: true, reason: 'applied' }),
    entry({ jobId: 'b', applied: false, reason: 'titleSkip' }),
    entry({ jobId: 'c', applied: false, reason: 'error' }),
  ];

  it('returns everything for "all"', () => {
    expect(applyStatusFilter(data, 'all')).toHaveLength(3);
  });
  it('keeps only applied jobs for "applied"', () => {
    expect(applyStatusFilter(data, 'applied').map((e) => e.jobId)).toEqual(['a']);
  });
  it('keeps only not-applied jobs for "notApplied"', () => {
    expect(applyStatusFilter(data, 'notApplied').map((e) => e.jobId)).toEqual(['b', 'c']);
  });
  it('keeps only error rows for "errors"', () => {
    expect(applyStatusFilter(data, 'errors').map((e) => e.jobId)).toEqual(['c']);
  });
});

describe('applyReasonFilter', () => {
  const data = [
    entry({ jobId: 'a', reason: 'applied' }),
    entry({ jobId: 'b', reason: 'badWord' }),
  ];
  it('passes through when reason is "all"', () => {
    expect(applyReasonFilter(data, 'all')).toHaveLength(2);
  });
  it('keeps matching reasons only', () => {
    expect(applyReasonFilter(data, 'badWord').map((e) => e.jobId)).toEqual(['b']);
  });
});

describe('applySearchFilter', () => {
  const data = [
    entry({ jobId: 'a', title: 'Senior React Engineer', companyName: 'Acme' }),
    entry({ jobId: 'b', title: 'Backend Engineer', companyName: 'Globex', description: 'Go programming' }),
    entry({ jobId: 'c', title: 'Designer', companyName: 'Initech', reason: 'badWord' }),
  ];

  it('matches titles case-insensitively', () => {
    expect(applySearchFilter(data, 'react').map((e) => e.jobId)).toEqual(['a']);
  });
  it('matches company names', () => {
    expect(applySearchFilter(data, 'globex').map((e) => e.jobId)).toEqual(['b']);
  });
  it('matches description text', () => {
    expect(applySearchFilter(data, 'go program').map((e) => e.jobId)).toEqual(['b']);
  });
  it('matches reason labels', () => {
    expect(applySearchFilter(data, 'bad word').map((e) => e.jobId)).toEqual(['c']);
  });
  it('returns all when search is empty / whitespace', () => {
    expect(applySearchFilter(data, '   ')).toEqual(data);
  });
});

describe('summarize', () => {
  it('counts applied vs skipped vs errors with errors taking priority', () => {
    const data = [
      entry({ jobId: 'a', applied: true, reason: 'applied' }),
      entry({ jobId: 'b', applied: false, reason: 'titleSkip' }),
      entry({ jobId: 'c', applied: true, reason: 'error' }),
    ];
    expect(summarize(data)).toEqual({ total: 3, applied: 1, skipped: 1, errors: 1 });
  });
});

describe('uniqueReasons', () => {
  it('returns reasons sorted by label', () => {
    const data = [
      entry({ reason: 'titleSkip' }),
      entry({ reason: 'applied' }),
      entry({ reason: 'badWord' }),
      entry({ reason: 'applied' }),
    ];
    expect(uniqueReasons(data)).toEqual(['applied', 'badWord', 'titleSkip']);
  });
});

describe('toCsv', () => {
  it('emits header + rows with proper escaping', () => {
    const csv = toCsv([
      entry({
        title: 'Engineer, Frontend',
        companyName: 'Acme "Co"',
        description: 'Line one\nLine two',
        applied: true,
        reason: 'applied',
        url: 'https://example.com',
      }),
    ]);
    expect(csv).toContain('Time,Title,Company,Applied,Reason,Description,URL\n');
    expect(csv).toContain('"Engineer, Frontend"');
    expect(csv).toContain('"Acme ""Co"""');
    expect(csv).toContain('"Line one\nLine two"');
    expect(csv).toContain(',YES,');
    expect(csv).toContain(',Applied,');
  });
});
