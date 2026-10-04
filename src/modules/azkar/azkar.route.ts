/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getAzkarByCategory, getAzkarCategories, getRandomZekr, searchAzkar } from './azkar.controller.js';

export default function azkarRoutes(router: RouteRegistrar) {
    router.get('/azkar', getAzkarCategories);
    router.get('/azkar/random', getRandomZekr);
    router.get('/azkar/search', searchAzkar);
    router.get('/azkar/:category', getAzkarByCategory);
}
