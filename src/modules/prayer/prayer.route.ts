/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getTimings } from './prayer.controller.js';

export default function prayerRoutes(router: RouteRegistrar) {
    router.get('/prayer/times', getTimings);
}
