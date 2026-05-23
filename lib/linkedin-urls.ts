export function getJobLink(href: string | null | undefined): string {
  if (!href) return '';
  if (/^https?:/i.test(href)) return href;
  return 'https://www.linkedin.com' + href;
}

export function getLinkedInJobIdFromUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(getJobLink(href));
    const viewMatch = url.pathname.match(/^\/jobs\/view\/(\d+)\/?$/);
    if (viewMatch) return viewMatch[1];
    const currentJobId = url.searchParams.get('currentJobId');
    return currentJobId && /^\d+$/.test(currentJobId) ? currentJobId : null;
  } catch {
    const match = href.match(/\/jobs\/view\/(\d+)\/?/) || href.match(/[?&]currentJobId=(\d+)/);
    return match ? match[1] : null;
  }
}

export function buildLinkedInJobUrl(jobId: string | number | null | undefined): string {
  if (jobId === null || jobId === undefined || jobId === '') return '';
  return `https://www.linkedin.com/jobs/view/${jobId}/`;
}

export function normalizeLinkedInJobUrl(href: string | null | undefined): string {
  const canonicalUrl = buildLinkedInJobUrl(getLinkedInJobIdFromUrl(href));
  return canonicalUrl || getJobLink(href);
}
