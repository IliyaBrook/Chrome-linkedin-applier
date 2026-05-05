import {
  addDelay,
  clickElement,
  getElementsByXPath,
  isElementVisible,
  waitForElements,
} from './dom-utils';
import { waitForJobsLoaderToDisappear } from './loaders';
import { handleSaveApplicationModal } from './save-modal';
import type { ContentRunState } from './run-state';

export function getInteropShadowRoot(): ShadowRoot | null {
  const host = document.querySelector('[data-testid="interop-shadowdom"]');
  if (host && (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot) {
    return (host as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
  }
  return null;
}

export function findSduiApplyModal(): HTMLElement | null {
  const sr = getInteropShadowRoot();
  if (!sr) return null;
  const dialog = sr.querySelector('[role="dialog"], [role="alertdialog"]');
  if (!(dialog instanceof HTMLElement)) return null;
  const r = dialog.getBoundingClientRect();
  if (r.width < 100 || r.height < 100) return null;
  return dialog;
}

export async function dismissSduiApplyModal(): Promise<boolean> {
  const dialog = findSduiApplyModal();
  if (!dialog) return false;

  const dismissBtn = dialog.querySelector(
    'button[aria-label="Dismiss"], button[aria-label="Close"]',
  );
  if (dismissBtn instanceof HTMLElement) {
    dismissBtn.click();
    await addDelay(800);
  }

  const sr = getInteropShadowRoot();
  if (sr) {
    const discardBtn = sr.querySelector(
      'button[aria-label*="Discard"], button[data-test-dialog-secondary-btn]',
    );
    if (discardBtn instanceof HTMLElement) {
      discardBtn.click();
      await addDelay(800);
    }
  }

  return !findSduiApplyModal();
}

export function findEasyApplyModal(): HTMLElement | null {
  const byClass = document.querySelector('.artdeco-modal.jobs-easy-apply-modal');
  if (byClass instanceof HTMLElement) return byClass;

  const byAria = document.querySelector(
    '.artdeco-modal[aria-labelledby*="apply"], [class*="jobs-easy-apply"]',
  );
  if (byAria instanceof HTMLElement) {
    const closest = byAria.closest('.artdeco-modal');
    return closest instanceof HTMLElement ? closest : byAria;
  }

  const modals = Array.from(document.querySelectorAll('.artdeco-modal'));
  for (const m of modals) {
    if (
      m instanceof HTMLElement &&
      m.querySelector(
        'button[aria-label="Submit application"], button[aria-label="Review your application"], button[aria-label="Continue applying"]',
      )
    ) {
      return m;
    }
  }
  return null;
}

export async function handleDiscardConfirmDialog(): Promise<boolean> {
  const confirmDialog = document.querySelector(
    '.artdeco-modal__actionbar--confirm-dialog',
  );
  if (confirmDialog) {
    const discardButton = confirmDialog.querySelector(
      'button[data-control-name="discard_application_confirm_btn"], button[data-test-dialog-secondary-btn]',
    );
    if (
      discardButton instanceof HTMLElement &&
      discardButton.textContent?.trim().toLowerCase().includes('discard')
    ) {
      discardButton.click();
      await addDelay(1500);
      return true;
    }
  }

  const saveModal = document.querySelector('[data-test-modal=""][role="alertdialog"]');
  if (saveModal) {
    const titleElement = saveModal.querySelector('h2[data-test-dialog-title]');
    if (
      titleElement &&
      titleElement.textContent?.includes('Save this application?')
    ) {
      const discardButton = saveModal.querySelector(
        'button[data-test-dialog-secondary-btn]',
      );
      if (
        discardButton instanceof HTMLElement &&
        discardButton.textContent?.trim().toLowerCase().includes('discard')
      ) {
        discardButton.click();
        await addDelay(1500);
        return true;
      }
    }
  }
  return false;
}

export async function ensureNoApplicationModalOpen(maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const saveModal = document.querySelector('[data-test-modal=""][role="alertdialog"]');
    const confirmDialog = document.querySelector(
      '.artdeco-modal__actionbar--confirm-dialog',
    );
    const easyApplyModal = findEasyApplyModal();
    const sduiModal = findSduiApplyModal();

    if (!saveModal && !confirmDialog && !easyApplyModal && !sduiModal) return true;

    const handled = await handleDiscardConfirmDialog();
    if (handled) {
      await addDelay(1000);
      continue;
    }

    if (sduiModal) {
      await dismissSduiApplyModal();
      await addDelay(800);
      continue;
    }

    const dismissButton = document.querySelector('.artdeco-modal__dismiss');
    if (dismissButton instanceof HTMLElement) {
      dismissButton.click();
      await addDelay(1000);
      continue;
    }

    await addDelay(500);
  }

  const stillSave = document.querySelector('[data-test-modal=""][role="alertdialog"]');
  const stillConfirm = document.querySelector(
    '.artdeco-modal__actionbar--confirm-dialog',
  );
  const stillEasy = findEasyApplyModal();
  const stillSdui = findSduiApplyModal();
  return !stillSave && !stillConfirm && !stillEasy && !stillSdui;
}

export async function waitForJobsLoaderToDisappearAndHandle(
  initialTimeout = 5000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < initialTimeout) {
    const jobsLoaders = document.querySelectorAll(
      '.jobs-loader, [class*="jobs-loader"]',
    );
    let hasVisibleJobsLoader = false;
    for (const loader of jobsLoaders) {
      if (isElementVisible(loader)) {
        hasVisibleJobsLoader = true;
        break;
      }
    }
    if (!hasVisibleJobsLoader) break;
    await addDelay(500);
  }

  const jobsLoader = document.querySelector('.jobs-loader');
  if (jobsLoader && isElementVisible(jobsLoader)) {
    const modal = findEasyApplyModal();
    if (modal) {
      const modalRect = modal.getBoundingClientRect();
      const clickX = modalRect.left - 10;
      const clickY = modalRect.top + modalRect.height / 2;
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: clickX,
        clientY: clickY,
      });
      document.elementFromPoint(clickX, clickY)?.dispatchEvent(clickEvent);
    }
    await addDelay(1500);
  }

  await ensureNoApplicationModalOpen();
  return true;
}

export function findApplicationSentModal(): HTMLElement | null {
  const matches = (txt: string | null | undefined): boolean =>
    /your application was sent|application sent/i.test(txt || '');

  for (const m of document.querySelectorAll('.artdeco-modal')) {
    if (m instanceof HTMLElement && matches(m.textContent)) return m;
  }

  const sr = getInteropShadowRoot();
  if (sr) {
    const dialogs = sr.querySelectorAll(
      '[role="dialog"], [role="alertdialog"], [class*="modal"]',
    );
    for (const d of dialogs) {
      if (d instanceof HTMLElement && matches(d.textContent)) return d;
    }
  }
  return null;
}

export async function waitForApplicationSentModal(
  timeout = 8000,
): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const m = findApplicationSentModal();
    if (m) return m;
    await addDelay(250);
  }
  return null;
}

export async function performSafetyReminderCheck(): Promise<void> {
  const modal = document.querySelector('.artdeco-modal');
  if (!modal) return;
  const modalHeader = modal.querySelector('.artdeco-modal__header');
  if (!modalHeader || !modalHeader.textContent?.includes('Job search safety reminder')) {
    return;
  }
  const dismissButton = modal.querySelector('.artdeco-modal__dismiss');
  if (dismissButton instanceof HTMLElement) dismissButton.click();
}

export async function validateAndCloseConfirmationModal(): Promise<boolean> {
  const modal = document.querySelector('.artdeco-modal');
  if (!modal) return false;

  const modalHeader = modal.querySelector('.artdeco-modal__header');
  const modalContent = modal.querySelector('.artdeco-modal__content');

  const matchesHeader = modalHeader?.textContent?.includes('Save this application?');
  const matchesContent = modalContent?.textContent?.includes(
    'Save to return to this application later',
  );

  if (!matchesHeader && !matchesContent) return false;

  const discardButton = modal.querySelector('button[data-test-dialog-secondary-btn]');
  if (
    discardButton instanceof HTMLElement &&
    discardButton.textContent?.trim().includes('Discard')
  ) {
    discardButton.click();
    await addDelay(1000);
    return true;
  }

  const dismissButton = modal.querySelector('.artdeco-modal__dismiss');
  if (dismissButton instanceof HTMLElement) {
    dismissButton.click();
    await addDelay(1000);
    return true;
  }

  return false;
}

export async function clickDoneIfExist(): Promise<void> {
  try {
    const modalWait = await waitForElements({
      elementOrSelector: '.artdeco-modal',
      timeout: 500,
    });
    const modal = modalWait?.[0];
    if (!(modal instanceof HTMLElement)) return;

    const xpathResult = getElementsByXPath({
      context: modal,
      xpath:
        '//button[.//*[contains(text(), "Done")] or contains(normalize-space(.), "Done")]',
    });
    if (xpathResult.length > 0) {
      const doneButton = xpathResult[0];
      await clickElement({ elementOrSelector: doneButton });
      await addDelay(300);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.trace('clickDoneIfExist error:' + message);
  }
}

export async function terminateJobModel(
  state: ContentRunState,
  context: Document | HTMLElement = document,
): Promise<void> {
  if (!state.isSaveModalBeingHandled) {
    const saveModalHandled = await handleSaveApplicationModal(state);
    if (saveModalHandled) return;
  }

  const dismissButton = context.querySelector('button[aria-label="Dismiss"]');
  if (!(dismissButton instanceof HTMLElement)) return;

  dismissButton.click();
  dismissButton.dispatchEvent(new Event('change', { bubbles: true }));
  await addDelay(1000);

  if (!state.isSaveModalBeingHandled) {
    const saveModalAfterDismiss = await handleSaveApplicationModal(state);
    if (saveModalAfterDismiss) return;
  }

  const discardButton = Array.from(
    document.querySelectorAll('button[data-test-dialog-secondary-btn]'),
  ).find((button) => button.textContent?.trim() === 'Discard');
  if (discardButton instanceof HTMLElement) {
    discardButton.click();
    discardButton.dispatchEvent(new Event('change', { bubbles: true }));
    await addDelay(500);
  }
}

export async function closeApplicationSentModal(state: ContentRunState): Promise<void> {
  const saveModalHandled = await handleSaveApplicationModal(state);
  if (saveModalHandled) return;

  const modal = findApplicationSentModal();
  if (!modal) return;

  const dismiss =
    modal.querySelector('.artdeco-modal__dismiss') ||
    modal.querySelector('button[aria-label="Dismiss"]') ||
    modal.querySelector('button[aria-label="Close"]');
  if (dismiss instanceof HTMLElement) {
    dismiss.click();
    await addDelay(500);
    await waitForJobsLoaderToDisappear();
  }
}
