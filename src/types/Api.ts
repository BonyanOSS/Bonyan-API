/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

export type ApiFunction<T> = () => Promise<T[]>;
export interface Mp3QuranMoshaf {
    id: number;
    name: string;
    server: string;
    rewaya_id: number;
    moshaf_type: number;
    surah_list: string;
}
export interface Mp3QuranRecitersResponse {
    reciters: { id: number; name: string; date?: string; moshaf: Mp3QuranMoshaf[] }[];
}
export interface Mp3QuranSurahResponse {
    suwar: { id: number; name: string; makkia: number }[];
}
export interface AlQuranSurahResponse {
    data: { number: number; name: string; revelationType: string }[];
}
export interface QuranComChaptersResponse {
    chapters: { id: number; name_arabic: string; revelation_place: string }[];
}
export interface AlQuranAyatResponse {
    data: {
        edition: { identifier: string; type: string };
        surahs: { number: number; name: string; ayahs: { number: number; text: string; numberInSurah: number }[] }[];
    };
}
export interface AlAdhanTimingsResponse {
    data: {
        timings: Record<string, string>;
        date: { gregorian: { date: string }; hijri: { date: string } };
        meta: { latitude: number; longitude: number; timezone: string; method: { id: number; name: string } };
    };
}
export interface AlAdhanHijriResponse {
    data: {
        hijri: {
            date: string;
            day: string;
            month: { number: number; en: string; ar: string };
            year: string;
            weekday: { en: string; ar: string };
            method?: string;
        };
        gregorian: { date: string; day: string; month: { number: number; en: string }; year: string };
    };
}
export interface AlAdhanQiblaResponse {
    data: { latitude: number; longitude: number; direction: number };
}
