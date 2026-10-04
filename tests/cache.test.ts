/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memoize, invalidate, clearCache, withCacheContext } from '../src/utils/cache';

describe('memoize', () => {
    beforeEach(() => clearCache());

    it('isolates pending I/O between Worker requests while sharing settled values', async () => {
        const loader = vi.fn(async () => 42);
        const waitUntil = vi.fn();
        const first = withCacheContext(waitUntil, () => Promise.all([memoize('worker', loader), memoize('worker', loader)]));
        const second = withCacheContext(waitUntil, () => memoize('worker', loader));
        expect(await first).toEqual([42, 42]);
        expect(await second).toBe(42);
        expect(loader).toHaveBeenCalledTimes(2);
        await withCacheContext(waitUntil, () => memoize('worker', loader));
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('extends a stale refresh lifetime with the Worker context', async () => {
        await memoize('stale', async () => 'old', { ttlMs: -1, staleWhileRevalidateMs: 60_000 });
        const tasks: Promise<unknown>[] = [];
        const value = await withCacheContext(
            (task) => tasks.push(task),
            () => memoize('stale', async () => 'new'),
        );
        expect(value).toBe('old');
        expect(tasks).toHaveLength(1);
        await Promise.all(tasks);
        expect(await memoize('stale', async () => 'unexpected')).toBe('new');
    });

    it('does not restore invalidated data from another Worker request', async () => {
        let finishOld!: (value: string) => void;
        const old = withCacheContext(
            () => {},
            () =>
                memoize(
                    'worker-race',
                    () =>
                        new Promise<string>((resolve) => {
                            finishOld = resolve;
                        }),
                ),
        );
        await Promise.resolve();
        invalidate('worker-race');
        await withCacheContext(
            () => {},
            () => memoize('worker-race', async () => 'new'),
        );
        finishOld('old');
        await old;
        expect(await memoize('worker-race', async () => 'unexpected')).toBe('new');
    });

    it('caches the loader result for subsequent calls', async () => {
        const loader = vi.fn(async () => ({ value: 1 }));
        const a = await memoize('k', loader);
        const b = await memoize('k', loader);
        expect(a).toEqual(b);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('coalesces concurrent calls into one loader execution', async () => {
        const loader = vi.fn(async () => {
            await new Promise((r) => setTimeout(r, 30));
            return 42;
        });
        const [a, b, c] = await Promise.all([memoize('coalesce', loader), memoize('coalesce', loader), memoize('coalesce', loader)]);
        expect([a, b, c]).toEqual([42, 42, 42]);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('invalidate forces a reload', async () => {
        const loader = vi.fn(async () => Math.random());
        const a = await memoize('rand', loader);
        invalidate('rand');
        const b = await memoize('rand', loader);
        expect(loader).toHaveBeenCalledTimes(2);
        expect(a).not.toBe(b);
    });

    it('expires entries after ttlMs', async () => {
        const loader = vi.fn(async () => Date.now());
        await memoize('ttl', loader, { ttlMs: 5 });
        await new Promise((r) => setTimeout(r, 15));
        await memoize('ttl', loader, { ttlMs: 5 });
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('does not let an invalidated loader overwrite a newer value', async () => {
        let finishOld!: (value: string) => void;
        const old = memoize(
            'race',
            () =>
                new Promise<string>((resolve) => {
                    finishOld = resolve;
                }),
        );
        await Promise.resolve();
        invalidate('race');
        await memoize('race', async () => 'new');
        finishOld('old');
        await old;
        expect(await memoize('race', async () => 'unexpected')).toBe('new');
    });

    it('does not let a cleared loader delete a newer inflight task', async () => {
        let finishOld!: (value: string) => void;
        let finishNew!: (value: string) => void;
        const old = memoize(
            'race',
            () =>
                new Promise<string>((resolve) => {
                    finishOld = resolve;
                }),
        );
        await Promise.resolve();
        clearCache();
        const loader = vi.fn(
            () =>
                new Promise<string>((resolve) => {
                    finishNew = resolve;
                }),
        );
        const current = memoize('race', loader);
        await Promise.resolve();
        finishOld('old');
        await old;
        const joined = memoize('race', loader);
        finishNew('new');
        expect(await Promise.all([current, joined])).toEqual(['new', 'new']);
        expect(loader).toHaveBeenCalledTimes(1);
    });
});
