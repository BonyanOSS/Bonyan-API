/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { Container, getContainer } from '@cloudflare/containers';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';

export class BonyanApiContainer extends Container {
    defaultPort = 3000;
    sleepAfter = '10m';
}

interface Env {
    BONYAN_API: DurableObjectNamespace;
}

export default {
    async fetch(request: Request, env: Env) {
        return getContainer(env.BONYAN_API).fetch(request);
    },
};
