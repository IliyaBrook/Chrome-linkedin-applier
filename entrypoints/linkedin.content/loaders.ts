import { addDelay, isElementVisible } from './dom-utils';

export async function waitForLoaderToDisappear(timeout = 15000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const loaders = document.querySelectorAll('[class*="loader"]');
    let hasVisibleLoader = false;

    for (const loader of loaders) {
      if (isElementVisible(loader)) {
        hasVisibleLoader = true;
        break;
      }
    }

    if (!hasVisibleLoader) return true;
    await addDelay(500);
  }
  return false;
}

export async function waitForJobsLoaderToDisappear(timeout = 15000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
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

    if (!hasVisibleJobsLoader) return true;
    await addDelay(500);
  }
  return false;
}

export async function toggleBlinkingBorder(element: HTMLElement | null): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!element) {
      resolve();
      return;
    }
    let count = 0;
    const intervalId = setInterval(async () => {
      element.style.border = count % 2 === 0 ? '2px solid red' : 'none';
      count++;
      if (count === 10) {
        clearInterval(intervalId);
        await waitForLoaderToDisappear();
        await waitForJobsLoaderToDisappear();
        element.style.border = 'none';
        resolve();
      }
    }, 500);
  });
}
