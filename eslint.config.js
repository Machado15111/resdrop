import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
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
    plugins: { react },
    rules: {
      // Core no-undef does not see JSX element names, so a component used as
      // <Thing /> without an import passes lint and vite build alike and only
      // fails when that branch renders. These two teach eslint to read JSX:
      // jsx-no-undef catches the missing import, jsx-uses-vars stops a used
      // component from being reported as an unused one.
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      // Only SCREAMING_CASE constants are exempt from the unused check now —
      // an unused <Component> import is exactly what this should catch.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z][A-Z0-9_]*$', argsIgnorePattern: '^_' }],
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
