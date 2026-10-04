/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { getQibla } from './qibla.service.js';
import { fail, ok, unavailable } from '../../utils/http.js';

export async function qiblaDirection(req: HttpRequest<{ Querystring: { latitude?: string; longitude?: string } }>, reply: HttpReply) {
    if (!req.query.latitude?.trim() || !req.query.longitude?.trim()) return fail(reply, 400, 'latitude and longitude are required');
    const lat = Number(req.query.latitude);
    const lng = Number(req.query.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return fail(reply, 400, 'latitude and longitude query parameters are required and must be numeric');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return fail(reply, 400, 'latitude must be in [-90, 90] and longitude in [-180, 180]');
    }

    try {
        return ok(reply, await getQibla(lat, lng));
    } catch (err) {
        return unavailable(reply, err);
    }
}
