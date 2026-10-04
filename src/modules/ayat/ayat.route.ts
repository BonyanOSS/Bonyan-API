/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getAllAyat, getAyatById, getAyatBySurah, getAyatByText } from './ayat.controller.js';

export default function ayatRoutes(router: RouteRegistrar) {
    router.get('/ayat/search', getAyatByText);

    router.get('/ayat', getAllAyat);

    router.get('/ayat/:surah/aya/:id', getAyatBySurah);

    router.get('/ayat/:id', getAyatById);
}
