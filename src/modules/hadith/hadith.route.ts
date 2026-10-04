/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { getHadithBook, getHadithBooks, getHadithByNumber, getRandomHadith } from './hadith.controller.js';

export default function hadithRoutes(router: RouteRegistrar) {
    router.get('/hadith', getHadithBooks);
    router.get('/hadith/random', getRandomHadith);
    router.get('/hadith/:book', getHadithBook);
    router.get('/hadith/:book/:number', getHadithByNumber);
}
