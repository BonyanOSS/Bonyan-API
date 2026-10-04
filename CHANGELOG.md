# Changelog

All notable changes to Bonyan-API will be documented here.

## 3.0.0 (2026-10-04)

- Validate source coverage, references and edition identity before accepting/caching data.
- Preserve 241 MP3Quran identities with a metadata snapshot and add nine matched audio fallbacks.
- Normalize 114 surahs and 6,236 verses; add Quran.com text fallback.
- Restrict tafsir to Muyassar/Saadi with verified Quran.com resources and pinned mirrors.
- Replace malformed azkar with two Hisn adapters sharing 132 chapters; omit missing optional metadata.
- Repair nine hadith books with pinned data, sparse numbering and existing-record random selection.
- Add offline coordinate-based prayer, restrict methods and expose timezone explicitly.
- Keep both calendars on Umm al-Qura, validate Qibla and fix cache invalidation races.
- Rewrite OpenAPI schemas; add route validation and a separate live adapter audit.
- Move Docker/CI to Node.js 24; remove unused dependencies, duplicate tests and fallback aliases.
- Breaking changes are listed in README's version 3 migration table.

## 2.0.0

- Renamed package metadata to `bonyan-api`.
- Added production reliability improvements for errors, metrics, cache limits, and deployment configuration.
- Added project governance and support documents.
- Updated OpenAPI specification to version 2.0.0.

## 1.1.0

- Added Quran, Tafsir, Azkar, Hadith, Prayer Times, Hijri Date, and Qibla modules.
- Added multi-source fallback, in-process caching, Docker support, CI, and Vitest coverage.
