/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import hadithRoutes from '../src/modules/hadith/hadith.route';
import { clearCache } from '../src/utils/cache';

describe('Hadith Controller', () => {
    const app = Fastify();
    const originalFetch = globalThis.fetch;

    beforeAll(async () => {
        await app.register(hadithRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        clearCache();
        vi.restoreAllMocks();
    });

    it('returns book list or fails gracefully', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [{ id: 'bukhari', name: 'Sahih Bukhari', available: 7008 }],
            }),
        } as Response) as typeof globalThis.fetch;

        const res = await app.inject({ method: 'GET', url: '/hadith' });
        expect([200, 503]).toContain(res.statusCode);
    });

    it('rejects oversized range', async () => {
        const res = await app.inject({ method: 'GET', url: '/hadith/bukhari?from=1&to=500' });
        expect(res.statusCode).toBe(400);
    });

    it('rejects invalid hadith number', async () => {
        const res = await app.inject({ method: 'GET', url: '/hadith/bukhari/abc' });
        expect(res.statusCode).toBe(400);
    });
});
