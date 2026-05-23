import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [WxtVitest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.output', '.wxt'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        '.output/',
        '.wxt/',
        '**/*.config.*',
        '**/*.test.*',
        'tests/setup.ts',
        'components/ui/**',
      ],
    },
  },
});
