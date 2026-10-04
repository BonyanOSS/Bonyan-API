/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getSurahById, getSurah, getSurahByName } from './surah.controller.js';

export default function surahRoutes(router: RouteRegistrar) {
    router.get('/surah', getSurah);

    router.get('/surah/:id', getSurahById);

    router.get('/surah/search', getSurahByName);
}
