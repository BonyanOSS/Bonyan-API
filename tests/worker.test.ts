/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';
import { createWorkerApp } from '../src/http/worker-app';
import { clearCache } from '../src/utils/cache';

let node: Awaited<ReturnType<typeof buildApp>>;
let worker: ReturnType<typeof createWorkerApp>;
beforeEach(async () => {
    clearCache();
    node = await buildApp({ logger: false });
    worker = createWorkerApp();
});
afterEach(async () => {
    await node.close();
    clearCache();
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

async function request(path: string, init: RequestInit = {}, env: Record<string, string> = {}) {
    return worker.fetch(new Request('https://api.example' + path, init), env);
}

describe('native Worker HTTP adapter', () => {
    it.each(['/surah/search', '/reciters/search', '/ayat/search', '/azkar/search', '/hadith/random', '/surah/1abc', '/unknown'])(
        'preserves static route precedence and error envelopes for %s',
        async (path) => {
            const expected = await node.inject(path);
            const response = await request(path);
            expect(response.status).toBe(expected.statusCode);
            const body = await response.json();
            expect(body).toMatchObject({ success: false, message: expected.json().message, error: { code: expected.json().error.code } });
        },
    );

    it('decodes Arabic path segments and prioritizes search over ID routes', async () => {
        const path = '/surah/search?name=' + encodeURIComponent('الفاتحة');
        const expected = await node.inject(path);
        const response = await request(path);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(expected.json());
    });

    it('retains case-sensitive routes and rejects malformed URL encoding', async () => {
        expect((await request('/HEALTH')).status).toBe(404);
        expect((await request('/azkar/%E0%A4%A')).status).toBe(400);
        expect((await request('/surah/')).status).toBe((await node.inject('/surah/')).statusCode);
    });

    it('preserves repeated query parameters instead of silently selecting a value', async () => {
        const path = '/qibla?latitude=24&latitude=25&longitude=46';
        const expected = await node.inject(path);
        const response = await request(path);
        expect(response.status).toBe(expected.statusCode);
        expect(await response.json()).toMatchObject({ message: expected.json().message });
    });

    it('returns HEAD headers with an empty response body', async () => {
        const response = await request('/health', { method: 'HEAD' });
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');
        expect(await response.text()).toBe('');
        expect((await request('/health', { method: 'POST' })).status).toBe(404);
    });

    it('reflects allowed CORS origins and handles preflight', async () => {
        const headers = { origin: 'https://client.example', 'access-control-request-method': 'GET', 'access-control-request-headers': 'x-test' };
        const response = await request('/health', { method: 'OPTIONS', headers }, { CORS_ORIGIN: 'https://client.example' });
        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-origin')).toBe(headers.origin);
        expect(response.headers.get('access-control-allow-headers')).toBe('x-test');
        expect(response.headers.get('vary')).toContain('Access-Control-Request-Headers');
        const denied = await request('/health', { headers: { origin: 'https://other.example' } }, { CORS_ORIGIN: headers.origin });
        expect(denied.headers.has('access-control-allow-origin')).toBe(false);
        expect((await request('/health', { method: 'OPTIONS' })).status).toBe(400);
    });

    it('limits each client IP and resets after the configured window', async () => {
        vi.useFakeTimers();
        const env = { RATE_LIMIT_MAX: '1', RATE_LIMIT_WINDOW: '2 seconds' };
        const init = { headers: { 'cf-connecting-ip': '192.0.2.1' } };
        expect((await request('/health', init, env)).status).toBe(200);
        const limited = await request('/health', init, env);
        expect(limited.status).toBe(429);
        expect(limited.headers.get('retry-after')).toBe('2');
        expect(await limited.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } });
        expect((await request('/health', { headers: { 'cf-connecting-ip': '192.0.2.2' } }, env)).status).toBe(200);
        vi.advanceTimersByTime(2000);
        expect((await request('/health', init, env)).status).toBe(200);
    });
});
