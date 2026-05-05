import { describe, expect, it } from 'vitest';
import { checkIfAlreadyApplied, matchesFilter } from './text-filters';

describe('matchesFilter', () => {
  it('returns false on empty inputs', () => {
    expect(matchesFilter('', 'react')).toBe(false);
    expect(matchesFilter('react', '')).toBe(false);
    expect(matchesFilter('react', '   ')).toBe(false);
  });

  it('treats short words as whole-word match (length <= 4)', () => {
    expect(matchesFilter('aqua marine', 'qa')).toBe(false);
    expect(matchesFilter('qa engineer', 'qa')).toBe(true);
  });

  it('treats long words as substring includes', () => {
    expect(matchesFilter('fullstack developer remote', 'developer')).toBe(true);
    expect(matchesFilter('remote position open', 'developer')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(matchesFilter('Senior REACT Engineer', 'react')).toBe(true);
    expect(matchesFilter('Senior React Engineer', 'REACT')).toBe(true);
  });
});

describe('checkIfAlreadyApplied', () => {
  it('matches "Applied N days ago" style strings', () => {
    expect(checkIfAlreadyApplied('Applied 3 days ago')).toBe(true);
    expect(checkIfAlreadyApplied('Applied 12 hours ago')).toBe(true);
    expect(checkIfAlreadyApplied('You applied 5 minutes ago')).toBe(true);
  });

  it('returns false when only "applied" is present', () => {
    expect(checkIfAlreadyApplied('Applied')).toBe(false);
  });

  it('returns false on empty input', () => {
    expect(checkIfAlreadyApplied('')).toBe(false);
  });

  it('preserves the byte-for-byte false-positive for makeup talk', () => {
    expect(checkIfAlreadyApplied('I applied makeup hours ago')).toBe(true);
  });
});
