import { describe, expect, it } from 'vitest';
import {
  AA_HISTORY_LIMIT,
  AA_REASONS,
  DEFAULT_FIELD_KEYS,
  EMPTY_DEFAULT_FIELDS,
  REASON_LABELS,
} from './types';

describe('domain constants', () => {
  it('AA_REASONS contains the 17 canonical values', () => {
    expect(AA_REASONS).toHaveLength(17);
    expect(AA_REASONS).toContain('applied');
    expect(AA_REASONS).toContain('submitNotConfirmed');
    expect(AA_REASONS).toContain('noSubmitButton');
  });

  it('REASON_LABELS has a label for every reason', () => {
    for (const reason of AA_REASONS) {
      expect(REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it('AA_HISTORY_LIMIT matches the audit spec', () => {
    expect(AA_HISTORY_LIMIT).toBe(2000);
  });

  it('DEFAULT_FIELD_KEYS lists all six personal-info fields', () => {
    expect(DEFAULT_FIELD_KEYS).toEqual([
      'YearsOfExperience',
      'FirstName',
      'LastName',
      'PhoneNumber',
      'City',
      'Email',
    ]);
  });

  it('EMPTY_DEFAULT_FIELDS has empty strings for every key', () => {
    for (const key of DEFAULT_FIELD_KEYS) {
      expect(EMPTY_DEFAULT_FIELDS[key]).toBe('');
    }
  });
});
