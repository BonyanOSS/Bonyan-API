/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { vi } from 'vitest';

// Live checks run through check:upstreams; unit tests must not depend on the network.
vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network disabled in unit tests')));
