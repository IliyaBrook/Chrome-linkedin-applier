import { describe, expect, it } from 'vitest';
import {
  pruneInvalidApplyHistory,
  reconcileSelectedCv,
} from './storage-migration';
import type { ApplyHistoryEntry } from './types';

const validEntry = (overrides: Partial<ApplyHistoryEntry> = {}): ApplyHistoryEntry => ({
  timestamp: 1_700_000_000_000,
  jobId: '12345',
  title: 'Frontend Dev',
  companyName: 'Acme',
  url: 'https://www.linkedin.com/jobs/view/12345/',
  applied: true,
  reason: 'applied',
  description: null,
  ...overrides,
});

describe('pruneInvalidApplyHistory', () => {
  it('returns empty result when input is not an array', () => {
    expect(pruneInvalidApplyHistory(null)).toEqual({ next: [], dropped: 0 });
    expect(pruneInvalidApplyHistory(undefined)).toEqual({ next: [], dropped: 0 });
    expect(pruneInvalidApplyHistory('not array')).toEqual({ next: [], dropped: 0 });
    expect(pruneInvalidApplyHistory({})).toEqual({ next: [], dropped: 0 });
  });

  it('keeps entries with known reasons', () => {
    const entries = [
      validEntry({ reason: 'applied' }),
      validEntry({ reason: 'alreadyApplied' }),
      validEntry({ reason: 'titleSkip' }),
      validEntry({ reason: 'titleFilterMissing' }),
      validEntry({ reason: 'submitNotConfirmed' }),
      validEntry({ reason: 'noSubmitButton' }),
    ];
    const result = pruneInvalidApplyHistory(entries);
    expect(result.dropped).toBe(0);
    expect(result.next).toHaveLength(entries.length);
  });

  it('drops entries with unknown reasons', () => {
    const entries = [
      validEntry({ reason: 'applied' }),
      { ...validEntry(), reason: 'someUnknownReason' },
      validEntry({ reason: 'badWord' }),
    ];
    const result = pruneInvalidApplyHistory(entries);
    expect(result.dropped).toBe(1);
    expect(result.next).toHaveLength(2);
  });

  it('drops entries missing timestamp', () => {
    const entries = [
      validEntry(),
      { ...validEntry(), timestamp: undefined },
      { ...validEntry(), timestamp: 'not-a-number' },
    ];
    const result = pruneInvalidApplyHistory(entries);
    expect(result.dropped).toBe(2);
    expect(result.next).toHaveLength(1);
  });

  it('drops null and non-object entries', () => {
    const entries = [validEntry(), null, undefined, 'string', 42];
    const result = pruneInvalidApplyHistory(entries);
    expect(result.dropped).toBe(4);
    expect(result.next).toHaveLength(1);
  });
});

describe('reconcileSelectedCv', () => {
  const cvFiles = [
    { id: 'cv_1', name: 'Default.pdf' },
    { id: 'cv_2', name: 'Senior.pdf' },
  ];

  it('keeps the selection when the CV exists', () => {
    expect(reconcileSelectedCv('cv_1', cvFiles)).toEqual({
      next: 'cv_1',
      cleared: false,
    });
  });

  it('clears when selectedId references a missing CV', () => {
    expect(reconcileSelectedCv('cv_999', cvFiles)).toEqual({
      next: null,
      cleared: true,
    });
  });

  it('clears when cvFiles is missing entirely', () => {
    expect(reconcileSelectedCv('cv_1', undefined)).toEqual({
      next: null,
      cleared: true,
    });
  });

  it('returns null without flagging cleared when selectedId is already missing', () => {
    expect(reconcileSelectedCv(null, cvFiles)).toEqual({
      next: null,
      cleared: false,
    });
    expect(reconcileSelectedCv('', cvFiles)).toEqual({
      next: null,
      cleared: false,
    });
  });
});
