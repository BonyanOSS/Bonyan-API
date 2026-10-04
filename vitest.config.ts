/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ['tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
        },
    },
});
