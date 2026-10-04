/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { HadithBook, HadithItem, HadithRange, HadithApiSource } from '../../types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { positiveInteger, requiredText } from '../../utils/validation.js';
import { HADITH_BOOKS, HADITH_REVISION } from './hadith.metadata.js';

interface HadithRow {
    number: number;
    arab: string;
}
export function isSupportedBook(id: string): boolean {
    return HADITH_BOOKS.some((b) => b.id === id);
}
function bookMeta(id: string) {
    const book = HADITH_BOOKS.find((b) => b.id === id);
    if (!book) throw new Error('Unsupported hadith book');
    return book;
}
export async function listBooks(): Promise<HadithBook[]> {
    return HADITH_BOOKS.map((b) => ({ ...b, apiName: 'local' }));
}
function normalize(rows: HadithRow[], bookId: string, apiName: HadithApiSource): HadithItem[] {
    const book = bookMeta(bookId);
    if (rows.length !== book.available) throw new Error('Incomplete hadith book');
    const result = rows
        .map((r) => ({ number: positiveInteger(r.number), text: requiredText(r.arab), book: book.name, apiName }))
        .sort((a, b) => a.number - b.number);
    if (new Set(result.map((r) => r.number)).size !== result.length) throw new Error('Duplicate hadith number');
    return result;
}
export function buildHadithApis(bookId: string): (() => Promise<HadithItem[]>)[] {
    bookMeta(bookId);
    const path = HADITH_REVISION + '/books/' + bookId + '.json';
    return [
        async () =>
            normalize(
                await fetchJson<HadithRow[]>('https://cdn.jsdelivr.net/gh/gadingnst/hadith-api@' + path, 30000),
                bookId,
                'cdn.jsdelivr.net/gadingnst/hadith-api',
            ),
        async () =>
            normalize(
                await fetchJson<HadithRow[]>('https://raw.githubusercontent.com/gadingnst/hadith-api/' + path, 30000),
                bookId,
                'raw.githubusercontent.com/gadingnst/hadith-api',
            ),
    ];
}
async function loadBook(bookId: string): Promise<HadithItem[]> {
    return memoize('hadith:full:' + bookId, () => runWithFallback(buildHadithApis(bookId)), { ttlMs: 1000 * 60 * 60 * 12 });
}
export async function getBook(bookId: string, range = { from: 1, to: 30 }): Promise<HadithRange> {
    const meta = bookMeta(bookId);
    const rows = await loadBook(bookId);
    return { book: meta.name, available: meta.available, hadiths: rows.filter((h) => h.number >= range.from && h.number <= range.to) };
}
export async function getHadith(bookId: string, number: number): Promise<HadithItem | null> {
    return (await loadBook(bookId)).find((h) => h.number === number) ?? null;
}
export async function getRandomHadithItem(bookId: string): Promise<HadithItem> {
    const rows = await loadBook(bookId);
    return rows[Math.floor(Math.random() * rows.length)]!;
}
