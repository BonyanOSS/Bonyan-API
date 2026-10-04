/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { getPrayerTimes, isSupportedMethod } from './prayer.service.js';
import { parseInteger, validGregorianDate } from '../../utils/validation.js';
import { fail, ok, unavailable } from '../../utils/http.js';

interface PrayerQS {
    date?: string;
    latitude?: string;
    longitude?: string;
    city?: string;
    country?: string;
    method?: string;
    timezone?: string;
}

function todayDDMMYYYY(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function parseFloatOpt(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const num = value.trim() ? Number(value) : NaN;
    return Number.isFinite(num) ? num : NaN;
}

export async function getTimings(req: FastifyRequest<{ Querystring: PrayerQS }>, reply: FastifyReply) {
    const date = req.query.date?.trim() || todayDDMMYYYY();
    if (!validGregorianDate(date)) return fail(reply, 400, 'Date must be a valid date in DD-MM-YYYY format');

    const lat = parseFloatOpt(req.query.latitude);
    const lng = parseFloatOpt(req.query.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return fail(reply, 400, 'latitude/longitude must be numeric');

    if (lat !== undefined && (lat < -90 || lat > 90)) return fail(reply, 400, 'latitude must be in [-90, 90]');
    if (lng !== undefined && (lng < -180 || lng > 180)) return fail(reply, 400, 'longitude must be in [-180, 180]');
    if ((lat === undefined) !== (lng === undefined)) return fail(reply, 400, 'Provide both latitude and longitude');
    const method = req.query.method === undefined ? 4 : parseInteger(req.query.method);
    if (!isSupportedMethod(method)) return fail(reply, 400, 'Unsupported method. Use 1, 2, 3, 4, 5, 9, 10 or 11');
    const timezone = req.query.timezone?.trim() ?? 'UTC';
    try {
        new Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
        return fail(reply, 400, 'Invalid IANA timezone');
    }

    const city = req.query.city?.trim() || undefined;
    const country = req.query.country?.trim() || undefined;

    if ((lat === undefined || lng === undefined) && (!city || !country)) {
        return fail(reply, 400, 'Provide either latitude+longitude OR city+country');
    }

    try {
        const result = await getPrayerTimes({ date, latitude: lat, longitude: lng, city, country, method, timezone });
        return ok(reply, result);
    } catch (err) {
        return unavailable(reply, err);
    }
}
