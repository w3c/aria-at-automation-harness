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
      // TODO: Remove these exceptions once TypeScript conversion happens
      'no-empty': 'warn',
      'no-unused-vars': 'warn',
    },
  },
];
