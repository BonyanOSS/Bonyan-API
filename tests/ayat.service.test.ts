/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { SurahWithAyaItem } from '../src/types/Items';
import { getAyatContent, fetchWithFallback } from '../src/modules/ayat/ayat.service';
import { clearCache } from '../src/utils/cache';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
});

describe('Ayat Service', () => {
    it('fetchWithFallback returns first successful API result', async () => {
        const fakeApi1: () => Promise<number[]> = vi.fn().mockRejectedValue(new Error('fail1'));
        const fakeApi2: () => Promise<number[]> = vi.fn().mockResolvedValue([1, 2, 3]);

        const result = await fetchWithFallback([fakeApi1, fakeApi2]);
        expect(result).toEqual([1, 2, 3]);
        expect(fakeApi1).toHaveBeenCalledTimes(1);
        expect(fakeApi2).toHaveBeenCalledTimes(1);
    });

    it('getAyatContent calls ayatApis and returns typed data', async () => {
        const mockData = {
            data: {
                surahs: [
                    {
                        number: 1,
                        name: 'Test',
                        ayahs: [],
                    },
                ],
            },
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        const result: { surahs: SurahWithAyaItem[] } = await getAyatContent();
        expect(result.surahs[0].name).toBe('Test');
        expect(result.surahs[0].number).toBe(1);
    });
});
