import { describe, expect, it } from 'vitest'

import { getAboutMembers } from '@/data/aboutMembers'

describe('About members registry', () => {
  it('returns localized members with the expected badge metadata', () => {
    const members = getAboutMembers('en')

    expect(members).toHaveLength(4)
    expect(members[0]?.name).toBe('Edgar')
    expect(members[0]?.badges).toHaveLength(2)
    expect(members[2]?.badges[0]?.title).toBe('Drums')
  })

  it('falls back to the default locale for unknown runtime locale values', () => {
    const members = getAboutMembers('xx' as never)

    expect(members[1]?.name).toBe('Cami')
    expect(members[1]?.badges[1]?.title).toBe('Flute')
  })
})
