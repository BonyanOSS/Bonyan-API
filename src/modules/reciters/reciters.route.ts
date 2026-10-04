/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getRadio, getReciterById, getReciterByName, getReciterSurah } from './reciters.controller.js';

export default function radioRoutes(router: RouteRegistrar) {
    router.get('/reciters', getRadio);

    router.get('/reciters/:id', getReciterById);

    router.get('/reciters/search', getReciterByName);

    router.get('/reciters/:id/surah/:surah', getReciterSurah);
}
