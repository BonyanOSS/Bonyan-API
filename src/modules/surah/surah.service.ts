/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { ApiFunction, Mp3QuranSurahResponse, AlQuranSurahResponse, QuranComChaptersResponse } from '../../types/Api.js';
import type { SurahItem, SurahApiSource } from '../../types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { positiveInteger, requiredText } from '../../utils/validation.js';
import { SURAH_METADATA } from './surah.metadata.js';

function canonical(rows: { id: number; name: string }[], apiName: SurahApiSource): SurahItem[] {
    if (rows.length !== 114 || new Set(rows.map((r) => r.id)).size !== 114) throw new Error('Incomplete surah catalogue');
    for (const row of rows) {
        const id = positiveInteger(row.id);
        if (id > 114) throw new Error('Invalid surah id');
        requiredText(row.name);
    }
    return SURAH_METADATA.map(({ id, name, makkia }) => ({ id, name, makkia, apiName }));
}

export const surahApis: ApiFunction<SurahItem>[] = [
    async () => {
        const json = await fetchJson<Mp3QuranSurahResponse>('https://www.mp3quran.net/api/v3/suwar');
        return canonical(json.suwar, 'mp3quran.net');
    },
    async () => {
        const json = await fetchJson<AlQuranSurahResponse>('https://api.alquran.cloud/v1/surah');
        return canonical(
            json.data.map((s) => ({ id: s.number, name: s.name })),
            'alquran.cloud',
        );
    },
    async () => {
        const json = await fetchJson<QuranComChaptersResponse>('https://api.quran.com/api/v4/chapters?language=ar');
        return canonical(
            json.chapters.map((c) => ({ id: c.id, name: c.name_arabic })),
            'quran.com',
        );
    },
    async () => SURAH_METADATA.map(({ id, name, makkia }) => ({ id, name, makkia, apiName: 'local' })),
];

export async function getSurahContent(): Promise<{ surah: SurahItem[] }> {
    return { surah: await memoize('surah:all', () => runWithFallback(surahApis), { ttlMs: 1000 * 60 * 60 * 12 }) };
}
