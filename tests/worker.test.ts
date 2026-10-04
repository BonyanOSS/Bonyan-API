/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
    DurableObject: class {
        constructor(protected ctx: unknown) {}
    },
}));

import { BonyanApiContainer } from '../src/worker.js';

function createContainer(running = false) {
    const port = { fetch: vi.fn().mockImplementation(async () => new Response('ok')) };
    const container = {
        running,
        start: vi.fn(() => {
            container.running = true;
        }),
        setInactivityTimeout: vi.fn().mockResolvedValue(undefined),
        getTcpPort: vi.fn(() => port),
    };
    const object = new BonyanApiContainer({ container } as unknown as DurableObjectState, {});
    return { object, container, port };
}

afterEach(() => vi.useRealTimers());

describe('container request readiness', () => {
    it('waits for readiness before forwarding concurrent requests', async () => {
        const { object, container, port } = createContainer();
        let resolveReady!: (response: Response) => void;
        port.fetch.mockImplementationOnce(
            () =>
                new Promise<Response>((resolve) => {
                    resolveReady = resolve;
                }),
        );

        const first = new Request('https://api.example/health');
        const second = new Request('https://api.example/ready');
        const requests = [object.fetch(first), object.fetch(second)];
        await vi.waitFor(() => expect(port.fetch).toHaveBeenCalledTimes(1));
        expect(container.start).toHaveBeenCalledTimes(1);
        expect(port.fetch.mock.calls[0]?.[0]).toBe('http://container/ready');

        resolveReady(new Response('ready'));
        await Promise.all(requests);
        expect(port.fetch).toHaveBeenCalledWith(first);
        expect(port.fetch).toHaveBeenCalledWith(second);
    });

    it('checks an existing container and reapplies its inactivity timeout', async () => {
        const { object, container, port } = createContainer(true);
        await object.fetch(new Request('https://api.example/health'));
        expect(container.start).not.toHaveBeenCalled();
        expect(container.setInactivityTimeout).toHaveBeenCalledWith(600_000);
        expect(port.fetch.mock.calls[0]?.[0]).toBe('http://container/ready');
    });

    it('rechecks readiness after a stopped container restarts', async () => {
        const { object, container, port } = createContainer();
        await object.fetch(new Request('https://api.example/health'));
        container.running = false;
        await object.fetch(new Request('https://api.example/health'));
        expect(container.start).toHaveBeenCalledTimes(2);
        expect(port.fetch.mock.calls.filter(([input]) => input === 'http://container/ready')).toHaveLength(2);
    });

    it('times out without forwarding and allows a later request to retry', async () => {
        vi.useFakeTimers();
        const { object, port } = createContainer();
        port.fetch.mockRejectedValue(new Error('connection refused'));
        const request = new Request('https://api.example/health');
        const pending = expect(object.fetch(request)).rejects.toThrow('did not become ready');
        await vi.advanceTimersByTimeAsync(30_000);
        await pending;
        expect(port.fetch).not.toHaveBeenCalledWith(request);

        port.fetch.mockResolvedValue(new Response('ok'));
        await object.fetch(request);
        expect(port.fetch).toHaveBeenCalledWith(request);
    });
});
