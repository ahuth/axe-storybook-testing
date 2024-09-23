const globals = require('globals');
const js = require('@eslint/js');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const react = require('eslint-plugin-react');
const typescriptEslint = require('typescript-eslint');
const vitest = require('eslint-plugin-vitest');

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  {
    ignores: ['**/storybook-static/', '**/build/'],
  },
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  prettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-prototype-builtins': 'off',
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.test.*'],
    ...vitest.configs.recommended,
  },
  {
    files: ['demo/**/*.{js,jsx,ts,tsx}'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
