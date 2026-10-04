/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import recitersRoutes from '../src/modules/reciters/reciters.route';

describe('Reciters Controller', () => {
    const app = Fastify();

    beforeAll(async () => {
        vi.mocked(fetch).mockImplementation(async (_url, init) => {
            if (init?.method === 'HEAD') return new Response(null, { headers: { 'content-type': 'audio/mpeg' } });
            throw new Error('Primary source unavailable');
        });
        await app.register(recitersRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return reciters list', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/reciters',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });

    it('should return reciter by id', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/reciters/1',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });

    it('should return 404 for non-existing reciter', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/reciters/999',
        });

        expect(res.statusCode).toBe(404);
    });

    it('should return surah audio for existing reciter and surah', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/reciters/1/surah/1',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });

    it('should return 400 for non-existing surah', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/reciters/1/surah/999',
        });

        expect(res.statusCode).toBe(400);
    });

    it('should return reciter by name', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/reciters/search?name=عبدالباسط عبدالصمد',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });
});
