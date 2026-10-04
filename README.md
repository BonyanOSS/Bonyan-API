# Bonyan-API

Quran text and audio, tafsir, Hisn al-Muslim, hadith collections, prayer times, Hijri conversion and Qibla direction. Fastify and TypeScript, with validated source adapters and an in-process cache.

واجهة للقرآن والصوت والتفسير والأذكار والحديث ومواقيت الصلاة والتقويم والقبلة. تُراجع بيانات كل مصدر قبل قبولها، وتنتقل الخدمة إلى البديل عند فشل الطلب أو نقص البيانات.

## Run

Requires Node.js 24 LTS and pnpm 10.33.4.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Copy `.env.example` only when creating a new configuration. Keep an existing `.env`.

```sh
pnpm build
pnpm start
docker build -f Dockerfile -t bonyan-api .
docker run --rm -p 3000:3000 --env-file .env bonyan-api
```

The default address is `http://localhost:3000`. Configuration names are listed in `.env.example`.

### Cloudflare Workers

The Cloudflare entrypoint uses native `Request` and `Response` handlers. It runs on Workers Free without Containers, Docker or a paid plan. The Node.js entrypoint still uses Fastify; both adapters share the same controllers and route definitions.

In Cloudflare Workers Builds use:

```text
Build command: pnpm run build
Deploy command: pnpm run deploy:cloudflare
```

Set production variables and secrets in the Worker settings. Do not upload `.env`. Local development uses `pnpm exec wrangler dev`; deployment uses `pnpm deploy:cloudflare`.

The production custom domain is `api.bonyanoss.org`. Branch builds run `npx wrangler preview` using the empty `previews` configuration. Enable Preview URLs on the existing Worker before testing a branch, then test its URL before merging. `workers_dev = false` keeps production traffic on the custom domain; `preview_urls = true` preserves access to test deployments.

CI validates every documented response against OpenAPI for both HTTP adapters, starts the Worker in workerd and requests its health, readiness, routing and CORS endpoints. The Docker smoke test verifies the optional Node.js deployment separately. Worker initialization performs no asynchronous I/O and does not import Fastify.

The `v2` Durable Object migration retires the unused class from the earlier Container deployment. Keep the migration history when updating an existing Worker. Roll back code by redeploying the previous native Worker revision; restoring the Container version would require the paid plan and a new class migration.

Workers Free currently allows 100,000 requests per day, 10 ms CPU per invocation and 50 external subrequests. Network waiting does not count toward CPU time. Large cold Quran or hadith responses still need testing under production load. Cache values and rate-limit counters are local to each Worker isolate; they are not a global quota. Inflight I/O is confined to its request, and stale refreshes use `waitUntil`. See [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/).

## API

[openapi.yaml](openapi.yaml) defines parameters, response schemas and errors. `GET /` lists routes. `/health` checks process liveness; `/ready` reports process readiness and cache counts without checking upstream availability. `/metrics` returns Prometheus text.

| Area           | Routes                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Surahs         | `/surah`, `/surah/:id`, `/surah/search?name=...`                                                    |
| Quran text     | `/ayat`, `/ayat/:id`, `/ayat/:surah/aya/:id`, `/ayat/search?text=...&limit=50`                      |
| Reciters       | `/reciters`, `/reciters/:id`, `/reciters/search?name=...`, `/reciters/:id/surah/:surah?moshaf=...`  |
| Tafsir         | `/tafsir`, `/tafsir/:edition/:surah`, `/tafsir/:edition/:surah/:aya`; `?aya=N` also selects a verse |
| Hisn al-Muslim | `/azkar`, `/azkar/:category`, `/azkar/random`, `/azkar/search?text=...&limit=50`                    |
| Hadith         | `/hadith`, `/hadith/:book?from=1&to=30`, `/hadith/:book/:number`, `/hadith/random?book=bukhari`     |
| Prayer         | `/prayer/times?date=DD-MM-YYYY&latitude=21.4225&longitude=39.8262&timezone=Asia/Riyadh`             |
| Calendar       | `/hijri/today`, `/hijri/from-gregorian?date=DD-MM-YYYY`, `/hijri/to-gregorian?date=DD-MM-YYYY`      |
| Qibla          | `/qibla?latitude=24.7136&longitude=46.6753`                                                         |

Prayer queries require coordinates, or `city` and `country`. Pass an IANA `timezone`, for example `Asia/Riyadh`; default `UTC`. Default method `4` (Umm al-Qura). Supported methods: `1,2,3,4,5,9,10,11`. Local calculation uses the standard Asr shadow ratio. A city-only request needs the upstream geocoder and has no offline fallback.

Example response:

```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "الفاتحة",
        "makkia": true,
        "apiName": "local"
    }
}
```

`apiName` identifies the actual source, including local metadata/calculations. Invalid input returns `400`, absent items `404`, exhausted sources `503`. Required fields reject blank text and literal placeholders `unknown`, `null`, `undefined`. Missing optional fields are omitted; empty search results are valid successes.

## Fallback behavior

Ordered chains and source policy are in [SOURCES.md](SOURCES.md). Adapters validate coverage, references and edition identifiers before caching. HTTP 200 alone is insufficient.

- Surah IDs and names remain canonical across four adapters, including bundled metadata.
- Quran text contains 114 surahs and 6,236 unique verse references. Orthographic details may differ between editions.
- Reciter IDs remain MP3Quran IDs. A bundled snapshot retains 241 identities and recording coverage during catalogue outages. Refresh it deliberately when the source changes.
- Audio fallback covers nine verified Hafs murattal recordings. Narrator, narration and style remain the same; the recording file may differ. Unavailable chapters return 404; failed eligible sources return 503.
- Tafsir is restricted to `muyassar` and `saadi`; response editions must match requests.
- Both azkar hosts serve the same pinned corpus of 132 Hisn chapters, using one request per host. Missing structured metadata such as `count` is omitted. Item IDs are chapter-local positions, not permanent cross-source identities.
- Hadith uses a pinned collection across two hosts. `available` counts records, not the largest number. Inclusive ranges can contain gaps and accept at most 300 requested numbers. Random selection chooses an existing record.
- Coordinate-based prayer has an offline calculation. Algorithms/rounding can differ by minutes; polar conditions may remain unavailable. Calculated times are not a local mosque timetable.
- Both calendar sources use Umm al-Qura and return `calendar: "islamic-umalqura"`; this does not determine local moon sightings. Qibla has an offline bearing calculation.

## Version 3 migration / الانتقال إلى الإصدار 3

Public behavior changes are versioned `3.0.0`:

| Change                                                                         | Client action                                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `moshaf` normalized to `id`, `name`, `server`, `surahList`, `rewayaId`, `type` | Use `surahList`; select a recording with query `moshaf=ID`; response includes `moshafId` |
| Only `muyassar`, `saadi` enabled                                               | Read `/tafsir` instead of assuming five editions                                         |
| Azkar uses Hisn chapter names                                                  | Read `/azkar`; handle omitted `count` and `reference`                                    |
| Prayer defaults to UTC; unverified methods rejected                            | Pass timezone and allowed method explicitly                                              |
| Hadith numbering repaired                                                      | Treat `available` as a count and allow sparse IDs                                        |
| Verse, azkar search/random responses expose `apiName`                          | Accept added provenance                                                                  |
| Hijri has a fixed calendar identifier                                          | Read `calendar`                                                                          |

لا تضف قيمًا تخمينية للحقول الناقصة. حدّث تطبيقك وفق OpenAPI، خصوصًا المصاحف والأذكار والمنطقة الزمنية للصلاة. توثيق المصادر يميز بين المحتوى المحدد المسموح به وبين مشغّل الموقع؛ لا يتضمن ضمانًا لمذهب كل مشغّل أو قارئ.

## Checks

```sh
pnpm lint:check
pnpm build
pnpm test:coverage
pnpm check:upstreams --output fallback-check.json
pnpm --package=@redocly/cli dlx redocly lint openapi.yaml --extends=spec
```

Unit/route tests disable network access. They cover invalid payloads, source transitions, identity mappings, cache races and OpenAPI response validation. The live checker separately calls each configured adapter, all nine full hadith books on both hosts and all 132 official Hisn chapters. Tafsir is sampled at Al-Fatihah verse 2 and audio at Al-Fatihah for ten reciters. It does not test every recording or tafsir verse. Any adapter failure gives exit status 1, even if another source works.

Availability is a point-in-time observation. The live audit transfers large datasets and is intended for deliberate checks, not every unit test or request.

Project code is MIT licensed. Upstream content has separate terms: [SOURCES.md](SOURCES.md).
