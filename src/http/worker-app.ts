/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { registerApiRoutes } from './routes.js';
import type { HttpHandler, HttpReply, HttpRequest, RequestFields, RouteRegistrar } from './types.js';
import { fail } from '../utils/http.js';
import { getCacheStats } from '../utils/cache.js';
import { renderMetrics } from '../utils/metrics.js';

interface Route {
    path: string;
    segments: string[];
    handler: HttpHandler;
}

class WebReply implements HttpReply {
    readonly request = { id: crypto.randomUUID() };
    readonly log = { warn: (context: unknown, message: string) => console.warn(message, context) };
    private code = 200;
    response?: Response;

    status(code: number): this {
        this.code = code;
        return this;
    }

    send(body: unknown): this {
        this.response = Response.json(body, { status: this.code, headers: { 'content-type': 'application/json; charset=utf-8' } });
        return this;
    }
}

export function createWorkerApp() {
    const routes: Route[] = [];
    const router: RouteRegistrar = {
        get<Route extends RequestFields>(path: string, handler: HttpHandler<Route>) {
            // The route pattern supplies the handler's named string parameters.
            routes.push({ path, segments: path.split('/'), handler: handler as HttpHandler });
        },
    };
    registerApiRoutes(router);
    routes.sort((a, b) => a.segments.filter((p) => p.startsWith(':')).length - b.segments.filter((p) => p.startsWith(':')).length);
    const catalogue = routes.flatMap(({ path }) => [
        { method: 'GET', url: path },
        { method: 'HEAD', url: path },
    ]);
    const clients = new Map<string, { count: number; expiresAt: number }>();

    return {
        async fetch(request: Request, env: Record<string, string> = {}): Promise<Response> {
            const reply = new WebReply();
            const headers = new Headers();
            const origin = request.headers.get('origin');
            const allowed =
                !env.CORS_ORIGIN ||
                ['*', 'true'].includes(env.CORS_ORIGIN.trim().toLowerCase()) ||
                env.CORS_ORIGIN.split(',')
                    .map((s) => s.trim())
                    .includes(origin ?? '');
            headers.set('vary', 'Origin');
            if (origin && allowed) headers.set('access-control-allow-origin', origin);

            const finish = (response: Response): Response => {
                headers.forEach((value, key) => response.headers.set(key, value));
                return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
            };

            if (request.method === 'OPTIONS' && allowed) {
                if (!origin || !request.headers.has('access-control-request-method')) {
                    fail(reply, 400, 'Invalid Preflight Request');
                    return finish(reply.response!);
                }
                headers.set('access-control-allow-methods', 'GET,HEAD,POST');
                const requestedHeaders = request.headers.get('access-control-request-headers');
                if (requestedHeaders) {
                    headers.set('access-control-allow-headers', requestedHeaders);
                    headers.append('vary', 'Access-Control-Request-Headers');
                }
                return finish(new Response(null, { status: 204 }));
            }

            const configuredMax = Number(env.RATE_LIMIT_MAX);
            const max = Number.isSafeInteger(configuredMax) && configuredMax > 0 ? configuredMax : 120;
            const windowMs = parseWindow(env.RATE_LIMIT_WINDOW);
            const now = Date.now();
            const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
            let client = clients.get(clientKey);
            if (!client || client.expiresAt <= now) {
                client = { count: 0, expiresAt: now + windowMs };
                clients.set(clientKey, client);
            }
            client.count++;
            const reset = Math.ceil((client.expiresAt - now) / 1000);
            headers.set('x-ratelimit-limit', String(max));
            headers.set('x-ratelimit-remaining', String(Math.max(0, max - client.count)));
            headers.set('x-ratelimit-reset', String(reset));
            if (clients.size > 10_000) clients.delete(clients.keys().next().value!);
            if (client.count > max) {
                headers.set('retry-after', String(reset));
                fail(reply, 429, 'Rate limit exceeded, retry in ' + reset + ' seconds', 'RATE_LIMITED');
                return finish(reply.response!);
            }

            try {
                const url = new URL(request.url);
                if (request.method === 'GET' || request.method === 'HEAD') {
                    if (url.pathname === '/')
                        reply.send({ name: 'Bonyan-API', description: 'Quran & Azkar API with multi-source fallback', routes: catalogue });
                    else if (url.pathname === '/health') reply.send({ status: 'ok', code: 200, timestamp: new Date().toISOString() });
                    else if (url.pathname === '/ready')
                        reply.send({ status: 'ready', code: 200, timestamp: new Date().toISOString(), cache: getCacheStats() });
                    else if (url.pathname === '/metrics')
                        return finish(new Response(renderMetrics(getCacheStats()), { headers: { 'content-type': 'text/plain; version=0.0.4' } }));
                    else {
                        let segments: string[];
                        try {
                            segments = url.pathname.split('/').map(decodeURIComponent);
                        } catch {
                            fail(reply, 400, 'Malformed URL');
                            return finish(reply.response!);
                        }
                        const route = routes.find(
                            (r) =>
                                r.segments.length === segments.length && r.segments.every((part, i) => part.startsWith(':') || part === segments[i]),
                        );
                        if (route) {
                            const params = Object.fromEntries(
                                route.segments.flatMap((part, i) => (part.startsWith(':') ? [[part.slice(1), segments[i]!]] : [])),
                            );
                            const query: Record<string, string | string[]> = Object.create(null);
                            for (const [key, value] of url.searchParams) {
                                const previous = query[key];
                                query[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
                            }
                            await route.handler({ params, query } satisfies HttpRequest, reply);
                        }
                    }
                }
                if (!reply.response) fail(reply, 404, `Route ${request.method} ${url.pathname}${url.search} not found`, 'NOT_FOUND');
            } catch (error) {
                console.error('Request failed', error);
                fail(reply, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
            }
            return finish(reply.response!);
        },
    };
}

function parseWindow(value = '1 minute'): number {
    const match = /^(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|m|minutes?|h|hours?|d|days?)$/i.exec(value.trim());
    if (!match) return 60_000;
    const unit = match[2]!.toLowerCase();
    const multiplier =
        unit.startsWith('ms') || unit.startsWith('millisecond')
            ? 1
            : unit.startsWith('s')
              ? 1000
              : unit.startsWith('m')
                ? 60_000
                : unit.startsWith('h')
                  ? 3_600_000
                  : 86_400_000;
    return Math.max(1, Number(match[1]) * multiplier);
}
