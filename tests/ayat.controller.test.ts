/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import ayatRoutes from '../src/modules/ayat/ayat.route';
import { vi } from 'vitest';

vi.mock('../src/modules/ayat/ayat.service', () => ({
    getAyatContent: vi.fn(async () => ({
        surahs: [{ number: 1, name: 'الفاتحة', apiName: 'alquran.cloud', ayat: [{ number: 1, text: 'بسم الله الرحمن الرحيم', numberInSurah: 1 }] }],
    })),
}));

describe('Ayat Controller', () => {
    const app = Fastify();

    beforeAll(async () => {
        await app.register(ayatRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return ayat list', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ayat',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });

    it('should return ayat by id', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ayat/1',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });

    it('should return 400 for invalid ayat id', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ayat/9999',
        });

        expect(res.statusCode).toBe(400);
    });

    it('should return ayat by surah and aya', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ayat/1/aya/1',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });

    it('should return ayat by text', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ayat/search?text=الله',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toBeDefined();
    });
});
