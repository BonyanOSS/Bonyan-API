/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { ApiFunction, AlQuranAyatResponse } from '../../types/Api.js';
import type { SurahWithAyaItem, AyatApiSource } from '../../types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { positiveInteger, requiredText } from '../../utils/validation.js';
import { SURAH_METADATA, absoluteAyaNumber } from '../surah/surah.metadata.js';

interface Verse {
    chapter: number;
    verse: number;
    text: string;
}
function normalize(verses: Verse[], apiName: AyatApiSource): SurahWithAyaItem[] {
    if (verses.length !== 6236) throw new Error('Incomplete Quran text');
    const grouped = new Map<number, Map<number, string>>();
    for (const row of verses) {
        const chapter = positiveInteger(row.chapter);
        const verse = positiveInteger(row.verse);
        const meta = SURAH_METADATA[chapter - 1];
        if (!meta || verse > meta.ayahCount) throw new Error('Invalid Quran verse reference');
        const ayat = grouped.get(chapter) ?? new Map<number, string>();
        if (ayat.has(verse)) throw new Error('Duplicate Quran verse');
        ayat.set(verse, requiredText(row.text));
        grouped.set(chapter, ayat);
    }
    return SURAH_METADATA.map((meta) => {
        const verses = grouped.get(meta.id);
        if (verses?.size !== meta.ayahCount) throw new Error('Incomplete Quran surah');
        return {
            number: meta.id,
            name: meta.name,
            apiName,
            ayat: [...verses]
                .sort((a, b) => a[0] - b[0])
                .map(([numberInSurah, text]) => ({ number: absoluteAyaNumber(meta.id, numberInSurah), text, numberInSurah })),
        };
    });
}

export const ayatApis: ApiFunction<SurahWithAyaItem>[] = [
    async () => {
        const json = await fetchJson<AlQuranAyatResponse>('https://api.alquran.cloud/v1/quran/quran-uthmani', 20000);
        if (json.data.edition.type !== 'quran' || json.data.edition.identifier !== 'quran-uthmani') throw new Error('Unexpected Quran edition');
        return normalize(
            json.data.surahs.flatMap((s) => s.ayahs.map((a) => ({ chapter: s.number, verse: a.numberInSurah, text: a.text }))),
            'alquran.cloud',
        );
    },
    async () => {
        const json = await fetchJson<{ quran: Verse[] }>(
            'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmanihaf.json',
            20000,
        );
        return normalize(json.quran, 'cdn.jsdelivr.net/fawazahmed0/quran-api');
    },
    async () => {
        const json = await fetchJson<{ verses: { verse_key: string; text_uthmani: string }[] }>(
            'https://api.quran.com/api/v4/quran/verses/uthmani',
            20000,
        );
        return normalize(
            json.verses.map((v) => {
                const [chapter, verse] = v.verse_key.split(':').map(Number);
                return { chapter: chapter!, verse: verse!, text: v.text_uthmani };
            }),
            'quran.com',
        );
    },
];

export async function getAyatContent(): Promise<{ surahs: SurahWithAyaItem[] }> {
    return { surahs: await memoize('ayat:full', () => runWithFallback(ayatApis), { ttlMs: 1000 * 60 * 60 * 24 }) };
}
