/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { getSurahContent } from './surah.service.js';
import { normalizeArabic } from '../../utils/arabic.js';
import { fail, ok, unavailable } from '../../utils/http.js';
import { parseInteger } from '../../utils/validation.js';

export async function getSurah(_req: HttpRequest, reply: HttpReply) {
    try {
        const data = await getSurahContent();
        return ok(reply, data);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getSurahById(req: HttpRequest<{ Params: { id: string } }>, reply: HttpReply) {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id) || id < 1 || id > 114) return fail(reply, 400, 'Surah id must be between 1 and 114');

    try {
        const data = await getSurahContent();
        const surah = data.surah.find((s) => s.id === id);
        if (!surah) return fail(reply, 404, 'Surah not found');
        return ok(reply, surah);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getSurahByName(req: HttpRequest<{ Querystring: { name?: string } }>, reply: HttpReply) {
    const name = req.query.name?.trim();
    if (!name) return fail(reply, 400, 'Query parameter "name" is required');

    try {
        const data = await getSurahContent();
        const search = normalizeArabic(name);
        const matches = data.surah.filter((r) => normalizeArabic(r.name).includes(search));

        if (matches.length === 0) return fail(reply, 404, 'Surah not found');
        return ok(reply, matches);
    } catch (err) {
        return unavailable(reply, err);
    }
}
