// Linting, as in SureA11y/core: ESLint's recommended rules, with Prettier
// for layout. The WordPress plugin's scripts follow WordPress's own layout
// (tabs, spaces inside parentheses), so Prettier leaves them alone, but
// ESLint still checks them.
import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['**/node_modules/**', 'plugins/*/build/**', 'prototypes/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-useless-assignment': 'error'
    }
  },
  {
    // Plain scripts on WordPress's globals.
    files: ['plugins/wordpress/src/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } }
  },
  prettierConfig
];
