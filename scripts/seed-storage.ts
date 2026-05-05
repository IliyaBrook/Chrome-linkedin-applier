/**
 * Pasteable into the DevTools console of either extension's service worker
 * (chrome://extensions → "service worker" link).
 *
 * Sets a known-good storage state so parity comparisons between the old
 * vanilla build and the new WXT build start from the same baseline.
 *
 * Usage:
 *   1. Copy the body of `seed()` (everything inside the function).
 *   2. Paste into the service-worker console.
 *   3. Press Enter.
 *
 * Re-running is idempotent — it overwrites every key.
 */

export const seedData = {
  autoApplyRunning: false,
  defaultFields: {
    YearsOfExperience: '5',
    FirstName: 'Test',
    LastName: 'User',
    PhoneNumber: '555-0100',
    City: 'Remote',
    Email: 'test@example.com',
  },
  inputFieldConfigs: [
    { placeholderIncludes: 'First name', defaultValue: 'Test', count: 4, createdAt: 1700000000000 },
    { placeholderIncludes: 'Last name', defaultValue: 'User', count: 4, createdAt: 1700000000000 },
    {
      placeholderIncludes: 'Mobile phone number',
      defaultValue: '555-0100',
      count: 4,
      createdAt: 1700000000000,
    },
    {
      placeholderIncludes: 'Years of experience',
      defaultValue: '5',
      count: 12,
      createdAt: 1700000000000,
    },
  ],
  radioButtons: [
    {
      placeholderIncludes: 'Authorized to work',
      defaultValue: 'Yes',
      count: 3,
      options: [
        { value: 'Yes', text: 'Yes', selected: true },
        { value: 'No', text: 'No', selected: false },
      ],
      createdAt: 1700000000000,
    },
  ],
  dropdowns: [
    {
      placeholderIncludes: 'Country',
      value: 'United States',
      count: 1,
      createdAt: 1700000000000,
      options: [
        { value: '', text: 'Select an option', selected: false },
        { value: 'United States', text: 'United States', selected: true },
        { value: 'Israel', text: 'Israel', selected: false },
      ],
    },
  ],
  externalApplyData: [
    {
      title: 'Senior React Engineer',
      link: 'https://example.com/jobs/123',
      companyName: 'Acme',
      time: 1700000000000,
    },
  ],
  savedLinks: {
    'Remote React': 'https://www.linkedin.com/jobs/search/?keywords=React&f_WT=2',
  },
  badWords: ['clearance', 'on-site only'],
  badWordsEnabled: true,
  titleFilterWords: ['engineer', 'developer'],
  titleFilterEnabled: true,
  titleSkipWords: ['intern', 'principal'],
  titleSkipEnabled: true,
  cvFiles: [
    { id: 'cv_1700000000000_aaa', name: 'cv_react.pdf' },
    { id: 'cv_1700000000001_bbb', name: 'cv_fullstack.pdf' },
  ],
  selectedCvFile: 'cv_1700000000000_aaa',
  selectedCvFileFilters: {
    'cv_react.pdf': ['react', 'frontend'],
    'cv_fullstack.pdf': ['fullstack', 'node'],
  },
  smartSelectEnabled: true,
  applyHistory: [
    {
      timestamp: 1700000010000,
      jobId: 'job-1',
      title: 'Senior React Engineer',
      companyName: 'Acme',
      url: 'https://www.linkedin.com/jobs/view/job-1/',
      applied: true,
      reason: 'applied',
      description: null,
    },
    {
      timestamp: 1700000020000,
      jobId: 'job-2',
      title: 'Backend Engineer',
      companyName: 'Globex',
      url: 'https://www.linkedin.com/jobs/view/job-2/',
      applied: false,
      reason: 'badWord',
      description: 'Requires on-site presence in Houston.',
    },
  ],
};

export async function seed(): Promise<void> {
  await chrome.storage.local.set(seedData);
  console.log('[Seed] Storage seeded with parity-test baseline.', seedData);
}

declare global {
  interface Window {
    seed?: typeof seed;
  }
}

if (typeof window !== 'undefined') {
  window.seed = seed;
}
