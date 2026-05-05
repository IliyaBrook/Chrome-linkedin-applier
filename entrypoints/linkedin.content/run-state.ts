import { aaError } from './dom-utils';
import { sendMessage } from '@/lib/messaging';
import {
  autoApplyRunningStorage,
  lastScriptActivityStorage,
} from '@/lib/storage';
import { startSaveModalMonitoring, stopSaveModalMonitoring } from './save-modal';

export type ApplyOutcome = {
  reachedModal: boolean;
  submitClicked: boolean;
  sentModalDetected: boolean;
};

export class ContentRunState {
  isSaveModalBeingHandled = false;
  lastSaveModalHandleTime = 0;
  saveModalDetectedTime = 0;
  saveModalFailureCount = 0;
  saveModalCheckInterval: ReturnType<typeof setInterval> | null = null;
  extensionContextCheckInterval: ReturnType<typeof setInterval> | null = null;
  prevSearchValue = '';
  currentPage = '';
  isNavigating = false;
  applyOutcome: ApplyOutcome = {
    reachedModal: false,
    submitClicked: false,
    sentModalDetected: false,
  };

  resetApplyOutcome = (): void => {
    this.applyOutcome = {
      reachedModal: false,
      submitClicked: false,
      sentModalDetected: false,
    };
  };

  isExtensionContextValid = (): boolean => {
    try {
      return !!browser?.runtime?.id;
    } catch {
      return false;
    }
  };

  isExtensionContextValidQuiet = (): boolean => {
    try {
      if (!browser || !browser.runtime || !browser.storage) return false;
      if (!browser.runtime.id) return false;
      return !(!browser.runtime.sendMessage || !browser.storage.local);
    } catch {
      return false;
    }
  };

  updateScriptActivity = async (): Promise<void> => {
    try {
      if (this.isExtensionContextValidQuiet()) {
        await lastScriptActivityStorage.setValue(Date.now());
      }
    } catch (error) {
      aaError('Failed to update script activity timestamp', error);
    }
  };

  setAutoApplyRunning = async (value: boolean, reason = 'Unknown'): Promise<void> => {
    if (!this.isExtensionContextValidQuiet()) return;
    try {
      await autoApplyRunningStorage.setValue(value);
      await lastScriptActivityStorage.setValue(Date.now());
    } catch (error) {
      if (this.isExtensionContextValidQuiet()) {
        console.trace(`Error reason: ${reason}`, error);
      }
    }
  };

  stopScript = async (): Promise<void> => {
    this.stopExtensionContextMonitoring();
    await this.setAutoApplyRunning(false, 'stopScript called');

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTabId = tabs?.[0]?.id;
      if (currentTabId != null) {
        await sendMessage('stopAutoApply', { tabId: currentTabId });
      }
    } catch (error) {
      aaError('Error in stopScript', error);
    }
    this.prevSearchValue = '';
  };

  startScript = async (): Promise<boolean> => {
    if (!this.isExtensionContextValid()) return false;
    try {
      this.saveModalDetectedTime = 0;
      this.saveModalFailureCount = 0;
      await this.setAutoApplyRunning(true, 'startScript called');
      this.startExtensionContextMonitoring();
      return true;
    } catch {
      return false;
    }
  };

  checkAndPrepareRunState = async (allowAutoRecovery = false): Promise<boolean> => {
    try {
      const isRunning = await autoApplyRunningStorage.getValue();
      if (isRunning) return true;
      if (allowAutoRecovery) {
        const lastActivity = await lastScriptActivityStorage.getValue();
        const now = Date.now();
        const timeSinceLastActivity = now - (lastActivity ?? 0);
        if (timeSinceLastActivity < 30_000) {
          await this.setAutoApplyRunning(true, 'auto-recovery from recent activity');
          return true;
        }
      }
      this.prevSearchValue = '';
      return false;
    } catch {
      return false;
    }
  };

  startExtensionContextMonitoring = (): void => {
    let contextLossCount = 0;
    this.extensionContextCheckInterval = setInterval(async () => {
      try {
        if (!this.isExtensionContextValid()) {
          contextLossCount++;
          if (contextLossCount >= 3) {
            void this.stopScript();
            if (this.extensionContextCheckInterval) {
              clearInterval(this.extensionContextCheckInterval);
              this.extensionContextCheckInterval = null;
            }
          }
        } else {
          contextLossCount = 0;
          await this.updateScriptActivity();
        }
      } catch (error) {
        aaError('Error during extension context monitoring', error);
      }
    }, 10_000);
    startSaveModalMonitoring(this);
  };

  stopExtensionContextMonitoring = (): void => {
    if (this.extensionContextCheckInterval) {
      clearInterval(this.extensionContextCheckInterval);
      this.extensionContextCheckInterval = null;
    }
    stopSaveModalMonitoring(this);
  };
}
