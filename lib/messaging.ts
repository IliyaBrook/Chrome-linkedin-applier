import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  DropdownUpdatePayload,
  ExternalApplyMessagePayload,
  InputFieldConfig,
  InputFieldUpdatePayload,
  RadioUpdatePayload,
} from './types';

export type SuccessResponse = { success: true };
export type FailureResponse = { success: false; message?: string; error?: string };
export type Envelope = SuccessResponse | FailureResponse;

export interface ProtocolMap {
  externalApplyAction(data: ExternalApplyMessagePayload): Envelope;
  openDefaultInputPage(): void;
  startAutoApply(data: { tabId: number }): Envelope;
  stopAutoApply(data: { tabId: number }): Envelope;
  openTabAndRunScript(data: { url: string }): Envelope;
  updateInputFieldValue(data: InputFieldUpdatePayload): Envelope;
  updateInputFieldConfigsInStorage(data: string): Envelope;
  deleteInputFieldConfig(data: string): void;
  getInputFieldConfig(): InputFieldConfig[] | null;
  updateRadioButtonValueByPlaceholder(data: RadioUpdatePayload): void;
  deleteRadioButtonConfig(data: string): void;
  updateDropdownConfig(data: DropdownUpdatePayload): void;
  deleteDropdownConfig(data: string): void;
  checkAutoApplyStatus(data: { tabId: number | null }): { isRunning: boolean };
  showNotOnJobSearchAlert(): Envelope;
  showFormControlAlert(): Envelope;
  hideRunningModal(): Envelope;
  showRunningModal(): SuccessResponse;
  getCurrentUrl(): { url: string };
  checkScriptRunning(): { isRunning: boolean };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
