import { describe, expect, it } from 'vitest';
import { dedupeAdd, removeAt, updateAt } from './WordListEditor';

describe('dedupeAdd', () => {
  it('rejects empty / whitespace-only inputs', () => {
    expect(dedupeAdd(['a'], '')).toEqual({ ok: false, next: ['a'] });
    expect(dedupeAdd(['a'], '   ')).toEqual({ ok: false, next: ['a'] });
  });

  it('appends a new word', () => {
    expect(dedupeAdd(['a'], 'b')).toEqual({ ok: true, next: ['a', 'b'] });
  });

  it('rejects case-insensitive duplicates', () => {
    expect(dedupeAdd(['Java'], 'java')).toEqual({ ok: false, next: ['Java'] });
    expect(dedupeAdd(['Java'], 'JAVA')).toEqual({ ok: false, next: ['Java'] });
  });

  it('trims whitespace before insertion', () => {
    expect(dedupeAdd([], '  ruby  ')).toEqual({ ok: true, next: ['ruby'] });
  });
});

describe('updateAt', () => {
  it('replaces the entry at the given index', () => {
    expect(updateAt(['a', 'b', 'c'], 1, 'B')).toEqual(['a', 'B', 'c']);
  });

  it('does not mutate the source array', () => {
    const src = ['a', 'b'];
    updateAt(src, 0, 'x');
    expect(src).toEqual(['a', 'b']);
  });
});

describe('removeAt', () => {
  it('drops the entry at the given index', () => {
    expect(removeAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });
});
