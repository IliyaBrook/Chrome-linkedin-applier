import { describe, expect, it } from 'vitest';
import {
  addCv,
  addFilter,
  deleteCv,
  deleteFilter,
  generateCvId,
  renameCv,
  updateFilter,
} from '@/entrypoints/cv-manager/cv-store';
import type { CvFile, CvFilters } from '@/lib/types';

describe('generateCvId', () => {
  it('produces a cv_ prefixed unique id', () => {
    const a = generateCvId();
    const b = generateCvId();
    expect(a).toMatch(/^cv_\d+_[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});

describe('addCv', () => {
  it('rejects empty names', () => {
    expect(addCv([], '   ').ok).toBe(false);
  });

  it('rejects case-insensitive duplicates', () => {
    const files: CvFile[] = [{ id: 'cv_1', name: 'Resume.pdf' }];
    expect(addCv(files, 'resume.pdf').ok).toBe(false);
  });

  it('appends a new entry with a fresh id', () => {
    const result = addCv([], 'Resume.pdf');
    expect(result.ok).toBe(true);
    expect(result.next).toHaveLength(1);
    expect(result.next[0].name).toBe('Resume.pdf');
    expect(result.next[0].id).toMatch(/^cv_/);
  });
});

describe('renameCv', () => {
  const files: CvFile[] = [
    { id: 'cv_1', name: 'A.pdf' },
    { id: 'cv_2', name: 'B.pdf' },
  ];
  const filters: CvFilters = { 'A.pdf': ['react', 'node'] };

  it('renames CV and migrates filters', () => {
    const result = renameCv(files, filters, 'cv_1', 'AA.pdf');
    expect(result.ok).toBe(true);
    expect(result.nextFiles[0].name).toBe('AA.pdf');
    expect(result.nextFilters['AA.pdf']).toEqual(['react', 'node']);
    expect(result.nextFilters['A.pdf']).toBeUndefined();
  });

  it('rejects rename to existing name (case-insensitive)', () => {
    const result = renameCv(files, filters, 'cv_1', 'b.pdf');
    expect(result.ok).toBe(false);
  });

  it('does not mutate filters when name is unchanged', () => {
    const result = renameCv(files, filters, 'cv_1', 'A.pdf');
    expect(result.ok).toBe(true);
    expect(result.nextFilters['A.pdf']).toEqual(['react', 'node']);
  });
});

describe('deleteCv', () => {
  const files: CvFile[] = [
    { id: 'cv_1', name: 'A.pdf' },
    { id: 'cv_2', name: 'B.pdf' },
  ];
  const filters: CvFilters = { 'A.pdf': ['react'], 'B.pdf': ['node'] };

  it('removes CV and its filters', () => {
    const r = deleteCv(files, filters, 'cv_1', 'cv_1');
    expect(r.nextFiles.map((f) => f.id)).toEqual(['cv_2']);
    expect(r.nextFilters['A.pdf']).toBeUndefined();
    expect(r.nextSelected).toBe('cv_2');
  });

  it('falls back selected to null when last CV removed', () => {
    const r = deleteCv([files[0]], { 'A.pdf': [] }, 'cv_1', 'cv_1');
    expect(r.nextSelected).toBe(null);
  });

  it('preserves selected when deleting a different CV', () => {
    const r = deleteCv(files, filters, 'cv_1', 'cv_2');
    expect(r.nextSelected).toBe('cv_1');
  });
});

describe('addFilter', () => {
  it('rejects empty filter', () => {
    expect(addFilter({}, 'A.pdf', '').ok).toBe(false);
  });
  it('rejects case-insensitive duplicates', () => {
    expect(addFilter({ 'A.pdf': ['React'] }, 'A.pdf', 'react').ok).toBe(false);
  });
  it('appends to the right CV', () => {
    const r = addFilter({}, 'A.pdf', 'go');
    expect(r.next['A.pdf']).toEqual(['go']);
  });
});

describe('updateFilter / deleteFilter', () => {
  it('updateFilter replaces the entry at the given index', () => {
    const r = updateFilter({ 'A.pdf': ['a', 'b', 'c'] }, 'A.pdf', 1, 'B');
    expect(r['A.pdf']).toEqual(['a', 'B', 'c']);
  });
  it('deleteFilter removes the entry at the given index', () => {
    const r = deleteFilter({ 'A.pdf': ['a', 'b', 'c'] }, 'A.pdf', 1);
    expect(r['A.pdf']).toEqual(['a', 'c']);
  });
});
