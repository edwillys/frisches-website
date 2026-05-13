import { describe, expect, it } from 'vitest'

import { resolveStemLimiterParams } from '../stemLimiter'

describe('stem limiter metadata', () => {
  it('resolves versioned limiter metadata for TOJD', () => {
    expect(resolveStemLimiterParams('tftc:02-tojd')).toEqual({
      preGainDb: -2.8,
      threshold: -0.1,
      knee: 0,
      ratio: 20,
      attack: 0.003,
      release: 0.1,
    })
  })

  it('returns null for tracks without limiter metadata', () => {
    expect(resolveStemLimiterParams('tftc:01-misled')).toBeNull()
    expect(resolveStemLimiterParams(null)).toBeNull()
  })
})
