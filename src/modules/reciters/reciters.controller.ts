/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { getRadioContent, resolveReciterAudio } from './reciters.service.js';
import { parseInteger } from '../../utils/validation.js';
import { normalizeArabic } from '../../utils/arabic.js';
import { fail, ok, unavailable } from '../../utils/http.js';

export async function getRadio(_req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await getRadioContent();
        return ok(reply, data);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getReciterById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id) || id < 1) return fail(reply, 400, 'Invalid reciter id');

    try {
        const data = await getRadioContent();
        const reciter = data.reciters.find((r) => r.id === id);
        if (!reciter) return fail(reply, 404, 'Reciter not found');
        return ok(reply, reciter);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getReciterSurah(
    req: FastifyRequest<{ Params: { id: string; surah: string }; Querystring: { moshaf?: string } }>,
    reply: FastifyReply,
) {
    const reciterId = parseInteger(req.params.id);
    const surahNum = parseInteger(req.params.surah);
    const moshafId = req.query.moshaf === undefined ? undefined : parseInteger(req.query.moshaf);
    if (moshafId !== undefined && (Number.isNaN(moshafId) || moshafId < 1)) return fail(reply, 400, 'Invalid moshaf id');

    if (Number.isNaN(reciterId) || reciterId < 1) return fail(reply, 400, 'Invalid reciter id');
    if (Number.isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
        return fail(reply, 400, 'Invalid surah number. Must be between 1 and 114');
    }

    try {
        const data = await getRadioContent();
        const reciter = data.reciters.find((r) => r.id === reciterId);

        if (!reciter) return fail(reply, 404, 'Reciter not found');
        const audio = await resolveReciterAudio(reciter, surahNum, moshafId);
        if (!audio) return fail(reply, 404, 'This surah is not available in the requested recording');
        return ok(reply, audio);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getReciterByName(req: FastifyRequest<{ Querystring: { name?: string } }>, reply: FastifyReply) {
    const name = req.query.name?.trim();
    if (!name) return fail(reply, 400, 'Query parameter "name" is required');

    try {
        const data = await getRadioContent();
        const search = normalizeArabic(name);
        const matches = data.reciters.filter((r) => normalizeArabic(r.name).includes(search));

        if (matches.length === 0) return fail(reply, 404, 'Reciter not found');
        return ok(reply, matches);
    } catch (err) {
        return unavailable(reply, err);
    }
}
