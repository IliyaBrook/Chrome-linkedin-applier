import { describe, expect, it } from 'vitest';
import { buildLinkedInJobUrl, getJobLink } from './linkedin-urls';

describe('getJobLink', () => {
  it('passes through absolute http(s) URLs', () => {
    expect(getJobLink('https://other.com/job')).toBe('https://other.com/job');
    expect(getJobLink('http://example.org/x')).toBe('http://example.org/x');
  });
  it('prefixes relative paths with linkedin.com', () => {
    expect(getJobLink('/jobs/view/1234567/')).toBe('https://www.linkedin.com/jobs/view/1234567/');
  });
  it('returns empty string for null / undefined / empty', () => {
    expect(getJobLink(null)).toBe('');
    expect(getJobLink(undefined)).toBe('');
    expect(getJobLink('')).toBe('');
  });
});

describe('buildLinkedInJobUrl', () => {
  it('builds the canonical jobs/view URL', () => {
    expect(buildLinkedInJobUrl('12345')).toBe('https://www.linkedin.com/jobs/view/12345/');
  });
  it('returns empty string for null / undefined / empty', () => {
    expect(buildLinkedInJobUrl(null)).toBe('');
    expect(buildLinkedInJobUrl(undefined)).toBe('');
    expect(buildLinkedInJobUrl('')).toBe('');
  });
  it('coerces numeric input', () => {
    expect(buildLinkedInJobUrl(789)).toBe('https://www.linkedin.com/jobs/view/789/');
  });
});
