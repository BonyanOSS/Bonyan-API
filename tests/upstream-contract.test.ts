/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from '../src/utils/cache';
import { fetchJson, runWithFallback } from '../src/utils/fallback';
import { surahApis } from '../src/modules/surah/surah.service';
import { ayatApis, getAyatContent } from '../src/modules/ayat/ayat.service';
import { reciterApis, resolveReciterAudio } from '../src/modules/reciters/reciters.service';
import { buildTafsirApis, isSupportedEdition } from '../src/modules/tafsir/tafsir.service';
import { buildHadithApis, getRandomHadithItem } from '../src/modules/hadith/hadith.service';
import { buildApis } from '../src/modules/prayer/prayer.service';
import { buildHijriApis } from '../src/modules/hijri/hijri.service';
import { azkarApis } from '../src/modules/azkar/azkar.service';
import { getQibla } from '../src/modules/qibla/qibla.service';
import { SURAH_METADATA } from '../src/modules/surah/surah.metadata';
import { HADITH_BOOKS } from '../src/modules/hadith/hadith.metadata';
import { AZKAR_CATEGORIES } from '../src/modules/azkar/azkar.metadata';

const response = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const verses = () =>
    SURAH_METADATA.flatMap((s) => Array.from({ length: s.ayahCount }, (_, i) => ({ chapter: s.id, verse: i + 1, text: 'نص اختبار' })));
afterEach(() => {
    clearCache();
    vi.restoreAllMocks();
    vi.mocked(fetch).mockReset().mockRejectedValue(new Error('Network disabled'));
});

describe('Upstream contracts and failover', () => {
    it('maps AlQuran number into the same complete surah catalogue', async () => {
        vi.mocked(fetch).mockResolvedValue(
            response({
                data: SURAH_METADATA.map((s) => ({ number: s.id, name: 'سورة ' + s.name, revelationType: s.makkia ? 'Meccan' : 'Medinan' })),
            }),
        );
        const result = await surahApis[1]!();
        expect(result).toHaveLength(114);
        expect(result[0]).toEqual({ id: 1, name: 'الفاتحة', makkia: true, apiName: 'alquran.cloud' });
        expect(result.at(-1)?.id).toBe(114);
    });

    it('rejects a partial surah catalogue and reaches local metadata', async () => {
        vi.mocked(fetch).mockResolvedValue(response({ suwar: [], data: [], chapters: [] }));
        expect((await runWithFallback(surahApis))[0]?.apiName).toBe('local');
    });

    it('sorts Quran mirror verses and computes absolute IDs from chapter references', async () => {
        vi.mocked(fetch).mockResolvedValue(response({ quran: verses().reverse() }));
        const result = await ayatApis[1]!();
        expect(result[0]?.name).toBe('الفاتحة');
        expect(result[1]?.ayat[0]?.number).toBe(8);
        expect(result.at(-1)?.ayat.at(-1)?.number).toBe(6236);
    });

    it('rejects duplicate and missing Quran verses', async () => {
        const rows = verses();
        rows[0] = rows[1]!;
        vi.mocked(fetch).mockResolvedValue(response({ quran: rows }));
        await expect(ayatApis[1]!()).rejects.toThrow('Duplicate');
        vi.mocked(fetch).mockResolvedValue(response({ quran: [] }));
        await expect(ayatApis[1]!()).rejects.toThrow('Incomplete');
    });

    it('uses Quran.com text when earlier payloads are malformed and does not cache failed results', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('offline'));
        await expect(getAyatContent()).rejects.toThrow();
        vi.mocked(fetch).mockImplementation(async (input) => {
            if (String(input).includes('quran.com'))
                return response({ verses: verses().map((v) => ({ verse_key: v.chapter + ':' + v.verse, text_uthmani: v.text })) });
            return response({ data: { surahs: [] }, quran: [] });
        });
        const result = await getAyatContent();
        expect(result.surahs).toHaveLength(114);
        expect(result.surahs[0]?.apiName).toBe('quran.com');
    });

    it('preserves all reciter IDs when the primary catalogue is unavailable', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('offline'));
        const rows = await runWithFallback(reciterApis);
        expect(rows).toHaveLength(241);
        expect(rows.find((r) => r.id === 123)?.name).toBe('مشاري العفاسي');
        expect(rows.every((r) => r.moshaf.length && r.apiName === 'local')).toBe(true);
    });

    it('rejects optional reciter metadata containing literal placeholders', async () => {
        const snapshot = await import('../src/modules/reciters/reciters.snapshot.json');
        const payload = structuredClone(snapshot.default);
        payload.reciters[0]!.date = 'unknown';
        vi.mocked(fetch).mockResolvedValue(response(payload));
        expect((await runWithFallback(reciterApis))[0]?.apiName).toBe('local');
    });

    it('chooses available Hafs audio instead of the first partial recording and preserves identity on failover', async () => {
        const reciter = (await reciterApis[1]!()).find((r) => r.id === 123)!;
        const requests: string[] = [];
        vi.mocked(fetch).mockImplementation(async (input, init) => {
            requests.push(String(input));
            if (String(input).includes('mp3quran.net')) return new Response(null, { status: 503 });
            if (init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'audio/mpeg' } });
            return response({ audio_file: { chapter_id: 1, audio_url: 'https://download.quranicaudio.com/verified-test.mp3' } });
        });
        const result = await resolveReciterAudio(reciter, 1);
        expect(result).toMatchObject({ reciter: reciter.name, moshafId: 123, rewayaId: 1, apiName: 'quran.com' });
        expect(requests.some((r) => r.endsWith('/chapter_recitations/7/1'))).toBe(true);
        expect(await resolveReciterAudio(reciter, 1, 124)).toBeUndefined();
    });

    it('fails unavailable audio without switching to a different narrator or narration', async () => {
        const reciter = (await reciterApis[1]!()).find((r) => r.id === 123)!;
        vi.mocked(fetch).mockRejectedValue(new Error('offline'));
        await expect(resolveReciterAudio(reciter, 12, 124)).rejects.toThrow('offline');
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('converts QuranEnc string references and keeps the requested edition name', async () => {
        vi.mocked(fetch).mockResolvedValue(
            response({ result: Array.from({ length: 7 }, (_, i) => ({ sura: '1', aya: String(i + 1), translation: 'تفسير اختبار' })) }),
        );
        expect(await buildTafsirApis('muyassar', 1, 2)[1]!()).toEqual([
            { surah: 1, aya: 2, text: 'تفسير اختبار', edition: 'muyassar', apiName: 'quranenc.com' },
        ]);
        expect(isSupportedEdition('toString')).toBe(false);
        expect(isSupportedEdition('jalalayn')).toBe(false);
    });

    it('rejects raw Quran accidentally returned for an unsupported tafsir edition', async () => {
        vi.mocked(fetch).mockResolvedValue(response({ data: { number: 1, edition: { identifier: 'quran-uthmani', type: 'quran' }, ayahs: [] } }));
        await expect(buildTafsirApis('muyassar', 1)[0]!()).rejects.toThrow('Wrong tafsir');
    });

    it('rejects empty tafsir, accepts the same edition CDN and strips Quran.com HTML', async () => {
        const apis = buildTafsirApis('saadi', 1, 1);
        vi.mocked(fetch).mockResolvedValue(response({ tafsirs: [], pagination: { next_page: null } }));
        await expect(apis[0]!()).rejects.toThrow('Incomplete');
        vi.mocked(fetch).mockResolvedValue(response(Array.from({ length: 7 }, (_, i) => ({ surah: 1, ayah: i + 1, text: 'تفسير اختبار' }))));
        expect((await apis[1]!())[0]).toMatchObject({ aya: 1, edition: 'saadi' });
        vi.mocked(fetch).mockResolvedValue(
            response({ tafsirs: [{ resource_id: 91, verse_key: '1:1', text: '<span>نص</span> &amp; تفسير' }], pagination: { next_page: null } }),
        );
        expect((await apis[0]!())[0]?.text).toBe('نص & تفسير');
    });

    it('maps Hisn mirror text into all canonical category names without invented counts', async () => {
        vi.mocked(fetch).mockResolvedValue(response(Object.fromEntries(AZKAR_CATEGORIES.map((c) => [c.mirrorName, { text: ['ذكر اختبار'] }]))));
        const categories = await azkarApis[0]!();
        expect(categories).toHaveLength(132);
        expect(categories.every((c) => c.items[0]?.text === 'ذكر اختبار' && !Object.hasOwn(c.items[0]!, 'count'))).toBe(true);
        expect(categories.some((c) => c.category === 'أذكار الصباح والمساء')).toBe(true);
    });

    it('fails over to the same pinned Hisn corpus within the Workers subrequest budget', async () => {
        vi.mocked(fetch).mockImplementation(async (input) => {
            if (String(input).includes('cdn.jsdelivr.net')) return new Response(null, { status: 503 });
            return response(Object.fromEntries(AZKAR_CATEGORIES.map((c) => [c.mirrorName, { text: ['ذكر اختبار'] }])));
        });
        const categories = await runWithFallback(azkarApis);
        expect(categories).toHaveLength(132);
        expect(categories[0]?.items[0]).toEqual({ id: 1, text: 'ذكر اختبار' });
        expect(categories.every((c) => c.apiName === 'raw.githubusercontent.com/rn0x/hisn_almuslim_json')).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(vi.mocked(fetch).mock.calls[1]?.[0]).toContain('0405ee1797c2ccadfe82cd41845338d54978ccb9');
    });

    it('uses pinned hadith arrays on the second host and chooses only existing numbers', async () => {
        const meta = HADITH_BOOKS.find((b) => b.id === 'bukhari')!;
        const rows = Array.from({ length: meta.available }, (_, i) => ({ number: (i + 1) * 2, arab: 'حديث اختبار' }));
        vi.mocked(fetch).mockImplementation(async (input) => {
            if (String(input).includes('cdn.jsdelivr.net')) return new Response(null, { status: 404 });
            return response(rows);
        });
        const result = await runWithFallback(buildHadithApis('bukhari'));
        expect(result).toHaveLength(meta.available);
        expect(result[0]).toMatchObject({ number: 2, book: meta.name, apiName: 'raw.githubusercontent.com/gadingnst/hadith-api' });
        vi.spyOn(Math, 'random').mockReturnValue(0.999999);
        expect((await getRandomHadithItem('bukhari')).number).toBe(meta.available * 2);
        expect(() => buildHadithApis('../secret')).toThrow('Unsupported');
    });

    it('rejects incomplete hadith books before caching', async () => {
        vi.mocked(fetch).mockResolvedValue(response([{ number: 1, arab: 'حديث اختبار' }]));
        await expect(buildHadithApis('bukhari')[0]!()).rejects.toThrow('Incomplete');
    });

    it.each([1, 2, 3, 4, 5, 9, 10, 11])('provides coordinate fallback for method %i with declared timezone', async (method) => {
        const result = (await buildApis({ date: '04-10-2026', latitude: 21.4225, longitude: 39.8262, method, timezone: 'Asia/Riyadh' })[1]!())[0]!;
        expect(result).toMatchObject({ apiName: 'local', timezone: 'Asia/Riyadh', date: '04-10-2026' });
        expect(Object.values(result.timings).every((v) => /^\d{2}:\d{2}$/.test(v))).toBe(true);
        expect(result.timings.Fajr < result.timings.Sunrise).toBe(true);
        expect(result.timings.Maghrib < result.timings.Isha).toBe(true);
    });

    it('does not silently invent coordinates for city-only prayer requests', () => {
        expect(buildApis({ date: '04-10-2026', city: 'Mecca', country: 'SA', timezone: 'UTC' })).toHaveLength(1);
    });

    it('declares the offline calendar and converts back to the same Gregorian day', async () => {
        const result = await buildHijriApis('gToH', '04-10-2026')[1]!();
        expect(result).toMatchObject({ apiName: 'local', calendar: 'islamic-umalqura' });
        const reverse = await buildHijriApis('hToG', result.hijri.date)[1]!();
        expect(reverse.gregorian.date).toBe('04-10-2026');
    });

    it('preserves four-digit date years at the lower supported Hijri boundary', async () => {
        const result = await buildHijriApis('hToG', '01-01-0001')[1]!();
        expect(result.hijri.date).toBe('01-01-0001');
        expect(result.gregorian.date).toMatch(/^\d{2}-\d{2}-0622$/);
    });

    it('rejects an unexpected upstream calendar rather than changing dates on failover', async () => {
        const local = await buildHijriApis('gToH', '04-10-2026')[1]!();
        vi.mocked(fetch).mockResolvedValue(
            response({
                data: {
                    hijri: {
                        ...local.hijri,
                        month: { en: local.hijri.month, ar: local.hijri.monthAr },
                        weekday: { en: local.hijri.weekday, ar: local.hijri.weekdayAr },
                        method: 'HJCoSA',
                    },
                    gregorian: { ...local.gregorian, month: { en: local.gregorian.month } },
                },
            }),
        );
        expect(await runWithFallback(buildHijriApis('gToH', '04-10-2026'))).toEqual(local);
    });

    it('keeps exact Qibla coordinates for nearby cache keys and rejects bad upstream bearings', async () => {
        vi.mocked(fetch).mockResolvedValue(response({ data: { latitude: 24.713601, longitude: 46.6753, direction: null } }));
        const first = await getQibla(24.713601, 46.6753);
        const second = await getQibla(24.713602, 46.6753);
        expect(first.apiName).toBe('local');
        expect(second.latitude).toBe(24.713602);
        expect(first.direction).toBeGreaterThan(0);
        expect(first.direction).toBeLessThan(360);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('bounds response body parsing, not only the time until headers arrive', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => new Promise(() => {}) } as Response);
        await expect(fetchJson('https://example.com', 20)).rejects.toThrow('timed out');
        const [, init] = vi.mocked(fetch).mock.calls[0]!;
        expect(init?.signal?.aborted).toBe(true);
    });

    it('rejects empty nested results and continues', async () => {
        expect(await runWithFallback([async () => [[]], async () => [[1]]])).toEqual([[1]]);
    });
});
