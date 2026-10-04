# Source policy and fallback order

Reviewed on 2026-10-04. Adapters must preserve requested content identity, edition and references. A different catalogue is not an interchangeable replacement.

| Area               | Ordered adapters                                                                    | Coverage and limits                                                    |
| ------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Surahs             | MP3Quran, AlQuran Cloud, Quran.com, bundled metadata                                | All 114; canonical IDs/names                                           |
| Quran text         | AlQuran Cloud `quran-uthmani`, fawazahmed0 `ara-quranuthmanihaf`, Quran.com Uthmani | All 6,236 verses; no translations enabled                              |
| Reciter catalogue  | MP3Quran, bundled snapshot                                                          | Snapshot retains 241 identities and recording coverage                 |
| Audio              | MP3Quran recording, Quran.com where explicitly mapped                               | Nine verified Hafs murattal mappings; other recordings have one source |
| Muyassar           | AlQuran Cloud `ar.muyassar`, QuranEnc `arabic_moyassar`, Quran.com `16`, spa5k      | Reject wrong editions or missing references                            |
| Saadi              | Quran.com `91`, spa5k                                                               | Unsupported cloud/QuranEnc resources removed                           |
| Azkar              | Pinned rn0x Hisn corpus via jsDelivr, same revision on raw GitHub                   | Same 132 canonical chapters; missing repetition metadata omitted       |
| Hadith             | Pinned gadingnst via jsDelivr, same revision on raw GitHub                          | Nine collections, 38,102 records; two hosts share one data origin      |
| Prayer coordinates | AlAdhan, local `adhan`                                                              | Same method/timezone; standard Asr; numerical differences possible     |
| Prayer city        | AlAdhan                                                                             | No offline geocoder                                                    |
| Hijri              | AlAdhan `calendarMethod=UAQ`, local ICU `islamic-umalqura`                          | Remote dates checked against canonical local conversion                |
| Qibla              | AlAdhan, local bearing                                                              | Degrees clockwise from true north                                      |

## Content scope / نطاق المحتوى

Enabled content is Arabic Quran text, Tafsir al-Muyassar, Tafsir al-Saadi, Hisn al-Muslim by Sa'id bin Ali bin Wahf al-Qahtani, and the Sunni hadith collections below. Arbitrary editions, translations and remotely selected book paths are disabled.

[QuranEnc's statement](https://new.quranenc.com/en/home/about) explicitly identifies its methodology as Ahl al-Sunnah wal-Jama'ah. Its [API documentation](https://quranenc.com/ar/home/api) identifies the Muyassar resource. Hisn authorship is documented by the [mirror repository](https://github.com/rn0x/hisn_almuslim_json) and the [IslamHouse edition](https://d1.islamhouse.com/data/ar/ih_books/single/risala_ar_hisnulmuslim.pdf). [Quran.com](https://quran.com/about-us?locale=en) identifies its operator; [MP3Quran](https://www.mp3quran.net/ar/about) describes its audio service.

These references support the specified content and provenance. They do not establish the religious affiliation of every operator or reciter. AlQuran Cloud and mirrors transport only the listed resources; this project does not approve their broader catalogues. Edition restrictions are an implementation policy, not a judgment about excluded authors. Collection membership does not establish each hadith's authenticity; no grading is invented.

المحتوى محصور في النص القرآني والتفسير الميسر والسعدي وحصن المسلم وكتب الحديث المذكورة. لا يوجد إثبات شامل لمذهب كل مشغّل أو قارئ. أي مصدر جديد يحتاج مراجعة محتواه المحدد ومراجعه، ولا يكفي نجاح HTTP أو اسم الموقع.

Prayer permits AlAdhan IDs `1,2,3,4,5,9,10,11`, with local equivalents. IDs `0` (Shia Ithna-Ashari) and `7` (Tehran) are rejected, along with methods lacking a reviewed local mapping. See [calculation methods](https://aladhan.com/calculation-methods). Calendar/Qibla provide mathematical results, not religious text.

## Pins and identities

- Hisn: `rn0x/hisn_almuslim_json@0405ee1797c2ccadfe82cd41845338d54978ccb9`. Preface/general virtues are excluded. Chapter-local item positions can differ between editions.
- Tafsir: `spa5k/tafsir_api@eb82bb6294efe30ad5c135c03b1864afaa70e855`. Only `ar-tafsir-muyassar` and `ar-tafseer-al-saddi`.
- Hadith: `gadingnst/hadith-api@8e15b4f9e7585822426a0d470e8dfec27e2a1707`, `books/{book}.json`. Both hosts preserve identical numbering.
- `reciters.snapshot.json` contains the MP3Quran response, retrieval URL and timestamp. Missing identities or changed normalized names cause rejection of the live catalogue. Review new identities before promising the same outage coverage.
- MP3Quran recording ID to Quran.com recitation ID: `4→4, 53→2, 54→3, 31→10, 89→5, 106→11, 112→9, 118→6, 123→7`. These are recording mappings, not reciter ID equivalences. Require `rewayaId=1`, `type=11`. Audio hosts are restricted to MP3Quran/QuranicAudio and checked with HEAD.

| Book ID    | Records | Highest number |
| ---------- | ------: | -------------: |
| abu-daud   |   4,419 |          4,590 |
| ahmad      |   4,305 |         26,363 |
| bukhari    |   6,638 |          7,008 |
| darimi     |   2,949 |          3,367 |
| ibnu-majah |   4,285 |          4,331 |
| malik      |   1,587 |          1,594 |
| muslim     |   4,930 |          5,362 |
| nasai      |   5,364 |          5,662 |
| tirmidzi   |   3,625 |          3,891 |

## Deadlines and cache

JSON deadlines include body parsing. Default 8 seconds; Quran 20; tafsir requests 12 (mirror 15); Hisn mirror 12; prayer 10. Full hadith books allow 30 seconds per host. Bukhari is about 13.4 MB uncompressed and previously exceeded a 20-second deadline. A cold request can take about 60 seconds if both hosts are slow. Successful books cache for 12 hours.

The former HisnMuslim index-and-chapter fallback required 133 requests, exceeding Workers Free's 50-subrequest limit. Both current azkar adapters request the same pinned corpus once from independent hosts; they share one data origin and omit unavailable repetition metadata. The audit uses three concurrent adapter checks. Quran/tafsir/azkar cache 24 hours, surahs 12 hours, reciters one hour, audio 15 minutes, prayer one hour, calendar seven days, Qibla 30 days. `CACHE_MAX_ENTRIES` defaults to 1,000. Concurrent loads are coalesced within each Worker request (process-wide on Node.js); invalidated older loads cannot overwrite newer results.

## Licenses and permissions

Project MIT licensing does not grant rights to upstream audio or books.

| Source                                                                | License/terms established in review                                     | Use                                                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api)     | Unlicense for repository; individual content may have separate rights   | Remote Arabic text only                                                       |
| [spa5k/tafsir_api](https://github.com/spa5k/tafsir_api)               | Repository MIT; derived books have separate provenance                  | Two pinned remote resources                                                   |
| [gadingnst/hadith-api](https://github.com/gadingnst/hadith-api)       | Repository MIT                                                          | Pinned remote collection                                                      |
| [rn0x/hisn_almuslim_json](https://github.com/rn0x/hisn_almuslim_json) | No explicit repository license established                              | Remote mirror; no full corpus bundled                                         |
| [batoulapps/adhan-js](https://github.com/batoulapps/adhan-js)         | MIT                                                                     | Installed calculation library                                                 |
| MP3Quran, Quran.com, AlQuran Cloud, QuranEnc, HisnMuslim, AlAdhan     | API access documented; no blanket redistribution grant established here | Remote requests; MP3Quran metadata snapshot with provenance, no audio bundled |

Review content, terms, coverage and identity mappings before refreshing pins or the snapshot. Preserve attribution. Structural validation does not prove every word against a printed edition.

## Removed paths

Pray.zone's `/v2/times/today.json` and old sutanlab `/data/*.json` returned 404. The old gading service was unreachable. Nawaf azkar expected nonexistent fields and included nested rows incompatible with common chapters. QuranEnc Saadi returned empty HTTP 200. Unsupported AlQuran Cloud Saadi returned Quran text with HTTP 200; edition/type validation now rejects that substitution.
