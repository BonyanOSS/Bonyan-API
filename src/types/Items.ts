/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

export type SurahApiSource = 'mp3quran.net' | 'alquran.cloud' | 'quran.com' | 'local';
export type ReciterApiSource = 'mp3quran.net' | 'local';
export type AyatApiSource = 'alquran.cloud' | 'cdn.jsdelivr.net/fawazahmed0/quran-api' | 'quran.com';
export type AzkarApiSource = 'raw.githubusercontent.com/rn0x/hisn_almuslim_json' | 'cdn.jsdelivr.net/rn0x/hisn_almuslim_json';
export type TafsirApiSource = 'alquran.cloud' | 'quranenc.com' | 'quran.com' | 'cdn.jsdelivr.net/spa5k/tafsir_api';
export type HadithApiSource = 'cdn.jsdelivr.net/gadingnst/hadith-api' | 'raw.githubusercontent.com/gadingnst/hadith-api' | 'local';
export type PrayerApiSource = 'aladhan.com' | 'local';
export type HijriApiSource = 'aladhan.com' | 'local';
export type QiblaApiSource = 'aladhan.com' | 'local';

export interface MoshafItem {
    id: number;
    name: string;
    server: string;
    surahList: number[];
    rewayaId: number;
    type: number;
}
export interface ReciterItem {
    id: number;
    name: string;
    date?: string;
    moshaf: MoshafItem[];
    apiName: ReciterApiSource;
}
export interface ReciterAudio {
    reciter: string;
    surah: number;
    audio: string;
    moshafId: number;
    rewayaId: number;
    apiName: 'mp3quran.net' | 'quran.com';
}
export interface SurahItem {
    id: number;
    name: string;
    makkia: boolean;
    apiName: SurahApiSource;
}
export interface AyaItem {
    number: number;
    text: string;
    numberInSurah: number;
}
export interface SurahWithAyaItem {
    number: number;
    name: string;
    ayat: AyaItem[];
    apiName: AyatApiSource;
}
export interface AzkarItem {
    id: number;
    text: string;
    count?: number;
    reference?: string;
    description?: string;
    content?: string;
}
export interface AzkarCategory {
    category: string;
    items: AzkarItem[];
    apiName: AzkarApiSource;
}
export interface TafsirItem {
    surah: number;
    aya: number;
    text: string;
    edition: string;
    apiName: TafsirApiSource;
}
export interface HadithBook {
    id: string;
    name: string;
    available: number;
    apiName: HadithApiSource;
}
export interface HadithItem {
    number: number;
    text: string;
    book: string;
    apiName: HadithApiSource;
}
export interface HadithRange {
    book: string;
    available: number;
    hadiths: HadithItem[];
}
export interface PrayerTimings {
    date: string;
    hijri?: string;
    timezone: string;
    timings: { Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Sunset: string; Maghrib: string; Isha: string };
    method: string;
    coordinates: { latitude: number; longitude: number };
    apiName: PrayerApiSource;
}
export interface HijriDate {
    hijri: { date: string; day: string; month: string; monthAr: string; year: string; weekday: string; weekdayAr: string };
    gregorian: { date: string; day: string; month: string; year: string };
    calendar: string;
    apiName: HijriApiSource;
}
export interface QiblaInfo {
    latitude: number;
    longitude: number;
    direction: number;
    apiName: QiblaApiSource;
}
