import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/out-tsc/**', '**/obj/**', '**/.angular/**', '**/coverage/**'],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...eslint.configs.recommended,
    languageOptions: {
      sourceType: 'commonjs',
      globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly', __dirname: 'readonly' },
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module' },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@angular-eslint': angular,
      '@angular-eslint/template': angularTemplate,
    },
    processor: angularTemplate.processors['extract-inline-html'],
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.eslintRecommended.rules,
      // Keep this initial gate focused on probable runtime errors, rather than a style migration.
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      '@angular-eslint/contextual-lifecycle': 'error',
      '@angular-eslint/no-conflicting-lifecycle': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/no-output-rename': 'error',
    },
  },
  {
    files: ['src/app/**/*.html'],
    languageOptions: { parser: angularTemplateParser },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-duplicate-attributes': ['error', { allowStylePrecedenceDuplicates: true }],
      '@angular-eslint/template/valid-aria': 'error',
    },
  },
];
