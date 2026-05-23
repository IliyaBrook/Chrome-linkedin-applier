import {onMessage, sendMessage} from '@/lib/messaging';
import {
  applyHistoryStorage,
  autoApplyRunningStorage,
  cvFilesStorage,
  defaultFieldsStorage,
  dropdownsStorage,
  externalApplyDataStorage,
  inputFieldConfigsStorage,
  radioButtonsStorage,
  selectedCvFileStorage,
} from '@/lib/storage';
import {pruneInvalidApplyHistory, reconcileSelectedCv,} from '@/lib/storage-migration';
import {
  type DropdownConfig,
  type ExternalApplyEntry,
  type InputFieldConfig,
  type RadioButtonConfig,
} from '@/lib/types';
import {normalizeLinkedInJobUrl} from '@/lib/linkedin-urls';

export const FORM_CONTROL_PAGE = 'form-control.html';

export function dedupeExternalApply(entries: ExternalApplyEntry[]): ExternalApplyEntry[] {
  const seenLinks = new Set<string>();
  const seenTitleAndCompany = new Set<string>();
  const result: ExternalApplyEntry[] = [];
  for (const entry of entries) {
    const linkKey = entry.link;
    const titleCompanyKey = `${entry.title}-${entry.companyName}`;
    if (!seenLinks.has(linkKey) && !seenTitleAndCompany.has(titleCompanyKey)) {
      seenLinks.add(linkKey);
      seenTitleAndCompany.add(titleCompanyKey);
      result.push(entry);
    }
  }
  return result.sort((a, b) => b.time - a.time);
}

export async function appendExternalApply(payload: {
  jobTitle: string;
  currentPageLink: string;
  companyName: string;
}): Promise<void> {
  const stored = await externalApplyDataStorage.getValue();
  const jobUrl = normalizeLinkedInJobUrl(payload.currentPageLink);
  const next = dedupeExternalApply([
    {
      title: payload.jobTitle,
      link: jobUrl,
      companyName: payload.companyName,
      time: Date.now(),
    },
    ...stored,
  ]);
  await externalApplyDataStorage.setValue(next);
}

export function upsertInputFieldValue(
  configs: InputFieldConfig[],
  placeholder: string,
  value: string,
): InputFieldConfig[] {
  const next = [...configs];
  const idx = next.findIndex((c) => c.placeholderIncludes === placeholder);
  if (idx === -1) {
    next.push({
      placeholderIncludes: placeholder,
      defaultValue: value,
      count: 1,
      createdAt: Date.now(),
    });
  } else {
    next[idx] = { ...next[idx], defaultValue: value };
  }
  return next;
}

export function bumpInputFieldCount(
  configs: InputFieldConfig[],
  placeholder: string,
): InputFieldConfig[] {
  const next = [...configs];
  const idx = next.findIndex((c) => c.placeholderIncludes === placeholder);
  if (idx === -1) {
    next.push({
      placeholderIncludes: placeholder,
      defaultValue: '',
      count: 1,
      createdAt: Date.now(),
    });
  } else {
    next[idx] = {
      ...next[idx],
      count: next[idx].count + 1,
      createdAt: next[idx].createdAt ?? Date.now(),
    };
  }
  return next;
}

export function removeInputFieldConfig(
  configs: InputFieldConfig[],
  placeholder: string,
): InputFieldConfig[] {
  return configs.filter((c) => c.placeholderIncludes !== placeholder);
}

export function setRadioValue(
  radios: RadioButtonConfig[],
  placeholderIncludes: string,
  newValue: string,
): RadioButtonConfig[] {
  return radios.map((r) =>
    r.placeholderIncludes !== placeholderIncludes
      ? r
      : {
          ...r,
          defaultValue: newValue,
          options: r.options.map((o) => ({ ...o, selected: o.value === newValue })),
        },
  );
}

export function removeRadio(
  radios: RadioButtonConfig[],
  placeholderIncludes: string,
): RadioButtonConfig[] {
  return radios.filter((r) => r.placeholderIncludes !== placeholderIncludes);
}

export function upsertDropdown(
  dropdowns: DropdownConfig[],
  payload: { placeholderIncludes: string; value: string; options: DropdownConfig['options'] },
): DropdownConfig[] {
  const next = [...dropdowns];
  const idx = next.findIndex((d) => d.placeholderIncludes === payload.placeholderIncludes);
  const optionsWithSelection = payload.options.map((o) => ({
    value: o.value,
    text: o.text || '',
    selected: o.value === payload.value,
  }));
  if (idx === -1) {
    next.push({
      placeholderIncludes: payload.placeholderIncludes,
      value: payload.value,
      createdAt: Date.now(),
      options: optionsWithSelection,
    });
  } else {
    next[idx] = {
      ...next[idx],
      value: payload.value,
      options: optionsWithSelection,
      createdAt: next[idx].createdAt ?? Date.now(),
    };
  }
  return next;
}

export function removeDropdown(
  dropdowns: DropdownConfig[],
  placeholderIncludes: string,
): DropdownConfig[] {
  return dropdowns.filter((d) => d.placeholderIncludes !== placeholderIncludes);
}

function runScriptInContent(): void {
  const fn = (globalThis as unknown as { runScript?: () => void }).runScript;
  if (typeof fn === 'function') fn();
}

export async function runStorageMigration(reason: string): Promise<void> {
  const before = await browser.storage.local.get(null);
  const keysPresent = Object.keys(before);
  console.log('[Easy Apply] storage migration', { reason, keysPresent });

  const historyResult = pruneInvalidApplyHistory(before.applyHistory);
  if (historyResult.dropped > 0) {
    console.warn(
      '[Easy Apply] storage migration: dropped',
      historyResult.dropped,
      'apply-history entries with unknown shape',
    );
    await applyHistoryStorage.setValue(historyResult.next);
  }

  const cvFiles = await cvFilesStorage.getValue();
  const selectedCv = await selectedCvFileStorage.getValue();
  const reconciled = reconcileSelectedCv(selectedCv, cvFiles);
  if (reconciled.cleared) {
    console.warn(
      '[Easy Apply] storage migration: selectedCvFile pointed to a missing CV — cleared',
    );
    await selectedCvFileStorage.setValue(reconciled.next);
  }
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] ?? null;
}

function isOnLinkedinJobs(url: string | undefined): boolean {
  return Boolean(url && url.includes('linkedin.com/jobs'));
}

export default defineBackground(() => {
  console.log('Easy Apply LinkedIn (WXT dev) — background ready', { id: browser.runtime.id });

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'update') return;
    void runStorageMigration(details.reason).catch((err) => {
      console.error('[Easy Apply] storage migration failed', err);
    });
  });

  onMessage('externalApplyAction', async ({ data }) => {
    try {
      await appendExternalApply(data);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  onMessage('openDefaultInputPage', async () => {
    await browser.tabs.create({ url: FORM_CONTROL_PAGE });
  });

  onMessage('startAutoApply', async ({ data }) => {
    const tab = await getActiveTab();
    if (!tab?.id) return { success: false, message: 'No active tab found.' };
    const tabId = tab.id;
    const url = tab.url ?? '';

    const defaults = await defaultFieldsStorage.getValue();
    const isDefaultFieldsEmpty = Object.values(defaults).some((v) => v === '');

    if (!isOnLinkedinJobs(url)) {
      try {
        await sendMessage('showNotOnJobSearchAlert', undefined, tabId);
      } catch {
        // content script may not be ready
      }
      return { success: false, message: 'You are not on the LinkedIn jobs search page.' };
    }
    if (isDefaultFieldsEmpty) {
      try {
        await sendMessage('showFormControlAlert', undefined, tabId);
      } catch {
        // content script may not be ready
      }
      return {
        success: false,
        message: 'Form control fields are empty. Please set them in the extension options.',
      };
    }

    try {
      await browser.scripting.executeScript({
        target: { tabId: data.tabId },
        func: runScriptInContent,
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  });

  onMessage('stopAutoApply', async ({ data }) => {
    await autoApplyRunningStorage.setValue(false);
    try {
      return await sendMessage('hideRunningModal', undefined, data.tabId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  });

  onMessage('openTabAndRunScript', async ({ data }) => {
    const tab = await browser.tabs.create({ url: data.url });
    if (!tab.id) return { success: false, message: 'Failed to open tab.' };

    return await new Promise<{ success: true } | { success: false; message: string }>(
      (resolve) => {
        const listener = (
          tabId: number,
          changeInfo: { status?: string },
        ) => {
          if (tabId !== tab.id || changeInfo.status !== 'complete') return;
          browser.tabs.onUpdated.removeListener(listener);
          (async () => {
            try {
              await sendMessage('showRunningModal', undefined, tabId);
              await browser.scripting.executeScript({
                target: { tabId },
                func: runScriptInContent,
              });
              resolve({ success: true });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              resolve({ success: false, message });
            }
          })();
        };
        browser.tabs.onUpdated.addListener(listener);
      },
    );
  });

  onMessage('updateInputFieldValue', async ({ data }) => {
    try {
      const configs = await inputFieldConfigsStorage.getValue();
      await inputFieldConfigsStorage.setValue(
        upsertInputFieldValue(configs, data.placeholder, data.value),
      );
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  });

  onMessage('updateInputFieldConfigsInStorage', async ({ data }) => {
    try {
      const configs = await inputFieldConfigsStorage.getValue();
      await inputFieldConfigsStorage.setValue(bumpInputFieldCount(configs, data));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  });

  onMessage('deleteInputFieldConfig', async ({ data }) => {
    const configs = await inputFieldConfigsStorage.getValue();
    await inputFieldConfigsStorage.setValue(removeInputFieldConfig(configs, data));
  });

  onMessage('getInputFieldConfig', async () => {
    const configs = await inputFieldConfigsStorage.getValue();
    return configs.length === 0 ? null : configs;
  });

  onMessage('updateRadioButtonValueByPlaceholder', async ({ data }) => {
    const radios = await radioButtonsStorage.getValue();
    await radioButtonsStorage.setValue(
      setRadioValue(radios, data.placeholderIncludes, data.newValue),
    );
  });

  onMessage('deleteRadioButtonConfig', async ({ data }) => {
    const radios = await radioButtonsStorage.getValue();
    await radioButtonsStorage.setValue(removeRadio(radios, data));
  });

  onMessage('updateDropdownConfig', async ({ data }) => {
    if (!data?.placeholderIncludes || !data.value || !data.options) return;
    const dropdowns = await dropdownsStorage.getValue();
    await dropdownsStorage.setValue(upsertDropdown(dropdowns, data));
  });

  onMessage('deleteDropdownConfig', async ({ data }) => {
    const dropdowns = await dropdownsStorage.getValue();
    await dropdownsStorage.setValue(removeDropdown(dropdowns, data));
  });

  onMessage('checkAutoApplyStatus', async ({ data }) => {
    if (data.tabId != null) {
      try {
        const response = await sendMessage('checkScriptRunning', undefined, data.tabId);
        const isRunning = Boolean(response?.isRunning);
        await autoApplyRunningStorage.setValue(isRunning);
        return { isRunning };
      } catch {
        await autoApplyRunningStorage.setValue(false);
        return { isRunning: false };
      }
    }
    const stored = await autoApplyRunningStorage.getValue();
    return { isRunning: Boolean(stored) };
  });

  void applyHistoryStorage;
});
