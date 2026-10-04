/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { TafsirItem, TafsirApiSource } from '../../types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { positiveInteger, requiredText } from '../../utils/validation.js';
import { SURAH_METADATA } from '../surah/surah.metadata.js';

const EDITIONS = {
    muyassar: { label: 'التفسير الميسر', cloud: 'ar.muyassar', qurancom: 16, cdn: 'ar-tafsir-muyassar' },
    saadi: { label: 'تفسير السعدي', qurancom: 91, cdn: 'ar-tafseer-al-saddi' },
} as const;
const TAFSIR_REVISION = 'eb82bb6294efe30ad5c135c03b1864afaa70e855';
export type TafsirEdition = keyof typeof EDITIONS;
export function isSupportedEdition(value: string): value is TafsirEdition {
    return Object.hasOwn(EDITIONS, value);
}
export function listEditions(): { id: string; label: string }[] {
    return Object.entries(EDITIONS).map(([id, meta]) => ({ id, label: meta.label }));
}

function normalize(
    rows: { surah: unknown; aya: unknown; text: unknown }[],
    edition: TafsirEdition,
    surah: number,
    aya: number | undefined,
    apiName: TafsirApiSource,
): TafsirItem[] {
    const meta = SURAH_METADATA[surah - 1];
    if (!meta) throw new Error('Invalid surah');
    const result = rows
        .map((row) => ({ surah: positiveInteger(row.surah), aya: positiveInteger(row.aya), text: requiredText(row.text), edition, apiName }))
        .sort((a, b) => a.aya - b.aya);
    if (result.some((row) => row.surah !== surah || row.aya > meta.ayahCount) || new Set(result.map((row) => row.aya)).size !== result.length)
        throw new Error('Invalid tafsir references');
    const filtered = aya === undefined ? result : result.filter((row) => row.aya === aya);
    if (filtered.length !== (aya === undefined ? meta.ayahCount : 1)) throw new Error('Incomplete tafsir');
    return filtered;
}

export function buildTafsirApis(edition: TafsirEdition, surah: number, aya?: number): (() => Promise<TafsirItem[]>)[] {
    const meta = EDITIONS[edition];
    const apis: (() => Promise<TafsirItem[]>)[] = [];
    if ('cloud' in meta)
        apis.push(async () => {
            const json = await fetchJson<{
                data: { number: number; edition: { identifier: string; type: string }; ayahs: { numberInSurah: number; text: string }[] };
            }>('https://api.alquran.cloud/v1/surah/' + surah + '/' + meta.cloud, 12000);
            if (json.data.edition.identifier !== meta.cloud || json.data.edition.type !== 'tafsir') throw new Error('Wrong tafsir edition');
            return normalize(
                json.data.ayahs.map((a) => ({ surah: json.data.number, aya: a.numberInSurah, text: a.text })),
                edition,
                surah,
                aya,
                'alquran.cloud',
            );
        });
    if (edition === 'muyassar')
        apis.push(async () => {
            const json = await fetchJson<{ result: { sura: string; aya: string; translation: string }[] }>(
                'https://quranenc.com/api/v1/translation/sura/arabic_moyassar/' + surah,
                12000,
            );
            return normalize(
                json.result.map((r) => ({ surah: r.sura, aya: r.aya, text: r.translation })),
                edition,
                surah,
                aya,
                'quranenc.com',
            );
        });
    apis.push(async () => {
        const rows: { surah: number; aya: number; text: string }[] = [];
        let page = 1;
        for (;;) {
            const json = await fetchJson<{
                tafsirs: { resource_id: number; verse_key: string; text: string }[];
                pagination: { next_page: number | null };
            }>('https://api.quran.com/api/v4/tafsirs/' + meta.qurancom + '/by_chapter/' + surah + '?per_page=50&page=' + page, 12000);
            for (const row of json.tafsirs) {
                if (row.resource_id !== meta.qurancom) throw new Error('Wrong tafsir resource');
                const [chapter, verse] = row.verse_key.split(':').map(Number);
                // All sources expose text without upstream HTML formatting.
                rows.push({
                    surah: chapter!,
                    aya: verse!,
                    text: row.text
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"'),
                });
            }
            if (!json.pagination?.next_page) break;
            if (json.pagination.next_page <= page || page >= 6) throw new Error('Invalid tafsir pagination');
            page = json.pagination.next_page;
        }
        return normalize(rows, edition, surah, aya, 'quran.com');
    });
    apis.push(async () => {
        const json = await fetchJson<{ surah: number; ayah: number; text: string }[]>(
            'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@' + TAFSIR_REVISION + '/tafsir/' + meta.cdn + '/' + surah + '.json',
            15000,
        );
        return normalize(
            json.map((r) => ({ surah: r.surah, aya: r.ayah, text: r.text })),
            edition,
            surah,
            aya,
            'cdn.jsdelivr.net/spa5k/tafsir_api',
        );
    });
    return apis;
}
export async function getTafsir(edition: TafsirEdition, surah: number, aya?: number): Promise<TafsirItem[]> {
    if (!isSupportedEdition(edition)) throw new Error('Unsupported edition');
    return memoize('tafsir:' + edition + ':' + surah + ':' + (aya ?? 'all'), () => runWithFallback(buildTafsirApis(edition, surah, aya)), {
        ttlMs: 1000 * 60 * 60 * 24,
    });
}
