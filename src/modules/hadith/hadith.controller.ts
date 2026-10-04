/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { getBook, getHadith, getRandomHadithItem, isSupportedBook, listBooks } from './hadith.service.js';
import { parseInteger } from '../../utils/validation.js';
import { fail, ok, unavailable } from '../../utils/http.js';

export async function getHadithBooks(_req: HttpRequest, reply: HttpReply) {
    try {
        const books = await listBooks();
        return ok(reply, books);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getHadithBook(req: HttpRequest<{ Params: { book: string }; Querystring: { from?: string; to?: string } }>, reply: HttpReply) {
    const bookId = req.params.book.trim();
    if (!bookId) return fail(reply, 400, 'Book id is required');
    if (!isSupportedBook(bookId)) return fail(reply, 404, 'Book not found');

    const from = req.query.from === undefined ? 1 : parseInteger(req.query.from);
    const to = req.query.to === undefined ? from + 29 : parseInteger(req.query.to);

    if (Number.isNaN(from) || Number.isNaN(to) || from < 1 || to < from) {
        return fail(reply, 400, 'Invalid range. "from" and "to" must be positive integers with from <= to');
    }
    if (to - from + 1 > 300) return fail(reply, 400, 'Range cannot exceed 300 hadith numbers per request');

    try {
        const data = await getBook(bookId, { from, to });
        return ok(reply, data);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getHadithByNumber(req: HttpRequest<{ Params: { book: string; number: string } }>, reply: HttpReply) {
    const bookId = req.params.book.trim();
    const number = parseInteger(req.params.number);
    if (!bookId) return fail(reply, 400, 'Book id is required');
    if (Number.isNaN(number) || number < 1) return fail(reply, 400, 'Hadith number must be a positive integer');
    if (!isSupportedBook(bookId)) return fail(reply, 404, 'Book not found');

    try {
        const hadith = await getHadith(bookId, number);
        if (!hadith) return fail(reply, 404, 'Hadith not found');
        return ok(reply, hadith);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getRandomHadith(req: HttpRequest<{ Querystring: { book?: string } }>, reply: HttpReply) {
    try {
        const books = await listBooks();
        if (books.length === 0) return fail(reply, 503, 'No hadith books available');

        const targetBook = req.query.book ? books.find((b) => b.id === req.query.book) : books[Math.floor(Math.random() * books.length)];
        if (!targetBook) return fail(reply, 404, 'Book not found');

        const hadith = await getRandomHadithItem(targetBook.id);
        return ok(reply, { book: targetBook.name, hadith });
    } catch (err) {
        return unavailable(reply, err);
    }
}
