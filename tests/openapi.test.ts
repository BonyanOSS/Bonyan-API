/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import Ajv from 'ajv/dist/2020.js';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';
import { createWorkerApp } from '../src/http/worker-app';
import { clearCache } from '../src/utils/cache';
import { SURAH_METADATA } from '../src/modules/surah/surah.metadata';
import { AZKAR_CATEGORIES } from '../src/modules/azkar/azkar.metadata';
import { HADITH_BOOKS } from '../src/modules/hadith/hadith.metadata';
import snapshot from '../src/modules/reciters/reciters.snapshot.json';

interface Schema {
    $ref?: string;
    [key: string]: unknown;
}
interface Operation {
    operationId: string;
    responses: Record<string, Schema>;
    parameters?: { in?: string; name?: string; required?: boolean; $ref?: string }[];
}
interface Specification {
    openapi: string;
    paths: Record<string, { get: Operation }>;
    components: { schemas: Record<string, Schema>; responses: Record<string, Schema>; parameters: Record<string, Schema> };
}
const spec = parse(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8')) as Specification;
const ajv = new Ajv({ strict: false, allErrors: true });
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
function dereference(value: Schema): Schema {
    if (!value.$ref) return value;
    return value.$ref
        .slice(2)
        .split('/')
        .reduce((node, key) => (node as Record<string, unknown>)[key], spec as unknown) as Schema;
}
function validateResponse(path: string, status: number, body: unknown): void {
    const response = spec.paths[path]!.get.responses[String(status)];
    expect(response, 'Missing documented status ' + status + ' for ' + path).toBeDefined();
    const content = dereference(response!).content as Record<string, { schema: Schema }>;
    const validate = ajv.compile({ ...content['application/json']!.schema, components: spec.components });
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
}

async function contractApp(adapter: string) {
    if (adapter === 'node') return buildApp({ logger: false });
    const worker = createWorkerApp();
    return {
        async inject(url: string) {
            const response = await worker.fetch(new Request('https://api.example' + url), {
                RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ?? '1000',
            });
            const body = await response.text();
            return { statusCode: response.status, body, headers: Object.fromEntries(response.headers), json: () => JSON.parse(body) };
        },
        async ready() {},
        async close() {},
    };
}

describe.each(['node', 'worker'])('OpenAPI response contracts (%s)', (adapter) => {
    let app: Awaited<ReturnType<typeof contractApp>>;
    beforeAll(async () => {
        clearCache();
        vi.mocked(fetch).mockImplementation(async (input, init) => {
            if (init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'audio/mpeg' } });
            const url = new URL(String(input));
            if (url.pathname.endsWith('/suwar'))
                return json({ suwar: SURAH_METADATA.map((s) => ({ id: s.id, name: s.name, makkia: Number(s.makkia) })) });
            if (url.pathname.endsWith('/reciters')) return json(snapshot);
            if (url.pathname.endsWith('/quran/quran-uthmani'))
                return json({
                    data: {
                        edition: { identifier: 'quran-uthmani', type: 'quran' },
                        surahs: SURAH_METADATA.map((s) => ({
                            number: s.id,
                            name: s.name,
                            ayahs: Array.from({ length: s.ayahCount }, (_, i) => ({ numberInSurah: i + 1, text: 'الله نص اختبار' })),
                        })),
                    },
                });
            if (url.pathname.endsWith('/hisn_almuslim.json'))
                return json(Object.fromEntries(AZKAR_CATEGORIES.map((c) => [c.mirrorName, { text: ['ذكر الله اختبار'] }])));
            if (url.pathname.endsWith('/ar.muyassar'))
                return json({
                    data: {
                        number: 1,
                        edition: { identifier: 'ar.muyassar', type: 'tafsir' },
                        ayahs: Array.from({ length: 7 }, (_, i) => ({ numberInSurah: i + 1, text: 'تفسير اختبار' })),
                    },
                });
            if (url.pathname.includes('/tafsirs/91/'))
                return json({
                    tafsirs: Array.from({ length: 7 }, (_, i) => ({ resource_id: 91, verse_key: '1:' + (i + 1), text: 'تفسير اختبار' })),
                    pagination: { next_page: null },
                });
            if (url.pathname.endsWith('/books/bukhari.json'))
                return json(
                    Array.from({ length: HADITH_BOOKS.find((b) => b.id === 'bukhari')!.available }, (_, i) => ({
                        number: (i + 1) * 2,
                        arab: 'حديث اختبار',
                    })),
                );
            if (/\/timings(?:ByCity)?\//.test(url.pathname))
                return json({
                    data: {
                        timings: Object.fromEntries(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Sunset', 'Maghrib', 'Isha'].map((k) => [k, '12:00'])),
                        date: { gregorian: { date: url.pathname.split('/').at(-1) }, hijri: { date: '23-04-1448' } },
                        meta: {
                            latitude: 21.4225,
                            longitude: 39.8262,
                            timezone: url.searchParams.get('timezonestring'),
                            method: { id: Number(url.searchParams.get('method')), name: 'test' },
                        },
                    },
                });
            if (/\/(gToH|hToG)\//.test(url.pathname))
                return json({
                    data: {
                        hijri: {
                            date: '23-04-1448',
                            day: '23',
                            month: { number: 4, en: 'Rabi II', ar: 'ربيع الآخر' },
                            year: '1448',
                            weekday: { en: 'Sunday', ar: 'الأحد' },
                            method: 'UAQ',
                        },
                        gregorian: { date: '04-10-2026', day: '04', month: { number: 10, en: 'October' }, year: '2026' },
                    },
                });
            if (url.pathname.includes('/qibla/')) return json({ data: { latitude: 24.7136, longitude: 46.6753, direction: 243.8 } });
            throw new Error('Unexpected fixture request: ' + url.hostname + url.pathname);
        });
        app = await contractApp(adapter);
        await app.ready();
    });
    afterAll(async () => {
        await app.close();
        clearCache();
    });

    it('covers every registered GET route and uses unique operation IDs', async () => {
        const catalogue = (await app.inject('/')).json() as { routes: { method: string | string[]; url: string }[] };
        const registered = catalogue.routes
            .filter((r) => (Array.isArray(r.method) ? r.method : [r.method]).includes('GET'))
            .map((r) => r.url.replace(/:([A-Za-z]+)/g, '{$1}'));
        expect(new Set([...registered, '/', '/health', '/ready', '/metrics'])).toEqual(new Set(Object.keys(spec.paths)));
        const ids = Object.values(spec.paths).map((p) => p.get.operationId);
        expect(new Set(ids).size).toBe(ids.length);
        expect(spec.openapi).toBe('3.1.0');
    });

    it('resolves all internal references and compiles each content schema', () => {
        function walk(value: unknown): void {
            if (!value || typeof value !== 'object') return;
            if ('$ref' in value) expect(dereference(value as Schema)).toBeDefined();
            for (const child of Object.values(value)) walk(child);
        }
        walk(spec);
        for (const name of Object.keys(spec.components.schemas))
            expect(() => ajv.compile({ $ref: '#/components/schemas/' + name, components: spec.components })).not.toThrow();
    });

    it.each([
        ['/', '/'],
        ['/health', '/health'],
        ['/ready', '/ready'],
        ['/surah', '/surah'],
        ['/surah/{id}', '/surah/1'],
        ['/surah/search', '/surah/search?name=' + encodeURIComponent('الفاتحة')],
        ['/ayat', '/ayat'],
        ['/ayat/{id}', '/ayat/1'],
        ['/ayat/{surah}/aya/{id}', '/ayat/1/aya/1'],
        ['/ayat/search', '/ayat/search?text=' + encodeURIComponent('الله') + '&limit=2'],
        ['/reciters', '/reciters'],
        ['/reciters/{id}', '/reciters/123'],
        ['/reciters/search', '/reciters/search?name=' + encodeURIComponent('مشاري')],
        ['/reciters/{id}/surah/{surah}', '/reciters/123/surah/1'],
        ['/tafsir', '/tafsir'],
        ['/tafsir/{edition}/{surah}', '/tafsir/muyassar/1'],
        ['/tafsir/{edition}/{surah}/{aya}', '/tafsir/saadi/1/2'],
        ['/azkar', '/azkar'],
        ['/azkar/{category}', '/azkar/' + encodeURIComponent('أذكار الصباح')],
        ['/azkar/random', '/azkar/random'],
        ['/azkar/search', '/azkar/search?text=' + encodeURIComponent('الله') + '&limit=2'],
        ['/hadith', '/hadith'],
        ['/hadith/{book}', '/hadith/bukhari?from=1&to=10'],
        ['/hadith/{book}/{number}', '/hadith/bukhari/2'],
        ['/hadith/random', '/hadith/random?book=bukhari'],
        ['/prayer/times', '/prayer/times?date=04-10-2026&latitude=21.4225&longitude=39.8262'],
        ['/hijri/today', '/hijri/today'],
        ['/hijri/from-gregorian', '/hijri/from-gregorian?date=04-10-2026'],
        ['/hijri/to-gregorian', '/hijri/to-gregorian?date=23-04-1448'],
        ['/qibla', '/qibla?latitude=24.7136&longitude=46.6753'],
    ])('validates the actual successful response for %s', async (path, url) => {
        const response = await app.inject(url);
        expect(response.statusCode, response.body).toBe(200);
        validateResponse(path, 200, response.json());
    });

    it.each([
        ['/reciters/{id}', '/reciters/1abc', 400],
        ['/surah/{id}', '/surah/1.5', 400],
        ['/ayat/{id}', '/ayat/1abc', 400],
        ['/tafsir/{edition}/{surah}', '/tafsir/toString/1', 400],
        ['/tafsir/{edition}/{surah}/{aya}', '/tafsir/saadi/1/8', 404],
        ['/hadith/{book}', '/hadith/bukhari?from=1&to=301', 400],
        ['/hadith/{book}', '/hadith/not-a-book', 404],
        ['/hadith/{book}/{number}', '/hadith/bukhari/1', 404],
        ['/prayer/times', '/prayer/times?latitude=91&longitude=39', 400],
        ['/prayer/times', '/prayer/times?latitude=21&longitude=39&method=0', 400],
        ['/prayer/times', '/prayer/times?latitude=21&longitude=39&method=7', 400],
        ['/prayer/times', '/prayer/times?latitude=21&longitude=39&date=31-02-2026', 400],
        ['/prayer/times', '/prayer/times?latitude=21&longitude=39&timezone=invalid', 400],
        ['/qibla', '/qibla?latitude=&longitude=', 400],
        ['/hijri/from-gregorian', '/hijri/from-gregorian?date=31-02-2026', 400],
        ['/hijri/to-gregorian', '/hijri/to-gregorian?date=00-13-1448', 400],
        ['/azkar/search', '/azkar/search?text=x&limit=201', 400],
        ['/ayat/search', '/ayat/search?text=x&limit=501', 400],
    ])('validates errors for %s (%s)', async (path, url, status) => {
        const response = await app.inject(url);
        expect(response.statusCode).toBe(status);
        validateResponse(path, status, response.json());
    });

    it('documents and validates metrics separately from JSON responses', async () => {
        const response = await app.inject('/metrics');
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.body).toContain('bonyan_api_cache_entries');
    });

    it('returns the documented 503 body when all Quran text sources fail', async () => {
        clearCache();
        vi.mocked(fetch).mockRejectedValue(new Error('offline'));
        const response = await app.inject('/ayat');
        expect(response.statusCode).toBe(503);
        validateResponse('/ayat', 503, response.json());
        expect(response.json().error.code).toBe('ALL_SOURCES_FAILED');
    });

    it('returns the same error contract for rate-limited requests', async () => {
        vi.stubEnv('RATE_LIMIT_MAX', '1');
        const limited = await contractApp(adapter);
        try {
            await limited.inject('/health');
            const response = await limited.inject('/health');
            expect(response.statusCode).toBe(429);
            validateResponse('/health', 429, response.json());
            expect(response.json().error.code).toBe('RATE_LIMITED');
        } finally {
            await limited.close();
            vi.unstubAllEnvs();
        }
    });
});
