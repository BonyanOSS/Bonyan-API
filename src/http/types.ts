/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

export interface RequestFields {
    Params?: unknown;
    Querystring?: unknown;
}

export interface HttpRequest<Route extends RequestFields = RequestFields> {
    params: Route['Params'];
    query: Route['Querystring'];
}

export interface HttpReply {
    request: { id: string };
    log: { warn(context: unknown, message: string): void };
    status(code: number): HttpReply;
    send(body: unknown): HttpReply;
}

export type HttpHandler<Route extends RequestFields = RequestFields> = (request: HttpRequest<Route>, reply: HttpReply) => unknown | Promise<unknown>;

export interface RouteRegistrar {
    get<Route extends RequestFields>(path: string, handler: HttpHandler<Route>): unknown;
}
