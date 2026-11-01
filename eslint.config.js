import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/', 'app/js/vendor/'] },
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
        files: ['app/js/parsers/*Worker.js', 'app/service-worker.js'],
        languageOptions: { globals: { ...globals.worker, ...globals.serviceworker } },
    },
    {
        files: ['*.config.js'],
        languageOptions: { globals: { ...globals.node } },
    },
];
