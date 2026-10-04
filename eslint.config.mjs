import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import header from 'eslint-plugin-simple-header';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                sourceType: 'module',
            },
        },
        plugins: {
            prettier,
            'simple-header': header,
        },
        rules: {
            'prettier/prettier': 'error',
            'no-console': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'simple-header/header': [
                'error',
                {
                    files: ['scripts/header.txt'],
                    templates: {
                        author: ['.*', 'BonyanOSS'],
                    },
                },
            ],
        },
    },
    {
        files: ['tests/**/*.ts', 'scripts/**/*.ts', 'vitest.config.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: null,
            },
        },
    },
];
