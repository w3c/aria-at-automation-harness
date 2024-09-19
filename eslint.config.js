import globals from 'globals';
import js from '@eslint/js';
import eslintConfigEslint from 'eslint-config-eslint';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...eslintConfigEslint.rules,
      'no-empty': 'off',
      // TODO: Remove this once TypeScript conversion happens
      'no-unused-vars': 'warn',
    },
  },
];
