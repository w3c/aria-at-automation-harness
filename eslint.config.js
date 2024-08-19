import globals from 'globals';

export default [
  { files: ['**/*.{js,mjs,cjs}'] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
];
