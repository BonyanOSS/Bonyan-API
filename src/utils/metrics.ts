/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

type UpstreamResult = 'ok' | 'http_error' | 'error';

interface UpstreamStats {
    requests: number;
    failures: number;
    totalDurationMs: number;
}

const startedAt = Date.now();
const upstreamStats = new Map<string, UpstreamStats>();

export interface CacheStats {
    entries: number;
    inflight: number;
}

export function recordUpstreamRequest(input: string, result: UpstreamResult, durationMs: number): void {
    const host = hostname(input);
    const key = `${host}:${result}`;
    const stats = upstreamStats.get(key) ?? { requests: 0, failures: 0, totalDurationMs: 0 };

    stats.requests += 1;
    stats.totalDurationMs += durationMs;

    if (result !== 'ok') stats.failures += 1;

    upstreamStats.set(key, stats);
}

export function renderMetrics(cache: CacheStats): string {
    const lines = [
        '# HELP bonyan_api_uptime_seconds Seconds since the API process started.',
        '# TYPE bonyan_api_uptime_seconds gauge',
        `bonyan_api_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
        '# HELP bonyan_api_cache_entries Current in-process cache entries.',
        '# TYPE bonyan_api_cache_entries gauge',
        `bonyan_api_cache_entries ${cache.entries}`,
        '# HELP bonyan_api_cache_inflight Current in-flight cache loads.',
        '# TYPE bonyan_api_cache_inflight gauge',
        `bonyan_api_cache_inflight ${cache.inflight}`,
        '# HELP bonyan_api_upstream_requests_total Upstream HTTP requests by host and result.',
        '# TYPE bonyan_api_upstream_requests_total counter',
    ];

    for (const [key, stats] of upstreamStats) {
        const [host, result] = key.split(':');
        lines.push(`bonyan_api_upstream_requests_total{host="${escapeLabel(host)}",result="${escapeLabel(result)}"} ${stats.requests}`);
        lines.push(`bonyan_api_upstream_failures_total{host="${escapeLabel(host)}",result="${escapeLabel(result)}"} ${stats.failures}`);
        lines.push(
            `bonyan_api_upstream_duration_ms_sum{host="${escapeLabel(host)}",result="${escapeLabel(result)}"} ${Math.round(stats.totalDurationMs)}`,
        );
    }

    return `${lines.join('\n')}\n`;
}

function hostname(input: string): string {
    try {
        return new URL(input).hostname;
    } catch {
        return 'unknown';
    }
}

function escapeLabel(value = ''): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
