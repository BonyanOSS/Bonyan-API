/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { gregorianToHijri, hijriToGregorian } from './hijri.service.js';
import { fail, ok, unavailable } from '../../utils/http.js';
import { validGregorianDate } from '../../utils/validation.js';

const DATE_RE = /^\d{2}-\d{2}-\d{4}$/;

function todayDDMMYYYY(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export async function convertGregorianToHijri(req: HttpRequest<{ Querystring: { date?: string } }>, reply: HttpReply) {
    const date = req.query.date?.trim() || todayDDMMYYYY();
    if (!validGregorianDate(date)) return fail(reply, 400, 'Date must be a valid date in DD-MM-YYYY format');

    try {
        return ok(reply, await gregorianToHijri(date));
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function convertHijriToGregorian(req: HttpRequest<{ Querystring: { date?: string } }>, reply: HttpReply) {
    const date = req.query.date?.trim();
    if (!date) return fail(reply, 400, 'Query parameter "date" (DD-MM-YYYY) is required');
    if (!DATE_RE.test(date)) return fail(reply, 400, 'Date must be in DD-MM-YYYY format');
    const [day, month, year] = date.split('-').map(Number) as [number, number, number];
    if (day < 1 || day > 30 || month < 1 || month > 12 || year < 1 || year > 2400) return fail(reply, 400, 'Invalid Hijri date');

    try {
        return ok(reply, await hijriToGregorian(date));
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getToday(_req: HttpRequest, reply: HttpReply) {
    try {
        return ok(reply, await gregorianToHijri(todayDDMMYYYY()));
    } catch (err) {
        return unavailable(reply, err);
    }
}
