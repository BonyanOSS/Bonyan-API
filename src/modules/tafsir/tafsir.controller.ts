/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { getTafsir, isSupportedEdition, listEditions } from './tafsir.service.js';
import { fail, ok, unavailable } from '../../utils/http.js';
import { parseInteger } from '../../utils/validation.js';
import { SURAH_METADATA } from '../surah/surah.metadata.js';

export async function getTafsirEditions(_req: HttpRequest, reply: HttpReply) {
    return ok(reply, listEditions());
}

export async function getTafsirForSurah(
    req: HttpRequest<{ Params: { edition: string; surah: string }; Querystring: { aya?: string } }>,
    reply: HttpReply,
) {
    const { edition, surah } = req.params;
    if (!isSupportedEdition(edition)) return fail(reply, 400, 'Unsupported tafsir edition');

    const surahNum = parseInteger(surah);
    if (Number.isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
        return fail(reply, 400, 'Surah number must be between 1 and 114');
    }

    let ayaNum: number | undefined;
    if (req.query.aya !== undefined) {
        ayaNum = parseInteger(req.query.aya);
        if (Number.isNaN(ayaNum) || ayaNum < 1) return fail(reply, 400, 'Aya number must be a positive integer');
        if (ayaNum > SURAH_METADATA[surahNum - 1]!.ayahCount) return fail(reply, 404, 'Aya not found');
    }

    try {
        const result = await getTafsir(edition, surahNum, ayaNum);
        if (result.length === 0) return fail(reply, 404, 'Tafsir not found');
        return ok(reply, result);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getTafsirForAya(req: HttpRequest<{ Params: { edition: string; surah: string; aya: string } }>, reply: HttpReply) {
    const { edition, surah, aya } = req.params;
    if (!isSupportedEdition(edition)) return fail(reply, 400, 'Unsupported tafsir edition');

    const surahNum = parseInteger(surah);
    const ayaNum = parseInteger(aya);
    if (Number.isNaN(surahNum) || surahNum < 1 || surahNum > 114) return fail(reply, 400, 'Surah number must be between 1 and 114');
    if (Number.isNaN(ayaNum) || ayaNum < 1) return fail(reply, 400, 'Aya number must be a positive integer');
    if (ayaNum > SURAH_METADATA[surahNum - 1]!.ayahCount) return fail(reply, 404, 'Aya not found');

    try {
        const result = await getTafsir(edition, surahNum, ayaNum);
        if (result.length === 0) return fail(reply, 404, 'Tafsir not found');
        return ok(reply, result[0]);
    } catch (err) {
        return unavailable(reply, err);
    }
}
