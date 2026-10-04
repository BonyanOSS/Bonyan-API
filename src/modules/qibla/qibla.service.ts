/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { AlAdhanQiblaResponse } from '@/src/types/Api.js';
import type { QiblaInfo } from '@/src/types/Items.js';
import { fetchJson, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function localQiblaDirection(lat: number, lng: number): number {
    const phiK = (KAABA_LAT * Math.PI) / 180;
    const lambdaK = (KAABA_LNG * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    const lambda = (lng * Math.PI) / 180;

    const y = Math.sin(lambdaK - lambda);
    const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    return (angle + 360) % 360;
}

async function fromAlAdhan(lat: number, lng: number): Promise<QiblaInfo> {
    const json = await fetchJson<AlAdhanQiblaResponse>(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`);
    if (
        !Number.isFinite(json.data.direction) ||
        json.data.direction < 0 ||
        json.data.direction >= 360 ||
        json.data.latitude !== lat ||
        json.data.longitude !== lng
    ) {
        throw new Error('Invalid Qibla response');
    }
    return {
        latitude: json.data.latitude,
        longitude: json.data.longitude,
        direction: json.data.direction,
        apiName: 'aladhan.com',
    };
}

export function buildQiblaApis(lat: number, lng: number): (() => Promise<QiblaInfo>)[] {
    return [() => fromAlAdhan(lat, lng), async () => ({ latitude: lat, longitude: lng, direction: localQiblaDirection(lat, lng), apiName: 'local' })];
}

export async function getQibla(lat: number, lng: number): Promise<QiblaInfo> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('Invalid coordinates');
    const cacheKey = `qibla:${lat}:${lng}`;
    return memoize(cacheKey, () => runWithFallback(buildQiblaApis(lat, lng)), { ttlMs: 1000 * 60 * 60 * 24 * 30 });
}
