/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { ReciterItem } from '../src/types/Items';
import { getRadioContent } from '../src/modules/reciters/reciters.service';
import { clearCache } from '../src/utils/cache';
import snapshot from '../src/modules/reciters/reciters.snapshot.json';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
});

describe('Reciters Service', () => {
    it('getRadioContent calls reciterApis and returns typed data', async () => {
        const mockData = snapshot;

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        const result: { reciters: ReciterItem[] } = await getRadioContent();
        expect(result.reciters[0].name).toBe('إبراهيم الأخضر');
        expect(result.reciters[0].id).toBe(1);
    });
});
