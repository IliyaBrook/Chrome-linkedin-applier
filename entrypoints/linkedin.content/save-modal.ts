import { addDelay, aaError } from './dom-utils';
import { MAX_SAVE_MODAL_FAILURES, MAX_SAVE_MODAL_WAIT_TIME } from '@/lib/constants';
import type { ContentRunState } from './run-state';

export async function handleSaveApplicationModal(state: ContentRunState): Promise<boolean> {
  const currentTime = Date.now();

  if (state.isSaveModalBeingHandled) return false;
  if (currentTime - state.lastSaveModalHandleTime < 4000) return false;

  const confirmDialog = document.querySelector(
    '.artdeco-modal__actionbar--confirm-dialog',
  );
  if (confirmDialog) {
    const discardBtn = confirmDialog.querySelector(
      'button[data-control-name="discard_application_confirm_btn"], button[data-test-dialog-secondary-btn]',
    );
    if (
      discardBtn instanceof HTMLElement &&
      discardBtn.textContent?.trim().toLowerCase().includes('discard')
    ) {
      state.isSaveModalBeingHandled = true;
      state.lastSaveModalHandleTime = currentTime;
      discardBtn.click();
      await addDelay(1500);
      setTimeout(() => {
        state.isSaveModalBeingHandled = false;
      }, 1000);
      return true;
    }
  }

  const saveModal = document.querySelector('[data-test-modal=""][role="alertdialog"]');
  if (!saveModal) return false;

  const titleElement = saveModal.querySelector('h2[data-test-dialog-title]');
  if (
    !titleElement ||
    !titleElement.textContent?.includes('Save this application?')
  ) {
    return false;
  }

  state.isSaveModalBeingHandled = true;
  state.lastSaveModalHandleTime = currentTime;

  if (state.saveModalDetectedTime === 0) {
    state.saveModalDetectedTime = currentTime;
    state.saveModalFailureCount = 0;
  }

  const waitTime = currentTime - state.saveModalDetectedTime;
  if (waitTime > MAX_SAVE_MODAL_WAIT_TIME) {
    await state.stopScript();
    return false;
  }

  if (state.saveModalFailureCount >= MAX_SAVE_MODAL_FAILURES) {
    await state.stopScript();
    return false;
  }

  try {
    const discardButton = saveModal.querySelector(
      'button[data-test-dialog-secondary-btn]',
    );
    if (
      discardButton instanceof HTMLElement &&
      discardButton.textContent?.trim().toLowerCase().includes('discard')
    ) {
      discardButton.click();
      await addDelay(1500);
      const modalStillExists = document.querySelector(
        '[data-test-modal=""][role="alertdialog"]',
      );
      if (!modalStillExists) {
        state.saveModalDetectedTime = 0;
        state.saveModalFailureCount = 0;
        return true;
      }
      state.saveModalFailureCount++;
    }

    const dismissButton = saveModal.querySelector('button[aria-label="Dismiss"]');
    if (dismissButton instanceof HTMLElement) {
      dismissButton.click();
      await addDelay(1500);
      const modalStillExists = document.querySelector(
        '[data-test-modal=""][role="alertdialog"]',
      );
      if (!modalStillExists) {
        state.saveModalDetectedTime = 0;
        state.saveModalFailureCount = 0;
        return true;
      }
      state.saveModalFailureCount++;
    }

    state.saveModalFailureCount++;
    return false;
  } catch (error: unknown) {
    aaError('handleSaveApplicationModal threw', error);
    state.saveModalFailureCount++;
    return false;
  } finally {
    setTimeout(() => {
      state.isSaveModalBeingHandled = false;
    }, 1000);
  }
}

export function startSaveModalMonitoring(state: ContentRunState): void {
  state.saveModalCheckInterval = setInterval(async () => {
    if (state.isSaveModalBeingHandled) return;

    const confirmDialog = document.querySelector(
      '.artdeco-modal__actionbar--confirm-dialog',
    );
    if (confirmDialog) {
      await handleSaveApplicationModal(state);
      return;
    }

    const saveModal = document.querySelector(
      '[data-test-modal=""][role="alertdialog"]',
    );
    if (saveModal) {
      const titleElement = saveModal.querySelector('h2[data-test-dialog-title]');
      if (
        titleElement &&
        titleElement.textContent?.includes('Save this application?')
      ) {
        await handleSaveApplicationModal(state);
      }
    }
  }, 2000);
}

export function stopSaveModalMonitoring(state: ContentRunState): void {
  if (state.saveModalCheckInterval) {
    clearInterval(state.saveModalCheckInterval);
    state.saveModalCheckInterval = null;
  }
}
