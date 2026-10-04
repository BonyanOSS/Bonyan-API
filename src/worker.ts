/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { createWorkerApp } from './http/worker-app.js';
import { withCacheContext } from './utils/cache.js';

const app = createWorkerApp();

export default {
    fetch(request: Request, env: Record<string, string>, ctx: ExecutionContext): Promise<Response> {
        return withCacheContext(
            (task) => ctx.waitUntil(task),
            () => app.fetch(request, env),
        );
    },
};
