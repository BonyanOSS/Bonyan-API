/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { getAyatContent } from './ayat.service.js';
import type { AyaItem } from '@/src/types/Items.js';
import { normalizeArabicForQuranSearch } from '../../utils/arabic.js';
import { fail, ok, unavailable } from '../../utils/http.js';
import { parseInteger } from '../../utils/validation.js';

export async function getAllAyat(_req: HttpRequest, reply: HttpReply) {
    try {
        const data = await getAyatContent();
        return ok(reply, data);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getAyatById(req: HttpRequest<{ Params: { id: string } }>, reply: HttpReply) {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id)) return fail(reply, 400, 'Invalid Aya ID');
    if (id < 1 || id > 6236) return fail(reply, 400, 'ID must be between 1 and 6236');

    try {
        const data = await getAyatContent();
        for (const surah of data.surahs) {
            const aya = surah.ayat.find((a) => a.number === id);
            if (aya) return ok(reply, { surahNumber: surah.number, surahName: surah.name, aya, apiName: surah.apiName });
        }
        return fail(reply, 404, 'Aya not found');
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getAyatBySurah(req: HttpRequest<{ Params: { surah: string; id: string } }>, reply: HttpReply) {
    const surahNum = parseInteger(req.params.surah);
    const ayaNum = parseInteger(req.params.id);

    if (Number.isNaN(surahNum) || Number.isNaN(ayaNum)) {
        return fail(reply, 400, 'Surah and Aya numbers must be valid integers');
    }
    if (surahNum < 1 || surahNum > 114) return fail(reply, 400, 'Surah number must be between 1 and 114');
    if (ayaNum < 1) return fail(reply, 400, 'Aya number must be a positive integer');

    try {
        const data = await getAyatContent();
        const surah = data.surahs.find((s) => s.number === surahNum);
        if (!surah) return fail(reply, 404, `Surah ${surahNum} not found`);

        const aya = surah.ayat.find((a) => a.numberInSurah === ayaNum);
        if (!aya) return fail(reply, 404, `Aya ${ayaNum} in Surah ${surahNum} not found`);

        return ok(reply, { surahNumber: surah.number, surahName: surah.name, aya, apiName: surah.apiName });
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getAyatByText(req: HttpRequest<{ Querystring: { text?: string; limit?: string } }>, reply: HttpReply) {
    const text = req.query.text?.trim();
    if (!text) return fail(reply, 400, 'Query parameter "text" is required');

    const limit = parseInteger(req.query.limit ?? '50');
    if (Number.isNaN(limit) || limit < 1 || limit > 500) return fail(reply, 400, 'limit must be an integer between 1 and 500');

    try {
        const data = await getAyatContent();
        const results: { surahNumber: number; surahName: string; aya: AyaItem; apiName: string }[] = [];
        const queryNorm = normalizeArabicForQuranSearch(text);

        for (const surah of data.surahs) {
            for (const aya of surah.ayat) {
                if (normalizeArabicForQuranSearch(aya.text).includes(queryNorm)) {
                    results.push({ surahNumber: surah.number, surahName: surah.name, aya, apiName: surah.apiName });
                    if (results.length >= limit) break;
                }
            }
            if (results.length >= limit) break;
        }

        if (results.length === 0) return fail(reply, 404, `No Ayat found containing "${text}"`);
        return reply.send({ success: true, total: results.length, data: results });
    } catch (err) {
        return unavailable(reply, err);
    }
}
