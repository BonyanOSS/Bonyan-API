/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

export function requiredText(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || /^(unknown|null|undefined)$/i.test(value.trim())) {
        throw new Error('Upstream returned missing text');
    }
    return value.trim();
}

export function positiveInteger(value: unknown): number {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1) throw new Error('Upstream returned invalid number');
    return number;
}

export function parseInteger(value: string): number {
    return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : NaN;
}

export function validGregorianDate(value: string): boolean {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;
    const [day, month, year] = value.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function httpsUrl(value: unknown): string {
    const url = new URL(requiredText(value));
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Upstream returned invalid HTTPS URL');
    return url.toString();
}
