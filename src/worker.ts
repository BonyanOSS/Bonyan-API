/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { DurableObject } from 'cloudflare:workers';

const CONTAINER_PORT = 3000;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const STARTUP_TIMEOUT_MS = 30_000;

export class BonyanApiContainer extends DurableObject {
    private startPromise?: Promise<void>;
    private ready = false;

    private async ensureContainerRunning(): Promise<void> {
        const container = this.ctx.container;
        if (!container) {
            throw new Error('BonyanApiContainer is missing its container binding');
        }

        if (!container.running) {
            this.ready = false;
        }

        if (this.ready) {
            return;
        }

        this.startPromise ??= (async () => {
            if (!container.running) {
                container.start();
            }
            await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);
            await this.waitForReadiness(container);
            this.ready = true;
        })().finally(() => {
            this.startPromise = undefined;
        });

        await this.startPromise;
    }

    private async waitForReadiness(container: Container): Promise<void> {
        const port = container.getTcpPort(CONTAINER_PORT);
        const deadline = Date.now() + STARTUP_TIMEOUT_MS;

        while (Date.now() < deadline) {
            try {
                const response = await port.fetch('http://container/ready', {
                    signal: AbortSignal.timeout(1000),
                });
                const ready = response.ok;
                await response.body?.cancel();
                if (ready) return;
            } catch {
                // The process can be running before Fastify starts listening.
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
        }

        throw new Error('Bonyan API container did not become ready within 30 seconds');
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
