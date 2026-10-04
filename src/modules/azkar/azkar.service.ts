/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { AzkarCategory, AzkarItem } from '../../types/Items.js';
import type { ApiFunction } from '../../types/Api.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { requiredText, positiveInteger } from '../../utils/validation.js';
import { AZKAR_CATEGORIES } from './azkar.metadata.js';

export const azkarApis: ApiFunction<AzkarCategory>[] = [
    async () => {
        const json = await fetchJson<Record<string, { text: string[] }>>(
            'https://cdn.jsdelivr.net/gh/rn0x/hisn_almuslim_json@0405ee1797c2ccadfe82cd41845338d54978ccb9/hisn_almuslim.json',
            12000,
        );
        return AZKAR_CATEGORIES.map((meta) => {
            const texts = json[meta.mirrorName]?.text;
            if (!Array.isArray(texts) || !texts.length) throw new Error('Incomplete Hisn al-Muslim mirror');
            return {
                category: meta.name,
                items: texts.map((text, i) => ({ id: i + 1, text: requiredText(text) })),
                apiName: 'cdn.jsdelivr.net/rn0x/hisn_almuslim_json',
            };
        });
    },
    async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const json = await fetchJson<{ العربية: { ID: number; TITLE: string }[] }>(
                'https://www.hisnmuslim.com/api/ar/husn_ar.json',
                8000,
                controller.signal,
            );
            if (json['العربية'].length !== 132 || new Set(json['العربية'].map((c) => c.ID)).size !== 132) throw new Error('Incomplete Hisn index');
            const pending = [...AZKAR_CATEGORIES];
            const categories = new Map<number, AzkarCategory>();
            await Promise.all(
                Array.from({ length: 6 }, async () => {
                    while (pending.length) {
                        const meta = pending.shift()!;
                        if (!json['العربية'].some((c) => c.ID === meta.id)) throw new Error('Missing Hisn chapter');
                        const payload = await fetchJson<Record<string, { ID: number; ARABIC_TEXT: string; REPEAT: number }[]>>(
                            'https://www.hisnmuslim.com/api/ar/' + meta.id + '.json',
                            8000,
                            controller.signal,
                        );
                        const rows = Object.values(payload).flat();
                        if (!rows.length) throw new Error('Empty Hisn chapter');
                        const items: AzkarItem[] = rows.map((row, i) => ({
                            id: i + 1,
                            text: requiredText(row.ARABIC_TEXT),
                            count: positiveInteger(row.REPEAT),
                        }));
                        categories.set(meta.id, { category: meta.name, items, apiName: 'hisnmuslim.com' });
                    }
                }),
            );
            return AZKAR_CATEGORIES.map((c) => categories.get(c.id)!);
        } catch (error) {
            controller.abort();
            throw error;
        } finally {
            clearTimeout(timer);
        }
    },
];
export async function getAzkarContent(): Promise<{ categories: AzkarCategory[] }> {
    return { categories: await memoize('azkar:all', () => runWithFallback(azkarApis), { ttlMs: 1000 * 60 * 60 * 24 }) };
}
