/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { RouteRegistrar } from './types.js';
import recitersRoutes from '../modules/reciters/reciters.route.js';
import surahRoutes from '../modules/surah/surah.route.js';
import ayatRoutes from '../modules/ayat/ayat.route.js';
import azkarRoutes from '../modules/azkar/azkar.route.js';
import tafsirRoutes from '../modules/tafsir/tafsir.route.js';
import hadithRoutes from '../modules/hadith/hadith.route.js';
import prayerRoutes from '../modules/prayer/prayer.route.js';
import hijriRoutes from '../modules/hijri/hijri.route.js';
import qiblaRoutes from '../modules/qibla/qibla.route.js';

export function registerApiRoutes(router: RouteRegistrar): void {
    for (const register of [
        recitersRoutes,
        surahRoutes,
        ayatRoutes,
        azkarRoutes,
        tafsirRoutes,
        hadithRoutes,
        prayerRoutes,
        hijriRoutes,
        qiblaRoutes,
    ]) {
        register(router);
    }
}
