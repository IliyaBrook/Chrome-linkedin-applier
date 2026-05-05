import { describe, expect, it } from 'vitest';
import { validateAndUpsert } from './SavedLinks';

describe('validateAndUpsert', () => {
  describe('add mode (previousName: null)', () => {
    it('adds a new entry', () => {
      const result = validateAndUpsert({}, {
        name: 'Remote',
        url: 'https://example.com/jobs?remote=1',
        previousName: null,
      });
      expect(result).toEqual({ ok: true, next: { Remote: 'https://example.com/jobs?remote=1' } });
    });

    it('rejects when name already exists', () => {
      const current = { Remote: 'https://example.com/jobs' };
      const result = validateAndUpsert(current, {
        name: 'Remote',
        url: 'https://other.com/jobs',
        previousName: null,
      });
      expect(result).toEqual({ ok: false, error: 'Link name already exists.' });
    });

    it('rejects when url already exists under another name', () => {
      const current = { Remote: 'https://example.com/jobs' };
      const result = validateAndUpsert(current, {
        name: 'Onsite',
        url: 'https://example.com/jobs',
        previousName: null,
      });
      expect(result).toEqual({ ok: false, error: 'Link already exists.' });
    });
  });

  describe('edit mode', () => {
    it('updates URL when name unchanged', () => {
      const current = { Remote: 'https://old.com' };
      const result = validateAndUpsert(current, {
        name: 'Remote',
        url: 'https://new.com',
        previousName: 'Remote',
      });
      expect(result).toEqual({ ok: true, next: { Remote: 'https://new.com' } });
    });

    it('renames key', () => {
      const current = { Remote: 'https://example.com' };
      const result = validateAndUpsert(current, {
        name: 'WFH',
        url: 'https://example.com',
        previousName: 'Remote',
      });
      expect(result).toEqual({ ok: true, next: { WFH: 'https://example.com' } });
    });

    it('rejects rename to existing name', () => {
      const current = { A: 'https://a.com', B: 'https://b.com' };
      const result = validateAndUpsert(current, {
        name: 'B',
        url: 'https://a.com',
        previousName: 'A',
      });
      expect(result).toEqual({ ok: false, error: 'Link name already exists.' });
    });

    it('allows editing URL to a duplicate (matches old behavior on edit)', () => {
      const current = { A: 'https://a.com', B: 'https://b.com' };
      const result = validateAndUpsert(current, {
        name: 'A',
        url: 'https://b.com',
        previousName: 'A',
      });
      expect(result).toEqual({ ok: true, next: { A: 'https://b.com', B: 'https://b.com' } });
    });
  });
});
