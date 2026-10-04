/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import type { AlAdhanTimingsResponse, ApiFunction } from '../../types/Api.js';
import type { PrayerTimings } from '../../types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { requiredText, validGregorianDate } from '../../utils/validation.js';

export interface PrayerQuery {
    date: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    method?: number;
    timezone?: string;
}
// Only these methods have verified equivalent parameters in the local adapter.
const METHODS = {
    1: { label: 'University of Islamic Sciences, Karachi', create: CalculationMethod.Karachi },
    2: { label: 'Islamic Society of North America (ISNA)', create: CalculationMethod.NorthAmerica },
    3: { label: 'Muslim World League', create: CalculationMethod.MuslimWorldLeague },
    4: { label: 'Umm Al-Qura University, Makkah', create: CalculationMethod.UmmAlQura },
    5: { label: 'Egyptian General Authority of Survey', create: CalculationMethod.Egyptian },
    9: { label: 'Kuwait', create: CalculationMethod.Kuwait },
    10: { label: 'Qatar', create: CalculationMethod.Qatar },
    11: { label: 'Majlis Ugama Islam Singapura, Singapore', create: CalculationMethod.Singapore },
} as const;
export function isSupportedMethod(method: number): method is keyof typeof METHODS {
    return Object.hasOwn(METHODS, method);
}
const KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Sunset', 'Maghrib', 'Isha'] as const;
function time(value: string): string {
    const match = /^(\d{2}:\d{2})(?:\s.*)?$/.exec(requiredText(value));
    if (!match || Number(match[1]!.slice(0, 2)) > 23 || Number(match[1]!.slice(3)) > 59) throw new Error('Invalid prayer time');
    return match[1]!;
}
function normalize(q: PrayerQuery, json: AlAdhanTimingsResponse): PrayerTimings {
    const data = json.data;
    if (!validGregorianDate(data.date.gregorian.date) || data.date.gregorian.date !== q.date || data.meta.method.id !== (q.method ?? 4))
        throw new Error('Wrong prayer date or method');
    if (data.meta.timezone !== (q.timezone ?? 'UTC')) throw new Error('Wrong prayer timezone');
    if (!Number.isFinite(data.meta.latitude) || !Number.isFinite(data.meta.longitude)) throw new Error('Invalid prayer coordinates');
    if (q.latitude !== undefined && (Math.abs(q.latitude - data.meta.latitude) > 0.01 || Math.abs(q.longitude! - data.meta.longitude) > 0.01))
        throw new Error('Wrong prayer coordinates');
    return {
        date: q.date,
        hijri: requiredText(data.date.hijri.date),
        timezone: data.meta.timezone,
        timings: Object.fromEntries(KEYS.map((k) => [k, time(data.timings[k]!)])) as PrayerTimings['timings'],
        method: METHODS[(q.method ?? 4) as keyof typeof METHODS].label,
        coordinates: { latitude: data.meta.latitude, longitude: data.meta.longitude },
        apiName: 'aladhan.com',
    };
}
async function local(q: PrayerQuery): Promise<PrayerTimings> {
    if (q.latitude === undefined || q.longitude === undefined) throw new Error('Local prayer calculation needs coordinates');
    const method = q.method ?? 4;
    if (!isSupportedMethod(method)) throw new Error('Unsupported prayer method');
    const [day, month, year] = q.date.split('-').map(Number) as [number, number, number];
    const date = new Date(year, month - 1, day);
    const parameters = METHODS[method].create();
    // Umm al-Qura/Qatar use a 120-minute Isha interval during Ramadan.
    const islamicMonth = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: 'UTC' }).format(
        new Date(Date.UTC(year, month - 1, day)),
    );
    if ((method === 4 || method === 10) && Number(islamicMonth) === 9) parameters.ishaInterval = 120;
    const prayer = new PrayerTimes(new Coordinates(q.latitude, q.longitude), date, parameters);
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: q.timezone ?? 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const values = [prayer.fajr, prayer.sunrise, prayer.dhuhr, prayer.asr, prayer.sunset, prayer.maghrib, prayer.isha];
    if (values.some((v) => !Number.isFinite(v.getTime()))) throw new Error('Prayer calculation unavailable at these coordinates/date');
    return {
        date: q.date,
        timezone: q.timezone ?? 'UTC',
        timings: Object.fromEntries(KEYS.map((key, i) => [key, formatter.format(values[i]!)])) as PrayerTimings['timings'],
        method: METHODS[method].label,
        coordinates: { latitude: q.latitude, longitude: q.longitude },
        apiName: 'local',
    };
}
export function buildApis(q: PrayerQuery): ApiFunction<PrayerTimings>[] {
    const query = new URLSearchParams({ method: String(q.method ?? 4), school: '0', timezonestring: q.timezone ?? 'UTC' });
    const apis: ApiFunction<PrayerTimings>[] = [];
    if (q.latitude !== undefined && q.longitude !== undefined) {
        query.set('latitude', String(q.latitude));
        query.set('longitude', String(q.longitude));
        apis.push(async () => [
            normalize(q, await fetchJson<AlAdhanTimingsResponse>('https://api.aladhan.com/v1/timings/' + q.date + '?' + query, 10000)),
        ]);
    } else if (q.city && q.country) {
        query.set('city', q.city);
        query.set('country', q.country);
        apis.push(async () => [
            normalize(q, await fetchJson<AlAdhanTimingsResponse>('https://api.aladhan.com/v1/timingsByCity/' + q.date + '?' + query, 10000)),
        ]);
    }
    if (q.latitude !== undefined && q.longitude !== undefined) apis.push(async () => [await local(q)]);
    return apis;
}
export async function getPrayerTimes(q: PrayerQuery): Promise<PrayerTimings> {
    if (!validGregorianDate(q.date) || !isSupportedMethod(q.method ?? 4)) throw new Error('Invalid prayer date or method');
    const key = 'prayer:' + JSON.stringify(q);
    return memoize(key, async () => (await runWithFallback(buildApis(q)))[0]!, { ttlMs: 1000 * 60 * 60 });
}
