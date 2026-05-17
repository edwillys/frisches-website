import { describe, expect, it } from 'vitest'

import {
  buildCurrentMasterResourceDebug,
  findLatestAudioResourceEntry,
  getMasterSessionTransferredBytes,
} from '../audioDebugMetrics'

describe('audioDebugMetrics', () => {
  it('matches the current master resource even when URL encoding differs', () => {
    const entry = findLatestAudioResourceEntry(
      [
        {
          name: 'http://localhost:5174/src/assets/private/audio/TalesFromTheCellar/01%20-%20Misled%20-%20Mastered.mp3',
          transferSize: 1234,
        },
      ],
      'http://localhost:5174/src/assets/private/audio/TalesFromTheCellar/01 - Misled - Mastered.mp3'
    )

    expect(entry?.transferSize).toBe(1234)
  })

  it('falls back to content-length and buffered ratio when resource timing reports zero bytes', () => {
    const debug = buildCurrentMasterResourceDebug({
      src: 'http://localhost:5174/audio/song.mp3',
      resourceEntries: [
        {
          name: 'http://localhost:5174/audio/song.mp3',
          transferSize: 0,
          encodedBodySize: 0,
          decodedBodySize: 0,
          duration: 12.2,
        },
      ],
      contentLengthBytes: 1000,
      bufferedRatio: 0.4,
    })

    expect(debug).toEqual({
      src: 'http://localhost:5174/audio/song.mp3',
      transferBytes: 400,
      encodedBodyBytes: 1000,
      decodedBodyBytes: 0,
      durationMs: 12,
    })
  })

  it('uses observed master bytes for cached audio in session totals', () => {
    const total = getMasterSessionTransferredBytes({
      resourceEntries: [
        {
          name: 'http://localhost:5174/audio/cached.mp3',
          transferSize: 0,
          encodedBodySize: 0,
        },
        {
          name: 'http://localhost:5174/audio/live.mp3',
          transferSize: 200,
          encodedBodySize: 200,
        },
      ],
      observedBytesBySrc: new Map([
        ['http://localhost:5174/audio/cached.mp3', 900],
        ['http://localhost:5174/audio/live.mp3', 150],
      ]),
    })

    expect(total).toBe(1100)
  })
})
