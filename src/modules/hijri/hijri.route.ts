/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import { type RouteRegistrar } from '../../http/types.js';
import { convertGregorianToHijri, convertHijriToGregorian, getToday } from './hijri.controller.js';

export default function hijriRoutes(router: RouteRegistrar) {
    router.get('/hijri/today', getToday);
    router.get('/hijri/from-gregorian', convertGregorianToHijri);
    router.get('/hijri/to-gregorian', convertHijriToGregorian);
}
