/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { writeFile } from 'node:fs/promises';
import { surahApis } from '../src/modules/surah/surah.service.js';
import { ayatApis } from '../src/modules/ayat/ayat.service.js';
import { reciterApis, buildReciterAudioApis } from '../src/modules/reciters/reciters.service.js';
import { azkarApis } from '../src/modules/azkar/azkar.service.js';
import { buildTafsirApis, listEditions } from '../src/modules/tafsir/tafsir.service.js';
import { buildHadithApis, listBooks } from '../src/modules/hadith/hadith.service.js';
import { buildApis } from '../src/modules/prayer/prayer.service.js';
import { buildHijriApis } from '../src/modules/hijri/hijri.service.js';
import { buildQiblaApis } from '../src/modules/qibla/qibla.service.js';
import { clearCache } from '../src/utils/cache.js';

interface Check {
    name: string;
    load: () => Promise<unknown>;
}
const checks: Check[] = [];
const results: { name: string; ok: boolean; durationMs: number; items?: number; apiName?: string; error?: string }[] = [];
function add(name: string, loaders: (() => Promise<unknown>)[]): void {
    loaders.forEach((load, index) => checks.push({ name: name + ':' + (index + 1), load }));
}
add('surah', surahApis);
add('ayat', ayatApis);
add('reciters', reciterApis);
add('azkar', azkarApis);
for (const edition of listEditions()) add('tafsir:' + edition.id, buildTafsirApis(edition.id as 'muyassar' | 'saadi', 1, 2));
for (const book of await listBooks()) add('hadith:' + book.id, buildHadithApis(book.id));
const now = new Date();
const date = [now.getUTCDate(), now.getUTCMonth() + 1, now.getUTCFullYear()]
    .map((n, i) => (i < 2 ? String(n).padStart(2, '0') : String(n)))
    .join('-');
add('prayer:coordinates', buildApis({ date, latitude: 21.4225, longitude: 39.8262, method: 4, timezone: 'Asia/Riyadh' }));
add('prayer:city', buildApis({ date, city: 'Mecca', country: 'SA', method: 4, timezone: 'Asia/Riyadh' }));
add('hijri:gToH', buildHijriApis('gToH', date));
add('hijri:hToG', buildHijriApis('hToG', '23-04-1448'));
add('qibla', buildQiblaApis(24.7136, 46.6753));
const reciters = await reciterApis[1]!();
for (const id of [1, 4, 31, 51, 54, 89, 106, 112, 118, 123]) {
    const reciter = reciters.find((r) => r.id === id)!;
    add('audio:' + id, buildReciterAudioApis(reciter, 1));
}

// Keep requests to each public provider bounded, without hiding individual adapter failures.
const pending = [...checks];
await Promise.all(
    Array.from({ length: 3 }, async () => {
        while (pending.length) {
            const check = pending.shift()!;
            const started = Date.now();
            try {
                const value = await check.load();
                if (value === undefined || value === null || (Array.isArray(value) && !value.length)) throw new Error('Empty result');
                const first = Array.isArray(value) ? value[0] : value;
                const result = {
                    name: check.name,
                    ok: true,
                    durationMs: Date.now() - started,
                    ...(Array.isArray(value) ? { items: value.length } : {}),
                    ...(first && typeof first === 'object' && 'apiName' in first ? { apiName: String(first.apiName) } : {}),
                };
                results.push(result);
                console.log(JSON.stringify(result));
            } catch (error) {
                const result = {
                    name: check.name,
                    ok: false,
                    durationMs: Date.now() - started,
                    error: error instanceof Error ? error.message : 'Check failed',
                };
                results.push(result);
                console.error(JSON.stringify(result));
            }
        }
    }),
);
clearCache();
const report = {
    checkedAt: new Date().toISOString(),
    checks: results.sort((a, b) => a.name.localeCompare(b.name)),
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
};
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
    const output = process.argv[outputIndex + 1];
    if (!output) throw new Error('--output requires a path');
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
if (report.failed) process.exitCode = 1;
