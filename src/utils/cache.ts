/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { AsyncLocalStorage } from 'node:async_hooks';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    staleUntil: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
let generation = 0;
const cacheContext = new AsyncLocalStorage<{ inflight: Map<string, Promise<unknown>>; waitUntil: (task: Promise<unknown>) => void }>();

export function withCacheContext<T>(waitUntil: (task: Promise<unknown>) => void, run: () => T): T {
    return cacheContext.run({ inflight: new Map(), waitUntil }, run);
}

export interface MemoizeOptions {
    ttlMs?: number;
    maxEntries?: number;
    staleWhileRevalidateMs?: number;
}

export async function memoize<T>(key: string, loader: () => Promise<T>, options: MemoizeOptions = {}): Promise<T> {
    const ttl = options.ttlMs ?? 1000 * 60 * 30;
    const staleWhileRevalidateMs = options.staleWhileRevalidateMs ?? 0;
    const maxEntries = options.maxEntries ?? (Number(process.env.CACHE_MAX_ENTRIES) || 1000);
    const now = Date.now();

    const cached = store.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) return cached.value;
    if (cached && cached.staleUntil > now) {
        const task = refresh(key, loader, ttl, staleWhileRevalidateMs, maxEntries).catch(() => undefined);
        cacheContext.getStore()?.waitUntil(task);
        return cached.value;
    }

    const existing = (cacheContext.getStore()?.inflight ?? inflight).get(key) as Promise<T> | undefined;
    if (existing) return existing;

    return refresh(key, loader, ttl, staleWhileRevalidateMs, maxEntries);
}

export function invalidate(key: string): void {
    generation++;
    store.delete(key);
    inflight.delete(key);
    cacheContext.getStore()?.inflight.delete(key);
}

export function clearCache(): void {
    generation++;
    store.clear();
    inflight.clear();
    cacheContext.getStore()?.inflight.clear();
}

export function getCacheStats(): { entries: number; inflight: number } {
    return { entries: store.size, inflight: (cacheContext.getStore()?.inflight ?? inflight).size };
}

function refresh<T>(key: string, loader: () => Promise<T>, ttl: number, staleWhileRevalidateMs: number, maxEntries: number): Promise<T> {
    const active = cacheContext.getStore()?.inflight ?? inflight;
    const startedGeneration = generation;
    const existing = active.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const task = Promise.resolve().then(async () => {
        try {
            const value = await loader();
            if (active.get(key) === task && startedGeneration === generation) {
                store.set(key, {
                    value,
                    expiresAt: Date.now() + ttl,
                    staleUntil: Date.now() + ttl + staleWhileRevalidateMs,
                });
                evictIfNeeded(maxEntries);
            }
            return value;
        } finally {
            if (active.get(key) === task) active.delete(key);
        }
    });

    active.set(key, task);
    return task;
}

function evictIfNeeded(maxEntries: number): void {
    while (store.size > maxEntries) {
        const oldestKey = store.keys().next().value as string | undefined;
        if (!oldestKey) break;
        store.delete(oldestKey);
    }
}
