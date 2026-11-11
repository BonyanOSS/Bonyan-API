/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import qiblaRoutes from '../src/modules/qibla/qibla.route';

describe('Qibla Controller', () => {
    const app = Fastify();

    beforeAll(async () => {
        await app.register(qiblaRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('rejects missing coordinates', async () => {
        const res = await app.inject({ method: 'GET', url: '/qibla' });
        expect(res.statusCode).toBe(400);
    });

    it('rejects out-of-range latitude', async () => {
        const res = await app.inject({ method: 'GET', url: '/qibla?latitude=120&longitude=39' });
        expect(res.statusCode).toBe(400);
    });

    it('returns a direction for Riyadh (live or local fallback)', async () => {
        const res = await app.inject({ method: 'GET', url: '/qibla?latitude=24.7136&longitude=46.6753' });
        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(body.data.direction).toBeGreaterThanOrEqual(0);
        expect(body.data.direction).toBeLessThan(360);
    });
});
