/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getTafsirEditions, getTafsirForAya, getTafsirForSurah } from './tafsir.controller.js';

export default function tafsirRoutes(router: RouteRegistrar) {
    router.get('/tafsir', getTafsirEditions);
    router.get('/tafsir/:edition/:surah', getTafsirForSurah);
    router.get('/tafsir/:edition/:surah/:aya', getTafsirForAya);
}
