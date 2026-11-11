/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import tafsirRoutes from '../src/modules/tafsir/tafsir.route';

describe('Tafsir Controller', () => {
    const app = Fastify();

    beforeAll(async () => {
        await app.register(tafsirRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('lists supported editions', async () => {
        const res = await app.inject({ method: 'GET', url: '/tafsir' });
        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('rejects unsupported edition', async () => {
        const res = await app.inject({ method: 'GET', url: '/tafsir/unknown/1' });
        expect(res.statusCode).toBe(400);
    });

    it('rejects invalid surah number', async () => {
        const res = await app.inject({ method: 'GET', url: '/tafsir/muyassar/200' });
        expect(res.statusCode).toBe(400);
    });

    it('rejects invalid aya number', async () => {
        const res = await app.inject({ method: 'GET', url: '/tafsir/muyassar/1/0' });
        expect(res.statusCode).toBe(400);
    });
});
