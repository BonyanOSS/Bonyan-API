/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { httpServerHandler } from 'cloudflare:node';
import { buildApp } from './app.js';

const app = await buildApp({ logger: false });
await app.ready();

export default httpServerHandler(app.server);
