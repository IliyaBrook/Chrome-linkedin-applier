import { describe, expect, it } from 'vitest';
import {
  buildLinkedInJobUrl,
  getJobLink,
  getLinkedInJobIdFromUrl,
  normalizeLinkedInJobUrl,
} from './linkedin-urls';

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

describe('getLinkedInJobIdFromUrl', () => {
  it('extracts job ids from view URLs', () => {
    expect(getLinkedInJobIdFromUrl('https://www.linkedin.com/jobs/view/12345/')).toBe('12345');
    expect(getLinkedInJobIdFromUrl('/jobs/view/67890/')).toBe('67890');
  });

  it('extracts job ids from search and collection URLs', () => {
    expect(
      getLinkedInJobIdFromUrl(
        'https://www.linkedin.com/jobs/search-results/?currentJobId=4375570269&eBP=long&start=525',
      ),
    ).toBe('4375570269');
    expect(
      getLinkedInJobIdFromUrl(
        'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4413317216&discover=recommended',
      ),
    ).toBe('4413317216');
  });

  it('returns null when no LinkedIn job id is present', () => {
    expect(getLinkedInJobIdFromUrl('https://www.linkedin.com/jobs/search/')).toBeNull();
    expect(getLinkedInJobIdFromUrl(null)).toBeNull();
  });
});

describe('normalizeLinkedInJobUrl', () => {
  it('returns canonical URLs for LinkedIn job links with currentJobId', () => {
    expect(
      normalizeLinkedInJobUrl(
        'https://www.linkedin.com/jobs/search-results/?currentJobId=4399544922&eBP=long',
      ),
    ).toBe('https://www.linkedin.com/jobs/view/4399544922/');
  });

  it('keeps non-job links usable', () => {
    expect(normalizeLinkedInJobUrl('https://example.com/job')).toBe('https://example.com/job');
  });
});
