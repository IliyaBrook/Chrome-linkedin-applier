import '@testing-library/jest-dom/vitest';
import { fakeBrowser } from 'wxt/testing';
import { afterEach } from 'vitest';

afterEach(() => {
  fakeBrowser.reset();
});
