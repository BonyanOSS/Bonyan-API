/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import assert from 'node:assert/strict';
import { unstable_dev, unstable_readConfig } from 'wrangler';

const config = unstable_readConfig({ config: 'wrangler.toml' });
if (!config.main) throw new Error('wrangler.toml must define a Worker entrypoint');

// Bundling alone cannot detect startup errors or runtime-incompatible APIs.
const worker = await unstable_dev(config.main, {
    config: 'wrangler.toml',
    local: true,
    port: 0,
    inspectorPort: 0,
    persist: false,
    logLevel: 'error',
    experimental: { disableExperimentalWarning: true, disableDevRegistry: true, watch: false },
});

try {
    for (const [path, expected] of [
        ['/health', 'ok'],
        ['/ready', 'ready'],
    ]) {
        const response = await worker.fetch(path!);
        assert.equal(response.status, 200);
        assert.equal(((await response.json()) as { status: string }).status, expected);
    }
    const catalogue = await worker.fetch('/');
    const body = (await catalogue.json()) as { routes: { method: string; url: string }[] };
    assert.equal(body.routes.filter((r) => r.method === 'GET').length, 27);
    const metrics = await worker.fetch('/metrics');
    assert.equal(metrics.status, 200);
    assert.match(await metrics.text(), /bonyan_api_cache_entries/);
    const invalid = await worker.fetch('/qibla?latitude=91&longitude=46');
    assert.equal(invalid.status, 400);
    assert.equal(((await invalid.json()) as { success: boolean }).success, false);
    const missing = await worker.fetch('/unknown');
    assert.equal(missing.status, 404);
    const head = await worker.fetch('/health', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const preflight = await worker.fetch('/health', {
        method: 'OPTIONS',
        headers: { Origin: 'https://client.example', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://client.example');
    if (process.argv.includes('--live')) {
        for (const path of [
            '/surah/1',
            '/reciters/123',
            '/reciters/123/surah/1',
            '/ayat/1/aya/1',
            '/ayat',
            '/azkar',
            '/tafsir/muyassar/1/2',
            '/tafsir/saadi/1/2',
            '/hadith/bukhari/1',
            '/prayer/times?date=04-10-2026&latitude=21.4225&longitude=39.8262',
            '/hijri/from-gregorian?date=04-10-2026',
            '/hijri/to-gregorian?date=23-04-1448',
            '/qibla?latitude=24.7136&longitude=46.6753',
        ]) {
            const response = await worker.fetch(path);
            const text = await response.text();
            console.log(JSON.stringify({ path, status: response.status, bytes: text.length }));
            assert.equal(response.status, 200, text.slice(0, 300));
            assert.equal((JSON.parse(text) as { success: boolean }).success, true);
        }
    }
    console.log('Native Worker startup, health, routes, validation, HEAD and CORS passed in workerd.');
} finally {
    await worker.stop();
}
