/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import recitersRoutes from './modules/reciters/reciters.route.js';
import surahRoutes from './modules/surah/surah.route.js';
import ayatRoutes from './modules/ayat/ayat.route.js';
import azkarRoutes from './modules/azkar/azkar.route.js';
import tafsirRoutes from './modules/tafsir/tafsir.route.js';
import hadithRoutes from './modules/hadith/hadith.route.js';
import prayerRoutes from './modules/prayer/prayer.route.js';
import hijriRoutes from './modules/hijri/hijri.route.js';
import qiblaRoutes from './modules/qibla/qibla.route.js';
import { getCacheStats } from './utils/cache.js';
import { fail } from './utils/http.js';
import { renderMetrics } from './utils/metrics.js';

export async function buildApp(options: FastifyServerOptions = {}) {
    const app = Fastify({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
        },
        trustProxy: process.env.TRUST_PROXY === 'true',
        ...options,
    });

    await app.register(cors, { origin: parseCorsOrigin(process.env.CORS_ORIGIN) });

    await app.register(rateLimit, {
        max: Number(process.env.RATE_LIMIT_MAX) || 120,
        timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    });

    type RouteInfo = {
        method: string | string[];
        url: string;
        schema?: object;
    };

    const allRoutes: RouteInfo[] = [];

    app.addHook('onRoute', (routeOptions) => {
        if (['/', '/health', '/ready', '/metrics'].includes(routeOptions.url)) return;
        allRoutes.push({
            method: routeOptions.method,
            url: routeOptions.url,
            schema: routeOptions.schema,
        });
    });

    app.get('/', async () => ({
        name: 'Bonyan-API',
        description: 'Quran & Azkar API with multi-source fallback',
        routes: allRoutes,
    }));

    app.get('/health', async () => ({ status: 'ok', code: 200, timestamp: new Date().toISOString() }));
    app.get('/ready', async () => ({ status: 'ready', code: 200, timestamp: new Date().toISOString(), cache: getCacheStats() }));
    app.get('/metrics', async (_req, reply) => {
        return reply.type('text/plain; version=0.0.4').send(renderMetrics(getCacheStats()));
    });

    app.setNotFoundHandler((req, reply) => {
        return fail(reply, 404, `Route ${req.method} ${req.url} not found`, 'NOT_FOUND');
    });

    app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
        app.log.error(err);
        const status = err.statusCode ?? 500;
        if (status >= 400 && status < 500) {
            return fail(reply, status, err.message);
        }
        return fail(reply, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    });

    await app.register(recitersRoutes);
    await app.register(surahRoutes);
    await app.register(ayatRoutes);
    await app.register(azkarRoutes);
    await app.register(tafsirRoutes);
    await app.register(hadithRoutes);
    await app.register(prayerRoutes);
    await app.register(hijriRoutes);
    await app.register(qiblaRoutes);

    return app;
}

function parseCorsOrigin(value: string | undefined): boolean | string[] {
    if (!value || value.trim() === '*' || value.trim().toLowerCase() === 'true') return true;
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}
