import { describe, expect, it } from 'vitest';
import {
  applyHistoryStorage,
  autoApplyRunningStorage,
  badWordsEnabledStorage,
  cvFilesStorage,
  defaultFieldsStorage,
  externalApplyDataStorage,
  inputFieldConfigsStorage,
  savedLinksStorage,
  STORAGE_KEYS,
} from './storage';
import { EMPTY_DEFAULT_FIELDS } from './types';

describe('storage wrappers', () => {
  it('exposes every key with the local: prefix', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith('local:')).toBe(true);
    }
  });

  it('autoApplyRunning falls back to false', async () => {
    expect(await autoApplyRunningStorage.getValue()).toBe(false);
  });

  it('badWordsEnabled falls back to true', async () => {
    expect(await badWordsEnabledStorage.getValue()).toBe(true);
  });

  it('defaultFields falls back to all empty strings', async () => {
    expect(await defaultFieldsStorage.getValue()).toEqual(EMPTY_DEFAULT_FIELDS);
  });

  it('savedLinks falls back to empty object', async () => {
    expect(await savedLinksStorage.getValue()).toEqual({});
  });

  it('arrays fall back to []', async () => {
    expect(await inputFieldConfigsStorage.getValue()).toEqual([]);
    expect(await externalApplyDataStorage.getValue()).toEqual([]);
    expect(await cvFilesStorage.getValue()).toEqual([]);
    expect(await applyHistoryStorage.getValue()).toEqual([]);
  });

  it('round-trips a write then read', async () => {
    await savedLinksStorage.setValue({ remote: 'https://example.com/jobs?remote=1' });
    expect(await savedLinksStorage.getValue()).toEqual({
      remote: 'https://example.com/jobs?remote=1',
    });
  });

  it('isolates values per key (no cross-talk)', async () => {
    await autoApplyRunningStorage.setValue(true);
    await badWordsEnabledStorage.setValue(false);
    expect(await autoApplyRunningStorage.getValue()).toBe(true);
    expect(await badWordsEnabledStorage.getValue()).toBe(false);
  });
});
