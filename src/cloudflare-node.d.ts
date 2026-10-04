/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

declare module 'cloudflare:node' {
    import type { Server } from 'node:http';

    export function httpServerHandler(server: Server): unknown;
}
