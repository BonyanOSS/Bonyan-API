/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { qiblaDirection } from './qibla.controller.js';

export default function qiblaRoutes(router: RouteRegistrar) {
    router.get('/qibla', qiblaDirection);
}
