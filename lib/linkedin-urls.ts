export function getJobLink(href: string | null | undefined): string {
  if (!href) return '';
  if (/^https?:/i.test(href)) return href;
  return 'https://www.linkedin.com' + href;
}

export function buildLinkedInJobUrl(jobId: string | number | null | undefined): string {
  if (jobId === null || jobId === undefined || jobId === '') return '';
  return `https://www.linkedin.com/jobs/view/${jobId}/`;
}
