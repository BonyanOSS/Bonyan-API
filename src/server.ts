/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import 'dotenv/config';
import { buildApp } from './app.js';

const app = await buildApp();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';
try {
    await app.listen({ port, host });
} catch (error) {
    app.log.error(error);
    process.exit(1);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
        void app.close().catch((error) => {
            app.log.error(error);
            process.exitCode = 1;
        });
    });
}
