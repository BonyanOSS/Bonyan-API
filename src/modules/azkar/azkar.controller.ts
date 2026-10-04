/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type HttpReply, type HttpRequest } from '../../http/types.js';
import { getAzkarContent } from './azkar.service.js';
import { normalizeArabic } from '../../utils/arabic.js';
import { fail, ok, unavailable } from '../../utils/http.js';
import { parseInteger } from '../../utils/validation.js';
import type { AzkarItem, AzkarApiSource } from '../../types/Items.js';

type AzkarResult = { category: string; item: AzkarItem; apiName: AzkarApiSource };

export async function getAzkarCategories(_req: HttpRequest, reply: HttpReply) {
    try {
        const data = await getAzkarContent();
        return ok(reply, {
            categories: data.categories.map((c) => ({ name: c.category, count: c.items.length, apiName: c.apiName })),
        });
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getAzkarByCategory(req: HttpRequest<{ Params: { category: string } }>, reply: HttpReply) {
    const target = req.params.category.trim();
    if (!target) return fail(reply, 400, 'Category is required');

    try {
        const data = await getAzkarContent();
        const search = normalizeArabic(target);
        const category = data.categories.find((c) => normalizeArabic(c.category).includes(search));

        if (!category) return fail(reply, 404, 'Category not found');
        return ok(reply, category);
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function searchAzkar(req: HttpRequest<{ Querystring: { text?: string; limit?: string } }>, reply: HttpReply) {
    const text = req.query.text?.trim();
    if (!text) return fail(reply, 400, 'Query parameter "text" is required');

    const limit = parseInteger(req.query.limit ?? '50');
    if (Number.isNaN(limit) || limit < 1 || limit > 200) return fail(reply, 400, 'limit must be an integer between 1 and 200');

    try {
        const data = await getAzkarContent();
        const search = normalizeArabic(text);
        const results: AzkarResult[] = [];

        for (const cat of data.categories) {
            for (const item of cat.items) {
                if (normalizeArabic(item.text).includes(search)) {
                    results.push({ category: cat.category, item, apiName: cat.apiName });
                    if (results.length >= limit) break;
                }
            }
            if (results.length >= limit) break;
        }

        if (results.length === 0) return fail(reply, 404, `No azkar found containing "${text}"`);
        return reply.send({ success: true, total: results.length, data: results });
    } catch (err) {
        return unavailable(reply, err);
    }
}

export async function getRandomZekr(_req: HttpRequest, reply: HttpReply) {
    try {
        const data = await getAzkarContent();
        const allItems: AzkarResult[] = [];
        for (const cat of data.categories) {
            for (const item of cat.items) allItems.push({ category: cat.category, item, apiName: cat.apiName });
        }

        if (allItems.length === 0) return fail(reply, 404, 'No azkar available');
        const pick = allItems[Math.floor(Math.random() * allItems.length)];
        return ok(reply, pick);
    } catch (err) {
        return unavailable(reply, err);
    }
}
