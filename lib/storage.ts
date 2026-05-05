import { storage, type WxtStorageItem } from 'wxt/utils/storage';
import {
  EMPTY_DEFAULT_FIELDS,
  type ApplyHistoryEntry,
  type CvFile,
  type CvFilters,
  type DefaultFields,
  type DropdownConfig,
  type ExternalApplyEntry,
  type InputFieldConfig,
  type RadioButtonConfig,
  type SavedLinks,
} from './types';

export const STORAGE_KEYS = {
  AUTO_APPLY_RUNNING: 'local:autoApplyRunning',
  LAST_SCRIPT_ACTIVITY: 'local:lastScriptActivity',
  LAST_JOB_SEARCH_URL: 'local:lastJobSearchUrl',
  DEFAULT_FIELDS: 'local:defaultFields',
  INPUT_FIELD_CONFIGS: 'local:inputFieldConfigs',
  RADIO_BUTTONS: 'local:radioButtons',
  DROPDOWNS: 'local:dropdowns',
  EXTERNAL_APPLY_DATA: 'local:externalApplyData',
  SAVED_LINKS: 'local:savedLinks',
  BAD_WORDS: 'local:badWords',
  BAD_WORDS_ENABLED: 'local:badWordsEnabled',
  TITLE_FILTER_WORDS: 'local:titleFilterWords',
  TITLE_FILTER_ENABLED: 'local:titleFilterEnabled',
  TITLE_SKIP_WORDS: 'local:titleSkipWords',
  TITLE_SKIP_ENABLED: 'local:titleSkipEnabled',
  CV_FILES: 'local:cvFiles',
  SELECTED_CV_FILE: 'local:selectedCvFile',
  SELECTED_CV_FILE_FILTERS: 'local:selectedCvFileFilters',
  SMART_SELECT_ENABLED: 'local:smartSelectEnabled',
  APPLY_HISTORY: 'local:applyHistory',
} as const;

export const autoApplyRunningStorage: WxtStorageItem<boolean, Record<string, unknown>> =
  storage.defineItem<boolean>(STORAGE_KEYS.AUTO_APPLY_RUNNING, { fallback: false });

export const lastScriptActivityStorage = storage.defineItem<number | null>(
  STORAGE_KEYS.LAST_SCRIPT_ACTIVITY,
  { fallback: null },
);

export const lastJobSearchUrlStorage = storage.defineItem<string | null>(
  STORAGE_KEYS.LAST_JOB_SEARCH_URL,
  { fallback: null },
);

export const defaultFieldsStorage = storage.defineItem<DefaultFields>(STORAGE_KEYS.DEFAULT_FIELDS, {
  fallback: EMPTY_DEFAULT_FIELDS,
});

export const inputFieldConfigsStorage = storage.defineItem<InputFieldConfig[]>(
  STORAGE_KEYS.INPUT_FIELD_CONFIGS,
  { fallback: [] },
);

export const radioButtonsStorage = storage.defineItem<RadioButtonConfig[]>(
  STORAGE_KEYS.RADIO_BUTTONS,
  { fallback: [] },
);

export const dropdownsStorage = storage.defineItem<DropdownConfig[]>(STORAGE_KEYS.DROPDOWNS, {
  fallback: [],
});

export const externalApplyDataStorage = storage.defineItem<ExternalApplyEntry[]>(
  STORAGE_KEYS.EXTERNAL_APPLY_DATA,
  { fallback: [] },
);

export const savedLinksStorage = storage.defineItem<SavedLinks>(STORAGE_KEYS.SAVED_LINKS, {
  fallback: {},
});

export const badWordsStorage = storage.defineItem<string[]>(STORAGE_KEYS.BAD_WORDS, {
  fallback: [],
});

export const badWordsEnabledStorage = storage.defineItem<boolean>(STORAGE_KEYS.BAD_WORDS_ENABLED, {
  fallback: true,
});

export const titleFilterWordsStorage = storage.defineItem<string[]>(
  STORAGE_KEYS.TITLE_FILTER_WORDS,
  { fallback: [] },
);

export const titleFilterEnabledStorage = storage.defineItem<boolean>(
  STORAGE_KEYS.TITLE_FILTER_ENABLED,
  { fallback: true },
);

export const titleSkipWordsStorage = storage.defineItem<string[]>(STORAGE_KEYS.TITLE_SKIP_WORDS, {
  fallback: [],
});

export const titleSkipEnabledStorage = storage.defineItem<boolean>(
  STORAGE_KEYS.TITLE_SKIP_ENABLED,
  { fallback: true },
);

export const cvFilesStorage = storage.defineItem<CvFile[]>(STORAGE_KEYS.CV_FILES, { fallback: [] });

export const selectedCvFileStorage = storage.defineItem<string | null>(
  STORAGE_KEYS.SELECTED_CV_FILE,
  { fallback: null },
);

export const selectedCvFileFiltersStorage = storage.defineItem<CvFilters>(
  STORAGE_KEYS.SELECTED_CV_FILE_FILTERS,
  { fallback: {} },
);

export const smartSelectEnabledStorage = storage.defineItem<boolean>(
  STORAGE_KEYS.SMART_SELECT_ENABLED,
  { fallback: false },
);

export const applyHistoryStorage = storage.defineItem<ApplyHistoryEntry[]>(
  STORAGE_KEYS.APPLY_HISTORY,
  { fallback: [] },
);

export async function getAllStorage(): Promise<Record<string, unknown>> {
  return browser.storage.local.get();
}

export async function setAllStorage(data: Record<string, unknown>): Promise<void> {
  await browser.storage.local.set(data);
}
