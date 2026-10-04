/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { SurahItem } from '../src/types/Items';
import { getSurahContent } from '../src/modules/surah/surah.service';
import { clearCache } from '../src/utils/cache';
import { SURAH_METADATA } from '../src/modules/surah/surah.metadata';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCache();
    vi.restoreAllMocks();
});

describe('Surah Service', () => {
    it('getSurahContent calls surahApis and returns typed data', async () => {
        const mockData = {
            suwar: SURAH_METADATA.map((s) => ({ id: s.id, name: s.name, makkia: Number(s.makkia) })),
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        const result: { surah: SurahItem[] } = await getSurahContent();
        expect(result.surah[0].name).toBe('الفاتحة');
        expect(result.surah[0].id).toBe(1);
    });
});
