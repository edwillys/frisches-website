import { describe, expect, it } from 'vitest'

import {
  resolveStemAudioSources,
  resolveStemAvailability,
  resolveStemAvailabilityForTrackEntry,
  resolveStemEntryAvailability,
  resolveStemGroupItems,
} from '../stems'

describe('stem metadata availability', () => {
  it('keeps stems disabled until the referenced audio file exists', () => {
    expect(resolveStemAvailability('tftc:01-misled')).toEqual({
      drums: false,
      guitar: false,
      bass: false,
      vocals: false,
      flute: false,
      brass: false,
      percussion: false,
      keyboard: false,
      strings: false,
    })
  })

  it('returns all stems disabled for malformed track ids', () => {
    expect(resolveStemAvailability('tftc')).toEqual({
      drums: false,
      guitar: false,
      bass: false,
      vocals: false,
      flute: false,
      brass: false,
      percussion: false,
      keyboard: false,
      strings: false,
    })
  })

  it('returns all stems disabled for unknown tracks', () => {
    expect(resolveStemAvailability('missing-track')).toEqual({
      drums: false,
      guitar: false,
      bass: false,
      vocals: false,
      flute: false,
      brass: false,
      percussion: false,
      keyboard: false,
      strings: false,
    })
  })

  it('enables a stem when force=true even without a file', () => {
    expect(resolveStemEntryAvailability({ force: true })).toBe(true)
  })

  it('disables a stem when force=false even if a path is provided', () => {
    expect(resolveStemEntryAvailability({ path: './01-misled/drums.wav', force: false })).toBe(
      false
    )
  })

  it('accepts case-insensitive string booleans in force', () => {
    expect(resolveStemEntryAvailability({ force: 'TRUE' })).toBe(true)
    expect(resolveStemEntryAvailability({ path: './01-misled/drums.wav', force: 'fAlSe' })).toBe(
      false
    )
  })

  it('uses file validity when force is auto or omitted', () => {
    expect(resolveStemEntryAvailability({ path: './01-misled/drums.wav', force: 'auto' })).toBe(
      false
    )
    expect(resolveStemEntryAvailability({ path: './01-misled/drums.wav' })).toBe(false)
  })

  it('treats missing instrument keys in a track entry as disabled', () => {
    expect(
      resolveStemAvailabilityForTrackEntry(
        {
          drums: { force: true },
        },
        'TalesFromTheCellar/stems'
      )
    ).toEqual({
      drums: true,
      guitar: false,
      bass: false,
      vocals: false,
      flute: false,
      brass: false,
      percussion: false,
      keyboard: false,
      strings: false,
    })
  })

  it('enables TOJD stems when the referenced files exist', () => {
    expect(resolveStemAvailability('tftc:02-tojd')).toEqual({
      drums: true,
      guitar: true,
      bass: true,
      vocals: true,
      flute: false,
      brass: false,
      percussion: true,
      keyboard: false,
      strings: true,
    })
  })

  it('returns grouped TOJD guitar and vocals items with available sources', () => {
    expect(resolveStemGroupItems('tftc:02-tojd')).toEqual({
      guitar: [
        expect.objectContaining({
          label: 'Guitar PRS',
          shortLabel: 'Riff1',
          type: 'electric',
          isAvailable: true,
        }),
        expect.objectContaining({
          label: 'Guitar MM',
          shortLabel: 'Riff2',
          type: 'electric',
          isAvailable: true,
        }),
        expect.objectContaining({
          label: 'Guitar AS93',
          shortLabel: 'ODub',
          type: 'electric',
          isAvailable: true,
        }),
        expect.objectContaining({
          label: 'Guitar Maton',
          shortLabel: 'Support',
          type: 'acoustic',
          isAvailable: true,
        }),
        expect.objectContaining({
          label: 'Guitar Solo',
          shortLabel: 'Solo',
          role: 'solo',
          isAvailable: true,
        }),
      ],
      vocals: [
        expect.objectContaining({
          label: 'Vocals Main',
          shortLabel: 'Lead',
          role: 'main',
          isAvailable: true,
        }),
        expect.objectContaining({
          label: 'Vocals Backing',
          shortLabel: 'Choir',
          role: 'backing',
          isAvailable: true,
        }),
      ],
    })
  })

  it('resolves TOJD audio source paths for grouped stems', () => {
    expect(resolveStemAudioSources('tftc:02-tojd')).toEqual(
      expect.objectContaining({
        guitar: [
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Guitar Base - PRS.mp3',
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Guitar Base - MM.mp3',
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Guitar Base - AS93.mp3',
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Guitar Base - Maton.mp3',
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Guitar Solo.mp3',
        ],
        vocals: [
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Vox Main.mp3',
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Vox Backing.mp3',
        ],
        bass: ['/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Bass.mp3'],
        drums: ['/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Drums.mp3'],
        percussion: [
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Percussion.mp3',
        ],
        strings: [
          '/src/assets/private/audio/TalesFromTheCellar/stems/02 - TOJD/TOJD - Orchestra.mp3',
        ],
      })
    )
  })
})
