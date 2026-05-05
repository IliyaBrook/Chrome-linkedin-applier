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

export const AA_UI_LEGACY = 'legacy';
export const AA_UI_NEW = 'new';
export const AA_UI_UNKNOWN = 'unknown';
export type JobsUI = typeof AA_UI_LEGACY | typeof AA_UI_NEW | typeof AA_UI_UNKNOWN;

export const MAX_SAVE_MODAL_WAIT_TIME = 30_000;
export const MAX_SAVE_MODAL_FAILURES = 5;
