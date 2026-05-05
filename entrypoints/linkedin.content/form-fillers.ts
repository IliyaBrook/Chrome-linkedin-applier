import {
  addDelay,
  fillAutocompleteField,
  getVisibleElementByXPath,
  isElementVisible,
  setNativeValue,
  aaError,
  aaLog,
} from './dom-utils';
import {
  findSduiApplyModal,
  validateAndCloseConfirmationModal,
} from './modals';
import { handleSaveApplicationModal } from './save-modal';
import { findBestMatch, findClosestField } from '@/lib/fuzzy-match';
import { sendMessage } from '@/lib/messaging';
import {
  cvFilesStorage,
  defaultFieldsStorage,
  dropdownsStorage,
  radioButtonsStorage,
  selectedCvFileFiltersStorage,
  selectedCvFileStorage,
  smartSelectEnabledStorage,
  inputFieldConfigsStorage,
} from '@/lib/storage';
import type { ContentRunState } from './run-state';
import type {
  DropdownConfig,
  RadioButtonConfig,
  RadioOption,
} from '@/lib/types';

type FormContext = Document | HTMLElement | ShadowRoot;

export async function handleCheckboxField(
  inputField: HTMLInputElement,
  labelText: string,
): Promise<void> {
  try {
    const checkboxLabel = labelText.toLowerCase();
    const agreementKeywords = [
      'terms',
      'conditions',
      'agree',
      'i agree',
      'terms & conditions',
      'terms and conditions',
      'privacy policy',
      'accept',
      'consent',
      'acknowledge',
      'confirm',
      'verified',
    ];

    const shouldCheck = agreementKeywords.some(
      (keyword) =>
        checkboxLabel.includes(keyword) ||
        checkboxLabel.includes(keyword.replace('&', 'and')),
    );

    if (shouldCheck && !inputField.checked) {
      inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await addDelay(200);
      inputField.checked = true;
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      inputField.dispatchEvent(new Event('click', { bubbles: true }));
      await addDelay(300);
    }
  } catch (error) {
    aaError('Error handling checkbox: ', error);
  }
}

export async function performFillForm(
  inputField: HTMLInputElement | HTMLTextAreaElement,
): Promise<void> {
  try {
    const keyboardEvents = ['keydown', 'keypress', 'keyup'];
    const inputEvents = ['input'];

    for (const eventType of keyboardEvents) {
      try {
        const keyboardEvent = new KeyboardEvent(eventType, {
          bubbles: true,
          cancelable: true,
          key: '',
          code: '',
          keyCode: 0,
          which: 0,
        });
        inputField.dispatchEvent(keyboardEvent);
      } catch {
        inputField.dispatchEvent(
          new Event(eventType, { bubbles: true, cancelable: true }),
        );
      }
      await addDelay(100);
    }

    for (const eventType of inputEvents) {
      inputField.dispatchEvent(
        new Event(eventType, { bubbles: true, cancelable: true }),
      );
      await addDelay(100);
    }

    inputField.dispatchEvent(new Event('change', { bubbles: true }));
    await addDelay(200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    aaError('Error in performFillForm, continuing...', message);
  }
}

export async function performInputFieldChecks(context: FormContext = document): Promise<void> {
  try {
    const result = (await sendMessage('getInputFieldConfig', undefined)) ?? [];

    const allInputFields = context.querySelectorAll(
      'input[type="text"]:not([placeholder*="Search"]):not([placeholder*="search"]), input[role="combobox"]:not([placeholder*="Search"]):not([placeholder*="search"]), textarea, select, input[type="checkbox"]',
    );

    for (const raw of allInputFields) {
      const inputField = raw as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement;

      if ('type' in inputField && inputField.type === 'hidden') continue;
      if ((inputField as HTMLElement).offsetParent === null) continue;

      const isJobSearchBox =
        inputField.closest('[class*="jobs-search-box"]') ||
        inputField.closest('[data-test="jobs-search-box"]') ||
        inputField.closest('[class*="global-nav"]');

      const placeholder =
        'placeholder' in inputField ? (inputField.placeholder ?? '') : '';
      const isSearchField =
        placeholder.toLowerCase().includes('search') ||
        (placeholder.toLowerCase().includes('company') &&
          placeholder.toLowerCase().includes('title'));

      if (isJobSearchBox || isSearchField) continue;

      let label: HTMLLabelElement | HTMLElement | null = null;
      let labelText = '';

      const rootNode = inputField.getRootNode();
      const rootForInput: Document | ShadowRoot =
        rootNode instanceof Document || rootNode instanceof ShadowRoot ? rootNode : document;

      if (inputField.id) {
        const found = rootForInput.querySelector(`label[for="${inputField.id}"]`);
        if (found instanceof HTMLLabelElement || found instanceof HTMLElement) {
          label = found;
        }
      }

      if (!label) {
        label = inputField.closest('label');
      }

      if (!label) {
        const container = inputField.closest('div, fieldset, section, form');
        if (container) {
          const found = container.querySelector('label');
          if (found instanceof HTMLLabelElement) label = found;
        }
      }

      if (!label && inputField.getAttribute('aria-labelledby')) {
        const labelId = inputField.getAttribute('aria-labelledby') as string;
        const byId =
          'getElementById' in rootForInput && typeof rootForInput.getElementById === 'function'
            ? rootForInput.getElementById(labelId)
            : null;
        const byQuery = byId
          ? null
          : rootForInput.querySelector(`#${CSS.escape(labelId)}`);
        const found = byId ?? byQuery;
        if (found instanceof HTMLElement) label = found;
      }

      if (!label && placeholder) {
        labelText = placeholder.trim();
      }

      if (!label && !labelText) {
        const container = inputField.closest('div, fieldset, section');
        if (container) {
          const textElements = container.querySelectorAll(
            'span[aria-hidden="true"], span:not(.visually-hidden), div, p, h1, h2, h3, h4, h5, h6',
          );
          for (const textEl of textElements) {
            const text = textEl.textContent?.trim();
            if (
              text &&
              text.length > 0 &&
              text.length < 200 &&
              !text.includes('http') &&
              !text.includes('data-')
            ) {
              labelText = text;
              break;
            }
          }
        }
      }

      if (label) {
        const ariaHiddenSpan = label.querySelector('span[aria-hidden="true"]');
        if (ariaHiddenSpan) {
          labelText = ariaHiddenSpan.textContent?.trim() || '';
        } else {
          const innerText =
            'innerText' in label ? (label as HTMLElement).innerText : '';
          labelText = innerText?.trim() || label.textContent?.trim() || '';
        }
      }

      if (labelText) {
        labelText = labelText.replace(/[*()]/g, '').trim();
      }

      if (!labelText || labelText.length < 2) continue;

      const isAutocompleteField =
        'matches' in inputField &&
        typeof inputField.matches === 'function' &&
        inputField.matches('[role="combobox"]');

      if ('type' in inputField && inputField.type === 'checkbox') {
        await handleCheckboxField(inputField as HTMLInputElement, labelText);
        continue;
      }

      let foundConfig = result.find((config) => config.placeholderIncludes === labelText);

      if (!foundConfig && result && result.length > 0) {
        const placeholders = result.map((config) => config.placeholderIncludes);
        const bestMatchPlaceholder = findBestMatch({
          array: placeholders,
          searchString: labelText,
          threshold: 0.5,
        });
        if (bestMatchPlaceholder) {
          foundConfig = result.find(
            (config) => config.placeholderIncludes === bestMatchPlaceholder,
          );
        }
      }

      if (foundConfig && foundConfig.defaultValue) {
        if (isAutocompleteField) {
          await fillAutocompleteField(inputField as HTMLInputElement, foundConfig.defaultValue);
        } else {
          setNativeValue(inputField, foundConfig.defaultValue);
          if (
            inputField instanceof HTMLInputElement ||
            inputField instanceof HTMLTextAreaElement
          ) {
            await performFillForm(inputField);
          }
        }
        continue;
      }

      const defaults = await defaultFieldsStorage.getValue();
      const defaultsRecord = defaults as unknown as Record<string, string>;
      if (defaults && Object.keys(defaultsRecord).length > 0) {
        const valueFromDefault = findClosestField(defaultsRecord, labelText);
        if (!valueFromDefault) {
          const inputFieldConfigsArray = await inputFieldConfigsStorage.getValue();
          if (
            Array.isArray(inputFieldConfigsArray) &&
            inputFieldConfigsArray.length > 0
          ) {
            const inputFieldConfigsObj = inputFieldConfigsArray.reduce<
              Record<string, string>
            >((acc, { placeholderIncludes, defaultValue }) => {
              acc[placeholderIncludes] = defaultValue;
              return acc;
            }, {});
            const valueFromConfigs = findClosestField(inputFieldConfigsObj, labelText);
            if (valueFromConfigs) {
              if (isAutocompleteField) {
                await fillAutocompleteField(
                  inputField as HTMLInputElement,
                  valueFromConfigs,
                );
              } else {
                setNativeValue(inputField, valueFromConfigs);
              }
            }
          }
        } else if (isAutocompleteField) {
          await fillAutocompleteField(inputField as HTMLInputElement, valueFromDefault);
        } else {
          setNativeValue(inputField, valueFromDefault);
        }
      }

      const currentValue =
        'value' in inputField ? (inputField as HTMLInputElement).value : '';
      if (!currentValue) {
        await sendMessage('updateInputFieldConfigsInStorage', labelText);
        if (!foundConfig && currentValue && currentValue.trim() !== '') continue;
        setNativeValue(inputField, '');
        if (
          inputField instanceof HTMLInputElement ||
          inputField instanceof HTMLTextAreaElement
        ) {
          await performFillForm(inputField);
        }
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.trace('performInputField not completed: ' + message);
  }
}

export async function performRadioButtonChecks(context: FormContext = document): Promise<void> {
  const storedRadioButtons: RadioButtonConfig[] = await radioButtonsStorage.getValue();

  const radioFieldsets = context.querySelectorAll(
    'fieldset[data-test-form-builder-radio-button-form-component="true"]',
  );

  for (const fieldset of radioFieldsets) {
    const legendElement = fieldset.querySelector('legend');
    const questionTextElement = legendElement?.querySelector('span[aria-hidden="true"]');
    const placeholderText =
      questionTextElement?.textContent?.trim() ||
      legendElement?.textContent?.trim() ||
      '';

    const storedRadioButtonInfo = storedRadioButtons.find(
      (info) => info.placeholderIncludes === placeholderText,
    );

    if (storedRadioButtonInfo) {
      const radioButtonWithValue = fieldset.querySelector(
        `input[type="radio"][value="${storedRadioButtonInfo.defaultValue}"]`,
      );
      if (radioButtonWithValue instanceof HTMLInputElement) {
        radioButtonWithValue.checked = true;
        radioButtonWithValue.dispatchEvent(new Event('change', { bubbles: true }));
        await addDelay(500);
      }
      storedRadioButtonInfo.count++;
      if (!storedRadioButtonInfo.createdAt) {
        storedRadioButtonInfo.createdAt = Date.now();
      }
    } else {
      const firstRadioButton = fieldset.querySelector('input[type="radio"]');
      if (firstRadioButton instanceof HTMLInputElement) {
        firstRadioButton.checked = true;
        firstRadioButton.dispatchEvent(new Event('change', { bubbles: true }));
        await addDelay(500);

        const options: RadioOption[] = Array.from(
          fieldset.querySelectorAll('input[type="radio"]'),
        ).map((radioButton) => {
          const radio = radioButton as HTMLInputElement;
          const labelElement = fieldset.querySelector(`label[for="${radio.id}"]`);
          let text = labelElement?.textContent?.trim();

          if (!text) {
            const parentElement = radio.parentElement;
            const textElement =
              parentElement?.querySelector('span') || parentElement?.querySelector('div');
            text = textElement?.textContent?.trim() || radio.value;
          }

          return {
            value: radio.value,
            text,
            selected: radio.checked,
          };
        });

        const newRadioButtonInfo: RadioButtonConfig = {
          placeholderIncludes: placeholderText,
          defaultValue: firstRadioButton.value,
          count: 1,
          options,
          createdAt: Date.now(),
        };

        storedRadioButtons.push(newRadioButtonInfo);
        await radioButtonsStorage.setValue(storedRadioButtons);
      }
    }
  }

  await radioButtonsStorage.setValue(storedRadioButtons);
}

export async function performDropdownChecks(context: FormContext = document): Promise<void> {
  const storedDropdowns: DropdownConfig[] = await dropdownsStorage.getValue();

  const dropdowns = context.querySelectorAll('.fb-dash-form-element select');
  dropdowns.forEach((rawDropdown, index) => {
    const dropdown = rawDropdown as HTMLSelectElement;
    const parentElement = dropdown.closest('.fb-dash-form-element');
    if (!parentElement) return;

    const labelElement = parentElement.querySelector('label');
    let labelText: string | null = null;
    if (labelElement) {
      const ariaHiddenSpan = labelElement.querySelector('span[aria-hidden="true"]');
      labelText = ariaHiddenSpan?.textContent?.trim() ?? null;
      if (!labelText) {
        labelText = (labelElement as HTMLElement).innerText.trim();
      }
    }
    labelText = labelText || `Dropdown ${index}`;

    const secondOption = dropdown.options[1];
    if (secondOption && dropdown.selectedIndex < 1) {
      secondOption.selected = true;
      dropdown.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const options = Array.from(dropdown.options).map((option) => ({
      value: option.value,
      text: option.textContent?.trim() ?? '',
      selected: option.selected,
    }));

    const storedDropdownInfo = storedDropdowns.find(
      (info) => info.placeholderIncludes === labelText,
    );

    if (storedDropdownInfo) {
      const selectedValue = storedDropdownInfo.options.find((option) => option.selected)?.value;
      Array.from(dropdown.options).forEach((option) => {
        option.selected = option.value === selectedValue;
      });
      dropdown.dispatchEvent(new Event('change', { bubbles: true }));
      storedDropdownInfo.count = (storedDropdownInfo.count ?? 0) + 1;
    } else {
      const newDropdownInfo: DropdownConfig = {
        placeholderIncludes: labelText,
        count: 1,
        options: options.map((option) => ({
          value: option.value,
          text: option.text,
          selected: option.selected,
        })),
      };
      storedDropdowns.push(newDropdownInfo);
    }
  });

  void dropdownsStorage.setValue(storedDropdowns);
}

export async function performCheckBoxFieldCityCheck(
  context: FormContext = document,
): Promise<void> {
  const checkboxFieldsets = context.querySelectorAll(
    'fieldset[data-test-checkbox-form-component="true"]',
  );
  for (const fieldset of checkboxFieldsets) {
    const firstCheckbox = fieldset.querySelector('input[type="checkbox"]');
    if (firstCheckbox instanceof HTMLInputElement) {
      firstCheckbox.checked = true;
      firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      await addDelay(500);
    }
  }
}

export async function performUniversalCheckboxChecks(
  context: FormContext = document,
): Promise<void> {
  try {
    const checkboxSelectors = [
      'input[type="checkbox"]',
      '[data-test-text-selectable-option] input[type="checkbox"]',
      '[data-test-text-selectable-option__input]',
    ];

    const allCheckboxesSet = new Set<HTMLInputElement>();
    for (const selector of checkboxSelectors) {
      const checkboxes = context.querySelectorAll(selector);
      for (const cb of checkboxes) {
        if (cb instanceof HTMLInputElement) allCheckboxesSet.add(cb);
      }
    }

    for (const checkbox of allCheckboxesSet) {
      if (checkbox.type !== 'checkbox') continue;

      let labelText = '';

      if (checkbox.id) {
        const label = context.querySelector(`label[for="${checkbox.id}"]`);
        if (label) labelText = label.textContent?.trim() || '';
      }

      if (!labelText) {
        const dataTestLabel = checkbox.getAttribute(
          'data-test-text-selectable-option__input',
        );
        if (dataTestLabel) labelText = dataTestLabel.replace(/&amp;/g, '&').trim();
      }

      if (!labelText) {
        const closestLabel = checkbox
          .closest('div, span, fieldset')
          ?.querySelector('label');
        if (closestLabel) labelText = closestLabel.textContent?.trim() || '';
      }

      if (!labelText) {
        labelText = checkbox.getAttribute('aria-label') || '';
      }

      if (!labelText) {
        const container = checkbox.closest('div, span, fieldset');
        if (container) {
          const textNodes = container.querySelectorAll('span, div, label, p');
          for (const node of textNodes) {
            const text = node.textContent?.trim();
            if (text && text.length > 2 && text.length < 200) {
              labelText = text;
              break;
            }
          }
        }
      }

      if (labelText && labelText.length > 1) {
        await handleCheckboxField(checkbox, labelText);
      }
    }
  } catch (error) {
    aaError('Error in performUniversalCheckboxChecks', error);
  }
}

export async function runValidations(
  state: ContentRunState,
  modalOverride: HTMLElement | null = null,
): Promise<void> {
  try {
    const saveModalHandled = await handleSaveApplicationModal(state);
    if (saveModalHandled) return;

    await validateAndCloseConfirmationModal();

    const artdecoModal = document.querySelector('.artdeco-modal');
    const fallbackArtdeco =
      artdecoModal instanceof HTMLElement ? artdecoModal : null;
    const applyModal: FormContext =
      modalOverride || findSduiApplyModal() || fallbackArtdeco || document;

    await performInputFieldChecks(applyModal);
    await performUniversalCheckboxChecks(applyModal);
    await performRadioButtonChecks(applyModal);
    await performDropdownChecks(applyModal);
    await performCheckBoxFieldCityCheck(applyModal);
    await handleSaveApplicationModal(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    aaError('Error in runValidations, continuing...', message);
  }
}

export async function uncheckFollowCompany(): Promise<void> {
  let followCheckbox: HTMLInputElement | null = null;
  const main = document.querySelector('#follow-company-checkbox');
  if (main instanceof HTMLInputElement) followCheckbox = main;

  if (!followCheckbox) {
    const host = document.querySelector('[data-testid="interop-shadowdom"]');
    const sr = (host as HTMLElement & { shadowRoot?: ShadowRoot } | null)?.shadowRoot ?? null;
    const fromShadow = sr?.querySelector('#follow-company-checkbox');
    if (fromShadow instanceof HTMLInputElement) followCheckbox = fromShadow;
  }

  if (!followCheckbox) {
    const start = Date.now();
    while (Date.now() - start < 3000) {
      const found = document.querySelector('#follow-company-checkbox');
      if (found instanceof HTMLInputElement && isElementVisible(found)) {
        followCheckbox = found;
        break;
      }
      await addDelay(100);
    }
  }

  if (followCheckbox?.checked) {
    try {
      followCheckbox.scrollIntoView({ block: 'center' });
    } catch {
      // ignore scrollIntoView failures from detached nodes
    }
    await addDelay(300);
    followCheckbox.click();
    await addDelay(300);
    aaLog('uncheckFollowCompany', 'Follow checkbox toggled', {
      nowChecked: followCheckbox.checked,
    });
  }
}

export async function selectCvFile(
  applyModal: HTMLElement | Document,
  jobTitle: string,
): Promise<void> {
  try {
    const attachmentElements = applyModal.querySelectorAll('.ui-attachment');
    if (!attachmentElements || attachmentElements.length === 0) return;

    const moreResumesButtonXpath = `//button[
		    contains(
		      translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),
		      'more resumes'
		    )
	    ]`;
    const resumeButton = getVisibleElementByXPath({ xpath: moreResumesButtonXpath });
    if (resumeButton) {
      resumeButton.click();
      await addDelay(1000);
    }

    const [cvFiles, selectedCvId, smartSelectEnabled, selectedCvFileFilters] =
      await Promise.all([
        cvFilesStorage.getValue(),
        selectedCvFileStorage.getValue(),
        smartSelectEnabledStorage.getValue(),
        selectedCvFileFiltersStorage.getValue(),
      ]);

    if (!selectedCvId) return;
    if (!cvFiles || !Array.isArray(cvFiles) || cvFiles.length === 0) return;

    let targetCvName: string | null = null;

    if (smartSelectEnabled && jobTitle) {
      const cvFileNames = cvFiles
        .map((f) => f.name)
        .filter((name): name is string => Boolean(name && name.trim()));
      if (cvFileNames.length > 0) {
        const filtersUsable =
          selectedCvFileFilters &&
          typeof selectedCvFileFilters === 'object' &&
          Object.values(selectedCvFileFilters).some(
            (value) => Array.isArray(value) && value.length > 0,
          );
        const bestMatch = findBestMatch({
          array: cvFileNames,
          searchString: jobTitle,
          exactMatchData: filtersUsable ? selectedCvFileFilters : null,
        });
        if (bestMatch) targetCvName = bestMatch.toLowerCase().trim();
      }
    }

    if (!targetCvName) {
      const selectedFile = cvFiles.find((f) => f.id === selectedCvId);
      if (!selectedFile || !selectedFile.name) return;
      targetCvName = selectedFile.name.toLowerCase().trim();
    }

    for (const attachmentElement of attachmentElements) {
      const h3Element = attachmentElement.querySelector(
        'h3.jobs-document-upload-redesign-card__file-name',
      );
      if (!h3Element) continue;

      const cvFileName = h3Element.textContent?.toLowerCase().trim() ?? '';
      if (cvFileName.includes(targetCvName)) {
        const isAlreadySelected =
          attachmentElement.classList.contains(
            'jobs-document-upload-redesign-card__container--selected',
          ) ||
          attachmentElement.getAttribute('aria-label')?.toLowerCase() === 'selected';

        if (isAlreadySelected) return;

        if (attachmentElement instanceof HTMLElement) {
          attachmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await addDelay(300);
          attachmentElement.click();
          await addDelay(500);
        }
        return;
      }
    }
  } catch (error) {
    aaError('Error in selectCvFile:', error);
  }
}

export async function checkForFormValidationError(): Promise<boolean> {
  const feedbackMessageElement = document.querySelector('.artdeco-inline-feedback__message');
  if (!feedbackMessageElement) return false;

  const textContent = feedbackMessageElement.textContent || '';
  const lowerText = textContent.toLowerCase();

  if (
    lowerText.includes('applied') &&
    (lowerText.includes('ago') ||
      lowerText.includes('minutes') ||
      lowerText.includes('hours') ||
      lowerText.includes('days'))
  ) {
    return false;
  }

  if (lowerText.includes('exceeded') && lowerText.includes('limit')) {
    return false;
  }

  const validationErrors = [
    'required',
    'must',
    'invalid',
    'error',
    'cannot',
    'please',
    'field',
  ];
  return validationErrors.some((error) => lowerText.includes(error));
}
