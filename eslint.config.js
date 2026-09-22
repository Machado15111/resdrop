import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist/subprojects/worktrees are build output or unrelated code.
  globalIgnores(['dist', 'public', 'agents', 'docs', 'voyu', 'DROV', 'Coffeetip', 'marketing', '.claude', 'server/node_modules']),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // React Compiler opinions: keep visible as warnings (a lot of pre-existing
      // instances), but don't block CI. Real correctness rules stay as errors.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // The server used to be skipped entirely. That is how `API_MODE is not
    // defined` survived the route extraction and killed POST /api/bookings:
    // nothing checked that a moved handler still had its identifiers in scope.
    // no-undef is the rule that catches it, so it stays an error.
    files: ['server/**/*.js', 'server/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'error',
      'no-unreachable': 'error',
      // Pre-existing noise in the extraction regexes; not worth touching 60+
      // live patterns in a correctness pass.
      'no-useless-escape': 'warn',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
])
