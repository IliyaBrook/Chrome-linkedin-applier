export const aaLog: (...args: unknown[]) => void = console.log.bind(
  console,
  '[AutoApply]',
);
export const aaWarn: (...args: unknown[]) => void = console.warn.bind(
  console,
  '[AutoApply]',
);
export const aaError: (...args: unknown[]) => void = console.error.bind(
  console,
  '[AutoApply]',
);

export async function addDelay(delay = 1000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), delay);
  });
}

export function captureDebugHtml(
  element: Element | Document | null | undefined,
): string | null {
  if (!element) return null;
  try {
    if (element instanceof Element) return element.outerHTML;
    if (element instanceof Document) return element.documentElement.outerHTML;
  } catch {
    return null;
  }
  return null;
}

export function isElementVisible(element: Element | null | undefined): boolean {
  if (!element) return false;
  if (!(element instanceof HTMLElement)) return false;
  const cs = getComputedStyle(element);
  return (
    element.offsetParent !== null &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0 &&
    cs.visibility !== 'hidden' &&
    cs.display !== 'none'
  );
}

export type XPathContext = Document | Element | ShadowRoot;

export function getVisibleElementByXPath({
  xpath,
  context = document,
}: {
  xpath: string;
  context?: XPathContext;
}): HTMLElement | null {
  const result = document.evaluate(
    xpath,
    context,
    null,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    null,
  );

  let node = result.iterateNext();
  while (node) {
    if (node instanceof HTMLElement && isElementVisible(node)) {
      return node;
    }
    node = result.iterateNext();
  }
  return null;
}

export function getElementsByXPath({
  xpath,
  context = document,
}: {
  xpath: string;
  context?: XPathContext;
}): HTMLElement[] {
  const result = document.evaluate(
    xpath,
    context,
    null,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    null,
  );

  const elements: HTMLElement[] = [];
  let node = result.iterateNext();
  while (node) {
    if (node instanceof HTMLElement) elements.push(node);
    node = result.iterateNext();
  }
  return elements;
}

export type ElementOrSelector = string | Element | Element[];
export type WaitContext =
  | Document
  | Element
  | ShadowRoot
  | (Document | Element | ShadowRoot)[];

export async function waitForElements({
  elementOrSelector,
  timeout = 5000,
  contextNode = document,
}: {
  elementOrSelector: ElementOrSelector;
  timeout?: number;
  contextNode?: WaitContext;
}): Promise<Element[]> {
  return new Promise((resolve) => {
    try {
      const startTime = Date.now();

      const intervalId = setInterval(() => {
        let elements: Element[] = [];

        if (typeof elementOrSelector === 'string') {
          if (Array.isArray(contextNode)) {
            for (const node of contextNode) {
              if (
                node instanceof Element ||
                node instanceof Document ||
                node instanceof ShadowRoot
              ) {
                elements.push(
                  ...Array.from(node.querySelectorAll(elementOrSelector)),
                );
              }
            }
          } else {
            elements = Array.from(contextNode.querySelectorAll(elementOrSelector));
          }
        } else if (elementOrSelector instanceof Element) {
          elements = [elementOrSelector];
        } else if (Array.isArray(elementOrSelector)) {
          elements = elementOrSelector.filter((el) => el instanceof Element);
        } else {
          clearInterval(intervalId);
          resolve([]);
          return;
        }

        const visibleElements: Element[] = [];
        for (const el of elements) {
          if (
            el instanceof HTMLElement &&
            el.offsetParent !== null &&
            el.isConnected
          ) {
            visibleElements.push(el);
          }
        }

        if (visibleElements.length > 0) {
          clearInterval(intervalId);
          resolve(visibleElements);
          return;
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(intervalId);
          resolve([]);
        }
      }, 100);
    } catch {
      console.trace('Error in waitForElements');
      resolve([]);
    }
  });
}

export async function clickElement({
  elementOrSelector,
  timeout = 5000,
  contextNode = document,
}: {
  elementOrSelector: ElementOrSelector;
  timeout?: number;
  contextNode?: Document | Element | ShadowRoot;
}): Promise<Element | null> {
  try {
    let element: Element | undefined;

    if (typeof elementOrSelector === 'string') {
      const elements = await waitForElements({
        elementOrSelector,
        timeout,
        contextNode,
      });
      element = elements[0];
      if (!element) {
        console.trace('log', 'No element found for selector: ' + elementOrSelector);
        return null;
      }
    } else if (elementOrSelector instanceof Element) {
      element = elementOrSelector;
    } else {
      console.trace('log', 'Argument must be a selector string or a DOM Element.');
      return null;
    }

    if (!(element instanceof HTMLElement)) return null;
    if (element.offsetParent === null || !element.isConnected) {
      console.log('Element is not visible or not connected, skipping click');
      return null;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await addDelay(800);
    element.click();
    return element;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.trace('Element is not clickable:' + message);
    return null;
  }
}

export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    throw new Error('Unable to set value');
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function fillAutocompleteField(
  element: HTMLInputElement,
  value: string,
): Promise<void> {
  element.focus();
  await addDelay(100);
  setNativeValue(element, value);
  await addDelay(300);

  let dropdownContainer: Element | null = null;

  const dropdownId =
    element.getAttribute('aria-controls') || element.getAttribute('aria-owns');
  if (dropdownId) {
    dropdownContainer = document.getElementById(dropdownId);
  }

  const isVisible = (el: Element | null): boolean =>
    !!el && el instanceof HTMLElement && el.offsetHeight > 0;

  if (!dropdownContainer || !isVisible(dropdownContainer)) {
    const searchContainers: (Element | Document | null)[] = [
      element.closest('div'),
      element.parentElement,
      document.body,
    ];

    const dropdownSelectors = [
      '[role="listbox"]',
      '.basic-typeahead__selectable',
      '.search-typeahead-v2__results',
      '.typeahead-results',
      '[data-test-single-typeahead-entity-form-search-result]',
      '.dropdown-menu',
      '.suggestions',
      '.autocomplete-dropdown',
    ];

    for (const searchContainer of searchContainers) {
      if (!searchContainer) continue;
      for (const selector of dropdownSelectors) {
        const found = searchContainer.querySelector(selector);
        if (
          found &&
          (isVisible(found) || found.querySelector('[role="option"]'))
        ) {
          dropdownContainer = found;
          console.log(
            `[AUTOCOMPLETE] Found dropdown with selector: ${selector}`,
          );
          break;
        }
      }
      if (dropdownContainer) break;
    }

    if (!dropdownContainer) {
      await addDelay(200);

      const fallbackSelectors = [
        '[role="listbox"]:not([style*="display: none"])',
        '.basic-typeahead__selectable',
        '.search-typeahead-v2__results [role="option"]',
        '[data-test-single-typeahead-entity-form-search-result]',
        '.search-typeahead-v2__hit',
      ];

      for (const selector of fallbackSelectors) {
        const foundDropdown = document.querySelector(selector);
        if (
          foundDropdown &&
          (isVisible(foundDropdown) || foundDropdown.closest('[role="listbox"]'))
        ) {
          dropdownContainer =
            foundDropdown.closest('[role="listbox"]') ||
            foundDropdown.parentElement ||
            foundDropdown;
          console.log(
            `[AUTOCOMPLETE] Found dropdown with selector: ${selector}`,
          );
          break;
        }
      }
    }
  }

  if (dropdownContainer) {
    const optionSelectors = [
      '[role="option"]',
      '.basic-typeahead__selectable',
      '[data-test-single-typeahead-entity-form-search-result]',
      '.search-typeahead-v2__hit',
      '.typeahead-option',
      '.dropdown-item',
      '.suggestion-item',
      'li',
      'div[data-testid]',
      'div[data-test]',
    ];

    let firstOption: HTMLElement | null = null;
    for (const selector of optionSelectors) {
      const options = dropdownContainer.querySelectorAll(selector);
      if (options.length > 0) {
        for (const option of options) {
          if (
            option instanceof HTMLElement &&
            option.offsetParent !== null &&
            option.textContent?.trim()
          ) {
            firstOption = option;
            break;
          }
        }
        if (firstOption) {
          console.log(
            `[AUTOCOMPLETE] Found options with selector: ${selector}`,
          );
          break;
        }
      }
    }

    if (firstOption) {
      console.log(
        '[AUTOCOMPLETE] Found first option:',
        firstOption.textContent?.trim(),
      );
      try {
        firstOption.scrollIntoView({ block: 'nearest' });
        await addDelay(100);
        firstOption.click();
        console.log('[AUTOCOMPLETE] Successfully clicked option');
        await addDelay(300);
      } catch (e) {
        console.error(
          `[AUTOCOMPLETE] Error clicking on option for ${element.id}:`,
          e,
        );
        try {
          firstOption.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await addDelay(100);
          firstOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          console.log('[AUTOCOMPLETE] Fallback click successful');
        } catch (fallbackError) {
          console.error('[AUTOCOMPLETE] Fallback click also failed:', fallbackError);
        }
      }
    } else {
      console.log('[AUTOCOMPLETE] No clickable options found in dropdown');
    }
  } else {
    console.log('[AUTOCOMPLETE] No dropdown container found or not visible');
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
  await addDelay(100);
  element.blur();
  await addDelay(100);
}
