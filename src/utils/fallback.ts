/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { recordUpstreamRequest } from './metrics.js';

export type ApiFn<T> = () => Promise<T>;

export interface FallbackOptions {
    timeoutMs?: number;
    isEmpty?: (result: unknown) => boolean;
}

export async function fetchJson<T>(input: string, timeoutMs = 8000, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
        const response = await fetch(input, {
            signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Upstream HTTP ${response.status}: ${new URL(input).hostname}`);
        const data = await withTimeout(response.json() as Promise<T>, timeoutMs - (Date.now() - startedAt));
        recordUpstreamRequest(input, 'ok', Date.now() - startedAt);
        return data;
    } catch (error) {
        controller.abort();
        recordUpstreamRequest(input, 'error', Date.now() - startedAt);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        recordUpstreamRequest(input, response.ok ? 'ok' : 'http_error', Date.now() - startedAt);
        return response;
    } catch (err) {
        recordUpstreamRequest(input, 'error', Date.now() - startedAt);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export async function runWithFallback<T>(apis: ApiFn<T>[], options: FallbackOptions = {}): Promise<T> {
    const isEmpty = options.isEmpty ?? defaultIsEmpty;
    let lastError: Error | null = null;

    for (const api of apis) {
        try {
            const result = options.timeoutMs === undefined ? await api() : await withTimeout(api(), options.timeoutMs);
            if (!isEmpty(result)) return result;
            lastError = new Error('Empty result from source');
        } catch (err) {
            lastError = err instanceof Error ? err : new Error('Unknown error');
        }
    }

    throw lastError ?? new Error('No APIs available');
}

function defaultIsEmpty(result: unknown): boolean {
    if (result === null || result === undefined) return true;
    if (Array.isArray(result)) return result.length === 0 || result.every(defaultIsEmpty);
    return false;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error(`Source timed out after ${timeoutMs}ms`)), timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
