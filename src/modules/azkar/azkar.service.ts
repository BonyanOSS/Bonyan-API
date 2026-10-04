/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { AzkarCategory } from '../../types/Items.js';
import type { ApiFunction } from '../../types/Api.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { requiredText } from '../../utils/validation.js';
import { AZKAR_CATEGORIES } from './azkar.metadata.js';

const sources = [
    {
        url: 'https://cdn.jsdelivr.net/gh/rn0x/hisn_almuslim_json@0405ee1797c2ccadfe82cd41845338d54978ccb9/hisn_almuslim.json',
        apiName: 'cdn.jsdelivr.net/rn0x/hisn_almuslim_json',
    },
    {
        url: 'https://raw.githubusercontent.com/rn0x/hisn_almuslim_json/0405ee1797c2ccadfe82cd41845338d54978ccb9/hisn_almuslim.json',
        apiName: 'raw.githubusercontent.com/rn0x/hisn_almuslim_json',
    },
] as const;

export const azkarApis: ApiFunction<AzkarCategory>[] = sources.map(({ url, apiName }) => async () => {
    const json = await fetchJson<Record<string, { text: string[] }>>(url, 12000);
    return AZKAR_CATEGORIES.map((meta) => {
        const texts = json[meta.mirrorName]?.text;
        if (!Array.isArray(texts) || !texts.length) throw new Error('Incomplete Hisn al-Muslim mirror');
        return { category: meta.name, items: texts.map((text, i) => ({ id: i + 1, text: requiredText(text) })), apiName };
    });
});
export async function getAzkarContent(): Promise<{ categories: AzkarCategory[] }> {
    return { categories: await memoize('azkar:all', () => runWithFallback(azkarApis), { ttlMs: 1000 * 60 * 60 * 24 }) };
}
