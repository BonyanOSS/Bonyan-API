/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { SurahWithAyaItem } from '../src/types/Items';
import { getAyatContent } from '../src/modules/ayat/ayat.service';
import { clearCache } from '../src/utils/cache';
import { SURAH_METADATA, absoluteAyaNumber } from '../src/modules/surah/surah.metadata';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
});

describe('Ayat Service', () => {
    it('getAyatContent calls ayatApis and returns typed data', async () => {
        const mockData = {
            data: {
                edition: { identifier: 'quran-uthmani', type: 'quran' },
                surahs: SURAH_METADATA.map((s) => ({
                    number: s.id,
                    name: s.name,
                    ayahs: Array.from({ length: s.ayahCount }, (_, i) => ({
                        number: absoluteAyaNumber(s.id, i + 1),
                        numberInSurah: i + 1,
                        text: 'نص اختبار',
                    })),
                })),
            },
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        const result: { surahs: SurahWithAyaItem[] } = await getAyatContent();
        expect(result.surahs[0].name).toBe('الفاتحة');
        expect(result.surahs[0].number).toBe(1);
    });
});
