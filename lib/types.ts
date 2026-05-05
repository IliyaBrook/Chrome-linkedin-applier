export const AA_REASONS = [
  'applied',
  'alreadyApplied',
  'external',
  'noEasyApply',
  'sduiNotSupported',
  'titleSkip',
  'titleFilterMissing',
  'badWord',
  'noTitle',
  'noClickTarget',
  'clickFailed',
  'detailsNotLoaded',
  'limitReached',
  'submitNotConfirmed',
  'noSubmitButton',
  'error',
  'other',
] as const;

export type ApplyReason = (typeof AA_REASONS)[number];

export const REASON_LABELS: Record<ApplyReason, string> = {
  applied: 'Applied',
  alreadyApplied: 'Already applied',
  external: 'External apply',
  noEasyApply: 'No Easy Apply',
  sduiNotSupported: 'SDUI not supported',
  titleSkip: 'Title Must Skip',
  titleFilterMissing: 'Title Must Contain',
  badWord: 'Bad word in description',
  noTitle: 'No title',
  noClickTarget: 'No click target',
  clickFailed: 'Click failed',
  detailsNotLoaded: 'Details did not load',
  limitReached: 'Daily limit reached',
  submitNotConfirmed: 'Submit not confirmed',
  noSubmitButton: 'No submit button',
  error: 'Error',
  other: 'Other',
};

export const AA_HISTORY_LIMIT = 2000;

export const DEFAULT_FIELD_KEYS = [
  'YearsOfExperience',
  'FirstName',
  'LastName',
  'PhoneNumber',
  'City',
  'Email',
] as const;

export type DefaultFieldKey = (typeof DEFAULT_FIELD_KEYS)[number];

export type DefaultFields = Record<DefaultFieldKey, string>;

export const EMPTY_DEFAULT_FIELDS: DefaultFields = {
  YearsOfExperience: '',
  FirstName: '',
  LastName: '',
  PhoneNumber: '',
  City: '',
  Email: '',
};

export type InputFieldConfig = {
  placeholderIncludes: string;
  defaultValue: string;
  count: number;
  createdAt?: number;
};

export type RadioOption = {
  value: string;
  text: string;
  selected: boolean;
};

export type RadioButtonConfig = {
  placeholderIncludes: string;
  defaultValue: string;
  count: number;
  options: RadioOption[];
  createdAt?: number;
};

export type DropdownOption = {
  value: string;
  text: string;
  selected: boolean;
};

export type DropdownConfig = {
  placeholderIncludes: string;
  value?: string;
  count?: number;
  options: DropdownOption[];
  createdAt?: number;
};

export type ExternalApplyEntry = {
  title: string;
  link: string;
  companyName: string;
  time: number;
};

export type SavedLinks = Record<string, string>;

export type CvFile = {
  id: string;
  name: string;
};

export type CvFilters = Record<string, string[]>;

export type ApplyHistoryEntry = {
  timestamp: number;
  jobId: string | null;
  title: string;
  companyName: string;
  url: string;
  applied: boolean;
  reason: ApplyReason;
  description: string | null;
};

export type DropdownUpdatePayload = {
  placeholderIncludes: string;
  value: string;
  options: DropdownOption[];
};

export type ExternalApplyMessagePayload = {
  jobTitle: string;
  currentPageLink: string;
  companyName: string;
};

export type InputFieldUpdatePayload = {
  placeholder: string;
  value: string;
};

export type RadioUpdatePayload = {
  placeholderIncludes: string;
  newValue: string;
};

export type SuccessEnvelope = { success: true } | { success: false; message?: string; error?: string };
