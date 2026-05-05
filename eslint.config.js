import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'node_modules/**',
      '.output/**',
      '.wxt/**',
      'coverage/**',
      'components/ui/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
        defineBackground: 'readonly',
        defineContentScript: 'readonly',
        defineUnlistedScript: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Date: 'readonly',
        Promise: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
        Boolean: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        JSON: 'readonly',
        Error: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        Node: 'readonly',
        NodeListOf: 'readonly',
        MutationObserver: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
