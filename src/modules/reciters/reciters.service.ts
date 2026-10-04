/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

import type { ApiFunction, Mp3QuranRecitersResponse } from '../../types/Api.js';
import type { ReciterItem, ReciterAudio, MoshafItem } from '../../types/Items.js';
import { fetchJson, fetchWithTimeout, runWithFallback } from '../../utils/fallback.js';
import { memoize } from '../../utils/cache.js';
import { httpsUrl, positiveInteger, requiredText } from '../../utils/validation.js';
import { normalizeArabic } from '../../utils/arabic.js';
import snapshot from './reciters.snapshot.json' with { type: 'json' };

// Identity, Hafs narration and recitation style mappings verified against both catalogues.
const QURAN_COM_RECORDINGS: Record<number, number> = { 4: 4, 53: 2, 54: 3, 31: 10, 89: 5, 106: 11, 112: 9, 118: 6, 123: 7 };

function normalize(json: Mp3QuranRecitersResponse, apiName: ReciterItem['apiName']): ReciterItem[] {
    const seen = new Set<number>();
    const rows = json.reciters
        .map((r) => {
            const id = positiveInteger(r.id);
            if (seen.has(id)) throw new Error('Duplicate reciter id');
            seen.add(id);
            const known = snapshot.reciters.find((item) => item.id === id);
            if (known && normalizeArabic(known.name).replace(/\s/g, '') !== normalizeArabic(requiredText(r.name)).replace(/\s/g, ''))
                throw new Error('Reciter identity changed');
            const moshaf: MoshafItem[] = r.moshaf
                .map((m) => {
                    const surahList = [...new Set(requiredText(m.surah_list).split(',').map(positiveInteger))].sort((a, b) => a - b);
                    if (surahList.some((n) => n > 114)) throw new Error('Invalid recording coverage');
                    return {
                        id: positiveInteger(m.id),
                        name: requiredText(m.name),
                        server: httpsUrl(m.server).replace(/\/?$/, '/'),
                        surahList,
                        rewayaId: positiveInteger(m.rewaya_id),
                        type: positiveInteger(m.moshaf_type),
                    };
                })
                .sort((a, b) => a.id - b.id);
            if (!moshaf.length) throw new Error('Reciter has no recordings');
            return { id, name: requiredText(r.name), ...(r.date?.trim() ? { date: requiredText(r.date) } : {}), moshaf, apiName };
        })
        .sort((a, b) => a.id - b.id);
    if (!rows.length) throw new Error('Empty reciter catalogue');
    // A partial catalogue must not make previously listed identities disappear during failover.
    if (apiName === 'mp3quran.net' && snapshot.reciters.some((r) => !seen.has(r.id))) throw new Error('Incomplete reciter catalogue');
    return rows;
}

export const reciterApis: ApiFunction<ReciterItem>[] = [
    async () => normalize(await fetchJson<Mp3QuranRecitersResponse>('https://www.mp3quran.net/api/v3/reciters'), 'mp3quran.net'),
    async () => normalize(snapshot, 'local'),
];

export async function getRadioContent(): Promise<{ reciters: ReciterItem[] }> {
    return { reciters: await memoize('reciters:all', () => runWithFallback(reciterApis), { ttlMs: 1000 * 60 * 60 }) };
}

function audioUrl(value: string, domain: string): string {
    const url = new URL(httpsUrl(value));
    if (url.hostname !== domain && !url.hostname.endsWith('.' + domain)) throw new Error('Unapproved audio host');
    return url.toString();
}

function selectRecording(reciter: ReciterItem, surah: number, moshafId?: number): MoshafItem | undefined {
    return moshafId === undefined
        ? (reciter.moshaf.find((m) => m.surahList.includes(surah) && m.rewayaId === 1 && m.type === 11) ??
              reciter.moshaf.find((m) => m.surahList.includes(surah)))
        : reciter.moshaf.find((m) => m.id === moshafId && m.surahList.includes(surah));
}

export function buildReciterAudioApis(reciter: ReciterItem, surah: number, moshafId?: number): (() => Promise<ReciterAudio>)[] {
    const recording = selectRecording(reciter, surah, moshafId);
    if (!recording) return [];
    const apis: (() => Promise<ReciterAudio>)[] = [
        async () => {
            const audio = audioUrl(new URL(String(surah).padStart(3, '0') + '.mp3', recording.server).toString(), 'mp3quran.net');
            const response = await fetchWithTimeout(audio, { method: 'HEAD', redirect: 'manual' });
            if (!response.ok || !/^(audio\/|application\/octet-stream)/i.test(response.headers.get('content-type') ?? ''))
                throw new Error('Audio file unavailable');
            return { reciter: reciter.name, surah, audio, moshafId: recording.id, rewayaId: recording.rewayaId, apiName: 'mp3quran.net' };
        },
    ];
    const upstreamId = QURAN_COM_RECORDINGS[recording.id];
    // Fallback exists only for verified Hafs murattal recordings of the same narrator.
    if (upstreamId && recording.rewayaId === 1 && recording.type === 11)
        apis.push(async () => {
            const json = await fetchJson<{ audio_file: { chapter_id: number; audio_url: string } }>(
                'https://api.quran.com/api/v4/chapter_recitations/' + upstreamId + '/' + surah,
            );
            if (json.audio_file.chapter_id !== surah) throw new Error('Wrong audio chapter');
            const audio = audioUrl(json.audio_file.audio_url, 'quranicaudio.com');
            const response = await fetchWithTimeout(audio, { method: 'HEAD', redirect: 'manual' });
            if (!response.ok || !/^(audio\/|application\/octet-stream)/i.test(response.headers.get('content-type') ?? ''))
                throw new Error('Fallback audio file unavailable');
            return { reciter: reciter.name, surah, audio, moshafId: recording.id, rewayaId: recording.rewayaId, apiName: 'quran.com' };
        });
    return apis;
}

export async function resolveReciterAudio(reciter: ReciterItem, surah: number, moshafId?: number): Promise<ReciterAudio | undefined> {
    const recording = selectRecording(reciter, surah, moshafId);
    if (!recording) return undefined;
    return memoize(
        'audio:' + reciter.id + ':' + recording.id + ':' + surah,
        () => runWithFallback(buildReciterAudioApis(reciter, surah, recording.id)),
        { ttlMs: 1000 * 60 * 15 },
    );
}
