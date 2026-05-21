import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ChordFretboard from '../ChordFretboard.vue'
import LyricsFlipCard from '../LyricsFlipCard.vue'
import type { LyricsAlbumCard } from '@/types/lyricsAlbumCard'

const card: LyricsAlbumCard = {
  albumId: 'tftc',
  albumTitle: 'Tales From The Cellar',
  coverUrl: '/cover.png',
  themeColor: '#d4711c',
  themeColorDark: '#8b4f1a',
  tracks: [
    {
      trackId: 'tftc:05-witch-hunting',
      title: 'Witch Hunting',
      lyricsPath: '/lyrics/witch-hunting.json',
      credits: 'Written by: Edgar Lubicz',
    },
  ],
}

const chordLyricsResponse = {
  meta: {
    title: 'Witch Hunting',
    totalDurationMs: 8000,
    version: '1.0',
    chords: {
      enabled: true,
      definitions: {
        B7: {
          name: 'B7',
          diagram: {
            frets: ['x', 2, 1, 2, 0, 2],
          },
        },
      },
    },
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
      chords: [
        {
          id: 'L1-B7',
          name: 'B7',
          startTime: 1000,
          endTime: 3000,
          wordIndex: 0,
        },
        {
          id: 'L1-B7-repeat',
          name: 'B7',
          startTime: 2200,
          endTime: 3000,
          wordIndex: 2,
        },
      ],
    },
  ],
}

type MountedWrapper = ReturnType<typeof mount>

async function openLyricsDetail(wrapper: MountedWrapper) {
  await wrapper.find('.lyrics-flip-card__row').trigger('click')
  await flushPromises()
}

async function enableChords(wrapper: MountedWrapper) {
  await wrapper.find('[data-testid="lyrics-card-chords-toggle"]').trigger('click')
  await flushPromises()
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches,
      media: '(min-width: 1100px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

describe('LyricsFlipCard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(chordLyricsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    )
    localStorage.removeItem('frisches:show-chords')
    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows floating controls after opening a chord-enabled track', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card, canExpand: true },
    })

    await openLyricsDetail(wrapper)

    const controls = wrapper.find('[data-testid="lyrics-card-floating-controls"]')
    expect(controls.exists()).toBe(true)
    expect(controls.find('[data-testid="lyrics-card-chords-toggle"]').exists()).toBe(true)
    // Expand button is now a bottom-right absolute button, not inside floating-controls
    expect(wrapper.find('[data-testid="lyrics-card-expand"]').exists()).toBe(true)
  })

  it('exposes showCompactChordRail=true when chords are enabled in normal mode', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card },
      attachTo: document.body,
    })

    await openLyricsDetail(wrapper)
    await enableChords(wrapper)

    // The chord rail card is now rendered by the parent (LyricsCardsView) as a sibling;
    // LyricsFlipCard exposes the state the parent needs.
    expect((wrapper.vm as unknown as Record<string, unknown>).showCompactChordRail).toBe(true)
    // Rail markup no longer lives inside LyricsFlipCard
    expect(wrapper.find('[data-testid="lyrics-card-chords-rail-card"]').exists()).toBe(false)
    // Carousel is not shown in normal (non-expanded) mode
    expect(wrapper.find('.lyrics-flip-card__chords-carousel').exists()).toBe(false)
  })

  it('highlights the clicked inline chord and the matching rail item', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card },
      attachTo: document.body,
    })

    await openLyricsDetail(wrapper)
    await enableChords(wrapper)

    await wrapper.find('.lyrics-flip-card__inline-chord').trigger('click')
    await flushPromises()

    expect(wrapper.find('.lyrics-flip-card__inline-chord.is-active').exists()).toBe(true)
    // Rail items are rendered in the parent (LyricsCardsView); verify selectedChordId is exposed
    const vm = wrapper.vm as unknown as Record<string, unknown>
    expect(vm.selectedChordId).toBeTruthy()
  })

  it('keeps card chord clicks local and does not emit seek', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card },
      attachTo: document.body,
    })

    await openLyricsDetail(wrapper)
    await enableChords(wrapper)
    await wrapper.find('.lyrics-flip-card__inline-chord').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('seek')).toBeFalsy()
  })

  it('renders the enlarged chord on the right in expanded mode on wide layouts', async () => {
    stubMatchMedia(true)

    const wrapper = mount(LyricsFlipCard, {
      props: { card, canExpand: true, isExpanded: true },
      attachTo: document.body,
    })

    await openLyricsDetail(wrapper)
    await enableChords(wrapper)
    await wrapper.find('.lyrics-flip-card__inline-chord').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="lyrics-card-chord-panel"]').exists()).toBe(true)

    const largeBoard = wrapper
      .findAllComponents(ChordFretboard)
      .find((component) => component.props('large') === true)

    expect(largeBoard).toBeTruthy()
    expect(largeBoard?.props('name')).toBe('B7')
  })

  it('does not render the enlarged chord panel on narrow expanded layouts', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card, canExpand: true, isExpanded: true },
      attachTo: document.body,
    })

    await openLyricsDetail(wrapper)
    await enableChords(wrapper)
    await wrapper.find('.lyrics-flip-card__inline-chord').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="lyrics-card-chord-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="lyrics-card-chord-strip-top"]').exists()).toBe(true)
  })

  it('emits toggle-expand from the floating expand button', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card, canExpand: true },
    })

    await openLyricsDetail(wrapper)
    await wrapper.find('[data-testid="lyrics-card-expand"]').trigger('click')

    expect(wrapper.emitted('toggle-expand')).toEqual([[]])
  })

  it('persists showChords to localStorage when toggled', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card, canExpand: true },
    })

    await openLyricsDetail(wrapper)

    expect(localStorage.getItem('frisches:show-chords')).toBeNull()

    await wrapper.find('[data-testid="lyrics-card-chords-toggle"]').trigger('click')
    expect(localStorage.getItem('frisches:show-chords')).toBe('true')

    await wrapper.find('[data-testid="lyrics-card-chords-toggle"]').trigger('click')
    expect(localStorage.getItem('frisches:show-chords')).toBe('false')
  })

  it('does not reset showChords when the card prop changes', async () => {
    localStorage.setItem('frisches:show-chords', 'true')

    const wrapper = mount(LyricsFlipCard, {
      props: { card, canExpand: true },
    })

    await openLyricsDetail(wrapper)

    expect(
      wrapper.find('[data-testid="lyrics-card-chords-toggle"]').attributes('aria-pressed')
    ).toBe('true')

    await wrapper.setProps({
      card: {
        ...card,
        albumTitle: 'Another Album',
      },
    })
    await flushPromises()

    expect(
      wrapper.find('[data-testid="lyrics-card-chords-toggle"]').attributes('aria-pressed')
    ).toBe('true')
  })

  it('flips back to the track list when Escape is pressed inside the lyrics view', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card },
      attachTo: document.body,
    })

    await openLyricsDetail(wrapper)
    await enableChords(wrapper)

    expect(wrapper.classes()).toContain('lyrics-flip-card--flipped')

    await wrapper.find('.lyrics-flip-card__inline-chord').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.classes()).not.toContain('lyrics-flip-card--flipped')
  })

  it('flips back to the track list when backSignal changes', async () => {
    const wrapper = mount(LyricsFlipCard, {
      props: { card, backSignal: 0 },
    })

    await openLyricsDetail(wrapper)
    expect(wrapper.classes()).toContain('lyrics-flip-card--flipped')

    await wrapper.setProps({ backSignal: 1 })
    await flushPromises()

    expect(wrapper.classes()).not.toContain('lyrics-flip-card--flipped')
  })
})
