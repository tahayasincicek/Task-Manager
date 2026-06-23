/**
 * Root ESLint configuration — Task Manager.
 * Same config is reused across analysis stages for comparable results.
 *
 * Scope:
 *   - Backend TypeScript under src/
 *   - Client (React) under client/src/ inherits from the client override block
 *   - node_modules, dist, build, coverage, reports are ignored
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    'node_modules/',
    'node_modules_old/',
    'dist/',
    'build/',
    'coverage/',
    'reports/',
    'data/',
    'client/dist/',
    'client/node_modules/',
    '*.config.js',
    '*.config.ts',
    '*.config.cjs',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    'no-console': 'off',
    'eqeqeq': ['warn', 'smart'],
    'prefer-const': 'warn',
    'no-var': 'error',
  },
  overrides: [
    {
      files: ['client/src/**/*.{ts,tsx,jsx}'],
      env: {
        browser: true,
        node: false,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint', 'react', 'react-hooks'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react/jsx-runtime',
      ],
      settings: {
        react: { version: 'detect' },
      },
      rules: {
        'react/prop-types': 'off',
      },
    },
    {
      files: ['tests/**/*.{ts,tsx}'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
