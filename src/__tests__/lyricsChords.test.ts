import { describe, expect, it } from 'vitest'

import { getActiveChordAtTime, normalizeLyricsData } from '@/data/lyricsChords'
import type { LyricsData } from '@/types/lyrics'

const baseLyrics: LyricsData = {
  meta: {
    title: 'Witch Hunting',
    totalDurationMs: 8000,
    version: '1.0',
  },
  lyrics: [
    {
      id: 'L1',
      startTime: 1000,
      endTime: 3000,
      text: 'Legend says that',
      words: [
        { text: 'Legend', startTime: 1000, endTime: 1600, duration: 600 },
        { text: 'says', startTime: 1600, endTime: 2200, duration: 600 },
        { text: 'that', startTime: 2200, endTime: 3000, duration: 800 },
      ],
      section: 'verse',
    },
    {
      id: 'L2',
      startTime: 3500,
      endTime: 6000,
      text: 'When you cast your magic spells',
      words: [
        { text: 'When', startTime: 3500, endTime: 3900, duration: 400 },
        { text: 'you', startTime: 3900, endTime: 4200, duration: 300 },
        { text: 'cast', startTime: 4200, endTime: 4600, duration: 400 },
        { text: 'your', startTime: 4600, endTime: 5000, duration: 400 },
        { text: 'magic', startTime: 5000, endTime: 5500, duration: 500 },
        { text: 'spells', startTime: 5500, endTime: 6000, duration: 500 },
      ],
      section: 'verse',
    },
  ],
}

describe('lyricsChords', () => {
  it('keeps chord support disabled when metadata has no chord content', () => {
    const normalized = normalizeLyricsData(baseLyrics)

    expect(normalized.resolvedChords.enabled).toBe(false)
    expect(normalized.resolvedChords.timeline).toEqual([])
    expect(normalized.resolvedChords.uniqueNames).toEqual([])
  })

  it('derives timed chord placements from ChordPro-style source lines', () => {
    const normalized = normalizeLyricsData({
      ...baseLyrics,
      meta: {
        ...baseLyrics.meta,
        chords: {
          enabled: true,
          source: `[Verse 1]\nF#m7\nLegend says that\nF#m6/E             B7\nWhen you cast your magic spells`,
        },
      },
    })

    expect(normalized.lyrics[0]?.chords?.map((chord) => chord.name)).toEqual(['F#m7'])
    expect(normalized.lyrics[0]?.chords?.[0]).toMatchObject({
      wordIndex: 0,
      rowIndex: 0,
      columnIndex: 0,
      startTime: 1000,
      endTime: 3000,
    })

    expect(normalized.lyrics[1]?.chords?.map((chord) => chord.name)).toEqual(['F#m6/E', 'B7'])
    expect(normalized.lyrics[1]?.chords?.[1]).toMatchObject({
      wordIndex: 4,
      rowIndex: 0,
      columnIndex: 4,
      startTime: 5000,
      endTime: 6000,
    })
    expect(normalized.resolvedChords.uniqueNames).toEqual(['F#m7', 'F#m6/E', 'B7'])
  })

  it('prefers explicit line chord metadata and exposes definitions for the UI', () => {
    const normalized = normalizeLyricsData({
      ...baseLyrics,
      meta: {
        ...baseLyrics.meta,
        chords: {
          enabled: true,
          definitions: {
            B7: {
              name: 'B7',
              diagram: {
                frets: ['x', 2, 1, 2, 0, 2],
                fingers: [null, 2, 1, 3, null, 4],
              },
            },
          },
        },
      },
      lyrics: [
        {
          ...baseLyrics.lyrics[0],
          chords: [
            {
              id: 'L1-B7',
              name: 'B7',
              startTime: 1000,
              endTime: 3000,
              wordIndex: 0,
            },
          ],
        },
        baseLyrics.lyrics[1],
      ],
    })

    expect(normalized.resolvedChords.timeline[0]?.definition?.diagram?.frets).toEqual([
      'x',
      2,
      1,
      2,
      0,
      2,
    ])
    expect(getActiveChordAtTime(normalized, 1500)?.name).toBe('B7')
  })

  it('keeps explicit row/column positions for instrumental sections', () => {
    const normalized = normalizeLyricsData({
      ...baseLyrics,
      lyrics: [
        {
          id: 'Intro',
          startTime: 0,
          endTime: 2000,
          text: '[Intro]',
          words: [],
          section: 'intro',
          instrumental: {
            mode: 'textOncePerColumn',
            rows: 1,
            columns: 3,
          },
          chords: [
            { id: 'Intro-0', name: 'B5', startTime: 0, endTime: 600, rowIndex: 0, columnIndex: 0 },
            {
              id: 'Intro-1',
              name: 'E',
              startTime: 600,
              endTime: 1200,
              rowIndex: 0,
              columnIndex: 1,
            },
            {
              id: 'Intro-2',
              name: 'G',
              startTime: 1200,
              endTime: 2000,
              rowIndex: 0,
              columnIndex: 2,
            },
          ],
        },
        ...baseLyrics.lyrics,
      ],
    })

    expect(
      normalized.lyrics[0]?.chords?.map((chord) => [chord.rowIndex, chord.columnIndex])
    ).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ])
    expect(getActiveChordAtTime(normalized, 1100)?.id).toBe('Intro-1')
  })

  it('resolves chord definitions by JSON key while preserving the definition name for display', () => {
    const normalized = normalizeLyricsData({
      ...baseLyrics,
      meta: {
        ...baseLyrics.meta,
        chords: {
          enabled: true,
          definitions: {
            'B-Interlude': {
              name: 'B',
              diagram: { frets: ['x', 2, 4, 4, 4, 2] },
            },
          },
        },
      },
      lyrics: [
        {
          ...baseLyrics.lyrics[0],
          chords: [
            {
              id: 'L1-B-Interlude',
              name: 'B-Interlude',
              startTime: 1000,
              endTime: 3000,
              wordIndex: 0,
            },
          ],
        },
        baseLyrics.lyrics[1],
      ],
    })

    expect(normalized.resolvedChords.timeline[0]?.name).toBe('B-Interlude')
    expect(normalized.resolvedChords.timeline[0]?.definition?.name).toBe('B')
  })
})
