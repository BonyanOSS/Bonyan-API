/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { unstable_dev, unstable_readConfig } from 'wrangler';

const config = unstable_readConfig({ config: 'wrangler.toml' });
if (!config.main) throw new Error('wrangler.toml must define a Worker entrypoint');

// A dry run bundles code but does not execute its top-level initialization.
const worker = await unstable_dev(config.main, {
    config: 'wrangler.toml',
    local: true,
    port: 0,
    inspectorPort: 0,
    persist: false,
    logLevel: 'error',
    experimental: {
        disableExperimentalWarning: true,
        disableDevRegistry: true,
        enableContainers: false,
        watch: false,
    },
});

await worker.stop();
console.log('Worker startup passed in workerd (container execution checked separately).');
