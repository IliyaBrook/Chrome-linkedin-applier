import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendExternalApply,
  bumpInputFieldCount,
  dedupeExternalApply,
  removeDropdown,
  removeInputFieldConfig,
  removeRadio,
  setRadioValue,
  upsertDropdown,
  upsertInputFieldValue,
} from '@/entrypoints/background';
import type {
  DropdownConfig,
  ExternalApplyEntry,
  InputFieldConfig,
  RadioButtonConfig,
} from '@/lib/types';
import { externalApplyDataStorage } from '@/lib/storage';

const externalEntry = (overrides: Partial<ExternalApplyEntry>): ExternalApplyEntry => ({
  title: 'Engineer',
  link: 'https://example.com/job/1',
  companyName: 'Acme',
  time: 1,
  ...overrides,
});

describe('dedupeExternalApply', () => {
  it('returns empty array for empty input', () => {
    expect(dedupeExternalApply([])).toEqual([]);
  });

  it('drops duplicates by link', () => {
    const a = externalEntry({ time: 1 });
    const b = externalEntry({ time: 2, title: 'Different title' });
    const result = dedupeExternalApply([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(a);
  });

  it('drops duplicates by (title, companyName)', () => {
    const a = externalEntry({ time: 1, link: 'https://a.com/job' });
    const b = externalEntry({ time: 2, link: 'https://b.com/job' });
    const result = dedupeExternalApply([a, b]);
    expect(result).toHaveLength(1);
  });

  it('sorts descending by time', () => {
    const a = externalEntry({ time: 1, link: 'a' });
    const b = externalEntry({ time: 5, link: 'b', title: 'B' });
    const c = externalEntry({ time: 3, link: 'c', title: 'C' });
    const result = dedupeExternalApply([a, b, c]);
    expect(result.map((r) => r.time)).toEqual([5, 3, 1]);
  });
});

describe('appendExternalApply', () => {
  beforeEach(async () => {
    await externalApplyDataStorage.setValue([]);
  });

  it('stores canonical job URLs from noisy LinkedIn search URLs', async () => {
    await appendExternalApply({
      jobTitle: 'Engineer',
      currentPageLink:
        'https://www.linkedin.com/jobs/search-results/?currentJobId=4375570269&eBP=long&start=525',
      companyName: 'Acme',
    });

    const entries = await externalApplyDataStorage.getValue();
    expect(entries).toHaveLength(1);
    expect(entries[0].link).toBe('https://www.linkedin.com/jobs/view/4375570269/');
  });

  it('prefers the latest canonical entry over an older title-company duplicate', async () => {
    await externalApplyDataStorage.setValue([
      externalEntry({
        link: 'https://www.linkedin.com/jobs/search-results/?currentJobId=4375570269&eBP=old',
        time: 1,
      }),
    ]);

    await appendExternalApply({
      jobTitle: 'Engineer',
      currentPageLink:
        'https://www.linkedin.com/jobs/search-results/?currentJobId=4375570269&eBP=new',
      companyName: 'Acme',
    });

    const entries = await externalApplyDataStorage.getValue();
    expect(entries).toHaveLength(1);
    expect(entries[0].link).toBe('https://www.linkedin.com/jobs/view/4375570269/');
  });
});

describe('upsertInputFieldValue', () => {
  it('creates a new entry with count 1 and createdAt', () => {
    const result = upsertInputFieldValue([], 'Why', 'Because');
    expect(result).toHaveLength(1);
    expect(result[0].placeholderIncludes).toBe('Why');
    expect(result[0].defaultValue).toBe('Because');
    expect(result[0].count).toBe(1);
    expect(typeof result[0].createdAt).toBe('number');
  });

  it('updates only the defaultValue when entry exists', () => {
    const existing: InputFieldConfig = {
      placeholderIncludes: 'Years',
      defaultValue: '3',
      count: 7,
      createdAt: 100,
    };
    const result = upsertInputFieldValue([existing], 'Years', '5');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      placeholderIncludes: 'Years',
      defaultValue: '5',
      count: 7,
      createdAt: 100,
    });
  });
});

describe('bumpInputFieldCount', () => {
  it('creates a new entry with count 1 if missing', () => {
    const result = bumpInputFieldCount([], 'NewQ');
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(1);
    expect(result[0].defaultValue).toBe('');
  });

  it('increments existing entry count and preserves createdAt', () => {
    const existing: InputFieldConfig = {
      placeholderIncludes: 'Q',
      defaultValue: 'a',
      count: 4,
      createdAt: 42,
    };
    const result = bumpInputFieldCount([existing], 'Q');
    expect(result[0].count).toBe(5);
    expect(result[0].createdAt).toBe(42);
  });

  it('back-fills createdAt when missing', () => {
    const existing: InputFieldConfig = {
      placeholderIncludes: 'Q',
      defaultValue: 'a',
      count: 1,
    };
    const result = bumpInputFieldCount([existing], 'Q');
    expect(typeof result[0].createdAt).toBe('number');
  });
});

describe('removeInputFieldConfig', () => {
  it('removes the matching entry', () => {
    const a: InputFieldConfig = { placeholderIncludes: 'A', defaultValue: '', count: 1 };
    const b: InputFieldConfig = { placeholderIncludes: 'B', defaultValue: '', count: 1 };
    expect(removeInputFieldConfig([a, b], 'A')).toEqual([b]);
  });
});

describe('setRadioValue', () => {
  it('updates defaultValue and selected flags only on the matching radio', () => {
    const a: RadioButtonConfig = {
      placeholderIncludes: 'Auth',
      defaultValue: 'no',
      count: 1,
      options: [
        { value: 'yes', text: 'Yes', selected: false },
        { value: 'no', text: 'No', selected: true },
      ],
    };
    const b: RadioButtonConfig = { ...a, placeholderIncludes: 'Other' };
    const result = setRadioValue([a, b], 'Auth', 'yes');
    expect(result[0].defaultValue).toBe('yes');
    expect(result[0].options.find((o) => o.value === 'yes')?.selected).toBe(true);
    expect(result[0].options.find((o) => o.value === 'no')?.selected).toBe(false);
    expect(result[1]).toBe(b);
  });
});

describe('removeRadio', () => {
  it('drops the matching entry', () => {
    const a: RadioButtonConfig = {
      placeholderIncludes: 'A',
      defaultValue: '',
      count: 1,
      options: [],
    };
    const b: RadioButtonConfig = { ...a, placeholderIncludes: 'B' };
    expect(removeRadio([a, b], 'A')).toEqual([b]);
  });
});

describe('upsertDropdown', () => {
  it('creates a dropdown with createdAt and selection mapped', () => {
    const result = upsertDropdown([], {
      placeholderIncludes: 'Country',
      value: 'US',
      options: [
        { value: 'US', text: 'United States', selected: false },
        { value: 'IL', text: 'Israel', selected: false },
      ],
    });
    expect(result[0].placeholderIncludes).toBe('Country');
    expect(result[0].value).toBe('US');
    expect(typeof result[0].createdAt).toBe('number');
    expect(result[0].options.find((o) => o.value === 'US')?.selected).toBe(true);
    expect(result[0].options.find((o) => o.value === 'IL')?.selected).toBe(false);
  });

  it('updates existing entry without losing createdAt', () => {
    const existing: DropdownConfig = {
      placeholderIncludes: 'Country',
      value: 'US',
      createdAt: 99,
      options: [{ value: 'US', text: '', selected: true }],
    };
    const result = upsertDropdown([existing], {
      placeholderIncludes: 'Country',
      value: 'IL',
      options: [
        { value: 'US', text: '', selected: false },
        { value: 'IL', text: '', selected: false },
      ],
    });
    expect(result[0].value).toBe('IL');
    expect(result[0].createdAt).toBe(99);
    expect(result[0].options.find((o) => o.value === 'IL')?.selected).toBe(true);
  });
});

describe('removeDropdown', () => {
  it('drops the matching entry', () => {
    const a: DropdownConfig = { placeholderIncludes: 'A', options: [] };
    const b: DropdownConfig = { placeholderIncludes: 'B', options: [] };
    expect(removeDropdown([a, b], 'A')).toEqual([b]);
  });
});
