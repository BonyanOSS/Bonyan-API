/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { runWithFallback, fetchWithTimeout } from '../src/utils/fallback';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
});

describe('runWithFallback', () => {
    it('returns result from the first successful API', async () => {
        const result = await runWithFallback<number[]>([vi.fn().mockRejectedValue(new Error('first fail')), vi.fn().mockResolvedValue([1, 2, 3])]);
        expect(result).toEqual([1, 2, 3]);
    });

    it('skips empty results and tries the next API', async () => {
        const result = await runWithFallback<number[]>([vi.fn().mockResolvedValue([]), vi.fn().mockResolvedValue([42])]);
        expect(result).toEqual([42]);
    });

    it('throws when all APIs fail', async () => {
        await expect(
            runWithFallback<number[]>([vi.fn().mockRejectedValue(new Error('a')), vi.fn().mockRejectedValue(new Error('b'))]),
        ).rejects.toThrow();
    });

    it('respects custom isEmpty', async () => {
        const result = await runWithFallback<{ items: number[] }>(
            [vi.fn().mockResolvedValue({ items: [] }), vi.fn().mockResolvedValue({ items: [1] })],
            { isEmpty: (r) => (r as { items: number[] }).items.length === 0 },
        );
        expect(result.items).toEqual([1]);
    });
});

describe('fetchWithTimeout', () => {
    it('aborts when the request exceeds the timeout', async () => {
        globalThis.fetch = vi.fn(
            (_input: string | URL | Request, init?: RequestInit) =>
                new Promise<Response>((_, reject) => {
                    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
                }),
        ) as typeof globalThis.fetch;

        await expect(fetchWithTimeout('https://example.com', {}, 50)).rejects.toThrow();
    });
});
