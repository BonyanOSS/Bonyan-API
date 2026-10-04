/*
 * Bonyan-API – Quran & Azkar API
 * Copyright (c) 2026 BonyanOSS
 * MIT License
 */

// Counts verified against the pinned upstream dataset. See SOURCES.md.
export const HADITH_REVISION = '8e15b4f9e7585822426a0d470e8dfec27e2a1707';
export const HADITH_BOOKS = [
    {
        id: 'abu-daud',
        name: 'HR. Abu Daud',
        available: 4419,
    },
    {
        id: 'ahmad',
        name: 'HR. Ahmad',
        available: 4305,
    },
    {
        id: 'bukhari',
        name: 'HR. Bukhari',
        available: 6638,
    },
    {
        id: 'darimi',
        name: 'HR. Darimi',
        available: 2949,
    },
    {
        id: 'ibnu-majah',
        name: 'HR. Ibnu Majah',
        available: 4285,
    },
    {
        id: 'malik',
        name: 'HR. Malik',
        available: 1587,
    },
    {
        id: 'muslim',
        name: 'HR. Muslim',
        available: 4930,
    },
    {
        id: 'nasai',
        name: 'HR. Nasai',
        available: 5364,
    },
    {
        id: 'tirmidzi',
        name: 'HR. Tirmidzi',
        available: 3625,
    },
] as const;
