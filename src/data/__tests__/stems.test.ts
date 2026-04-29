import { describe, expect, it } from 'vitest'

import {
  resolveStemAvailability,
  resolveStemAvailabilityForTrackEntry,
  resolveStemEntryAvailability,
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
    })
  })
})
