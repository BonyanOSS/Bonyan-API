/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { AlAdhanHijriResponse } from '../../types/Api.js';
import type { HijriDate } from '../../types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { requiredText, validGregorianDate } from '../../utils/validation.js';

function map(json: AlAdhanHijriResponse): HijriDate {
    const data = json.data;
    return {
        hijri: {
            date: requiredText(data.hijri.date),
            day: requiredText(data.hijri.day),
            month: requiredText(data.hijri.month.en),
            monthAr: requiredText(data.hijri.month.ar),
            year: requiredText(data.hijri.year),
            weekday: requiredText(data.hijri.weekday.en),
            weekdayAr: requiredText(data.hijri.weekday.ar),
        },
        gregorian: {
            date: requiredText(data.gregorian.date),
            day: requiredText(data.gregorian.day),
            month: requiredText(data.gregorian.month.en),
            year: requiredText(data.gregorian.year),
        },
        calendar: requiredText(data.hijri.method),
        apiName: 'aladhan.com',
    };
}
function localDate(date: Date): HijriDate {
    const parts = (locale: string, calendar: string) =>
        Object.fromEntries(
            new Intl.DateTimeFormat(locale, { calendar, timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' })
                .formatToParts(date)
                .map((p) => [p.type, p.value]),
        );
    const hijri = parts('en', 'islamic-umalqura');
    const arabic = parts('ar-u-nu-latn', 'islamic-umalqura');
    const gregorian = parts('en', 'gregory');
    const numbers = Object.fromEntries(
        new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
            .formatToParts(date)
            .map((p) => [p.type, p.value]),
    );
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        hijri: {
            date: numbers.day + '-' + numbers.month + '-' + numbers.year!.padStart(4, '0'),
            day: hijri.day!,
            month: hijri.month!,
            monthAr: arabic.month!,
            year: hijri.year!,
            weekday: hijri.weekday!,
            weekdayAr: arabic.weekday!,
        },
        gregorian: {
            date: pad(date.getUTCDate()) + '-' + pad(date.getUTCMonth() + 1) + '-' + String(date.getUTCFullYear()).padStart(4, '0'),
            day: gregorian.day!,
            month: gregorian.month!,
            year: gregorian.year!,
        },
        calendar: 'islamic-umalqura',
        apiName: 'local',
    };
}
function localGregorian(date: string): HijriDate {
    if (!validGregorianDate(date)) throw new Error('Invalid Gregorian date');
    const [day, month, year] = date.split('-').map(Number) as [number, number, number];
    return localDate(new Date(Date.UTC(year, month - 1, day)));
}
function localHijri(date: string): HijriDate {
    const [day, month, year] = date.split('-').map(Number) as [number, number, number];
    const target = year * 10000 + month * 100 + day;
    let low = Date.UTC(622, 0, 1) / 86400000,
        high = Date.UTC(3000, 0, 1) / 86400000;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const result = localDate(new Date(mid * 86400000));
        const [d, m, y] = result.hijri.date.split('-').map(Number) as [number, number, number];
        const current = y * 10000 + m * 100 + d;
        if (current === target) return result;
        if (current < target) low = mid + 1;
        else high = mid - 1;
    }
    throw new Error('Hijri date does not exist in Umm al-Qura calendar');
}
export function buildHijriApis(path: 'gToH' | 'hToG', date: string): (() => Promise<HijriDate>)[] {
    return [
        async () => {
            const result = map(await fetchJson<AlAdhanHijriResponse>('https://api.aladhan.com/v1/' + path + '/' + date + '?calendarMethod=UAQ'));
            if (!validGregorianDate(result.gregorian.date) || (path === 'gToH' ? result.gregorian.date : result.hijri.date) !== date)
                throw new Error('Wrong calendar conversion date');
            const canonical = path === 'gToH' ? localGregorian(date) : localHijri(date);
            if (result.calendar !== 'UAQ' || result.hijri.date !== canonical.hijri.date || result.gregorian.date !== canonical.gregorian.date) {
                throw new Error('Unexpected Umm al-Qura conversion');
            }
            return { ...canonical, apiName: 'aladhan.com' };
        },
        async () => (path === 'gToH' ? localGregorian(date) : localHijri(date)),
    ];
}
export async function gregorianToHijri(date: string): Promise<HijriDate> {
    return memoize('hijri:g2h:' + date, () => runWithFallback(buildHijriApis('gToH', date)), { ttlMs: 1000 * 60 * 60 * 24 * 7 });
}
export async function hijriToGregorian(date: string): Promise<HijriDate> {
    return memoize('hijri:h2g:' + date, () => runWithFallback(buildHijriApis('hToG', date)), { ttlMs: 1000 * 60 * 60 * 24 * 7 });
}
