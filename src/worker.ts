/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { DurableObject } from 'cloudflare:workers';

const CONTAINER_PORT = 3000;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export class BonyanApiContainer extends DurableObject {
    private startPromise?: Promise<void>;

    private async ensureContainerRunning(): Promise<void> {
        const container = this.ctx.container;
        if (!container) {
            throw new Error('BonyanApiContainer is missing its container binding');
        }

        if (container.running) {
            return;
        }

        this.startPromise ??= (async () => {
            container.start();
            await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);
        })().finally(() => {
            this.startPromise = undefined;
        });

        await this.startPromise;
    }

    async fetch(request: Request) {
        await this.ensureContainerRunning();
        return this.ctx.container!.getTcpPort(CONTAINER_PORT).fetch(request);
    }
}

interface Env {
    BONYAN_API: DurableObjectNamespace;
}

export default {
    async fetch(request: Request, env: Env) {
        const id = env.BONYAN_API.idFromName('default');
        return env.BONYAN_API.get(id).fetch(request);
    },
};
