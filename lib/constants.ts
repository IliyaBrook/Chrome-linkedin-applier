export const PAGE_URLS = {
  POPUP: 'popup.html',
  FORM_CONTROL: 'form-control.html',
  FILTER_SETTINGS: 'filter-settings.html',
  EXTERNAL_APPLY: 'external-apply.html',
  CV_MANAGER: 'cv-manager.html',
  SETTINGS: 'settings.html',
  APPLY_HISTORY: 'apply-history.html',
} as const;

export type PageUrl = (typeof PAGE_URLS)[keyof typeof PAGE_URLS];

export const LINKEDIN_JOBS_URL = 'https://www.linkedin.com/jobs/search';
export const LINKEDIN_JOBS_PATH_FRAGMENT = 'linkedin.com/jobs';
