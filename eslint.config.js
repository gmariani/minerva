import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['dist/', 'app/src/vendor/'] },
    js.configs.recommended,
    {
        files: ['app/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-useless-assignment': 'warn',
            'no-prototype-builtins': 'off',
            'preserve-caught-error': 'off',
        },
    },
    {
        files: ['app/src/sol/*Worker.js', 'app/service-worker.js'],
        languageOptions: { globals: { ...globals.worker, ...globals.serviceworker } },
    },
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['app/src/**/*.{ts,tsx}'] })),
    {
        files: ['app/src/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        languageOptions: { globals: { ...globals.browser } },
        rules: {
            ...reactHooks.configs.recommended.rules,
        },
    },
    {
        files: ['*.config.js', 'tools/**/*.mjs'],
        languageOptions: { globals: { ...globals.node } },
    },
];
