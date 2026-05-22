import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import LyricsCardsView from '../LyricsCardsView.vue'

vi.mock('@/composables/useLyricsCards', () => ({
  useLyricsCards: () => ({
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
        hasChords: true,
      },
    ],
  }),
}))

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
        Em: {
          name: 'Em',
          diagram: {
            frets: [0, 2, 2, 0, 0, 0],
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
          endTime: 1800,
          wordIndex: 0,
        },
        {
          id: 'L1-Em',
          name: 'Em',
          startTime: 1800,
          endTime: 3000,
          wordIndex: 1,
        },
      ],
    },
  ],
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

function stubAnimationFrame() {
  let nextHandle = 1
  const callbacks = new Map<number, FrameRequestCallback>()

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const handle = nextHandle
      nextHandle += 1
      callbacks.set(handle, callback)
      return handle
    })
  )

  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((handle: number) => {
      callbacks.delete(handle)
    })
  )

  return {
    async flush() {
      const pending = [...callbacks.values()]
      callbacks.clear()
      for (const callback of pending) {
        callback(performance.now())
      }
      await flushPromises()
    },
  }
}

async function openLyricsDetail(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('.lyrics-flip-card__row').trigger('click')
  await flushPromises()
}

function mountWithRealLyricsCard() {
  return mount(LyricsCardsView, {
    attachTo: document.body,
    global: {
      stubs: {
        AnimatedLoadingGlyph: { template: '<div data-testid="loading-glyph" />' },
      },
    },
  })
}

function createLyricsFlipCardStub(initialState?: {
  reserve?: boolean
  flipped?: boolean
  loading?: boolean
  show?: boolean
  activeChordId?: string | null
}) {
  return defineComponent({
    emits: ['toggle-expand', 'detail-open-change'],
    setup(_, { emit, expose }) {
      const reserveCompactChordRailSlot = ref(initialState?.reserve ?? false)
      const compactChordRailFlipped = ref(initialState?.flipped ?? false)
      const compactChordRailLoading = ref(initialState?.loading ?? false)
      const showCompactChordRail = ref(initialState?.show ?? false)
      const selectedChordId = ref<string | null>(initialState?.activeChordId ?? 'B7')
      const carouselChords = ref([
        { name: 'B7', definition: { displayName: 'B7', diagram: null } },
        { name: 'Em', definition: { displayName: 'Em', diagram: null } },
      ])

      function handleChordSelection(chordName: string) {
        selectedChordId.value = chordName
      }

      expose({
        reserveCompactChordRailSlot,
        compactChordRailFlipped,
        compactChordRailLoading,
        showCompactChordRail,
        carouselChords,
        selectedChordId,
        handleChordSelection,
      })

      return {
        reserveCompactChordRailSlot,
        compactChordRailFlipped,
        compactChordRailLoading,
        showCompactChordRail,
        emit,
      }
    },
    template: `
      <div data-testid="lyrics-flip-card-stub">
        <button data-testid="lyrics-card-expand" @click="emit('toggle-expand')">expand</button>
        <button
          data-testid="stub-toggle-reserve"
          @click="reserveCompactChordRailSlot = !reserveCompactChordRailSlot"
        >
          reserve
        </button>
        <button
          data-testid="stub-toggle-loading"
          @click="compactChordRailLoading = !compactChordRailLoading"
        >
          loading
        </button>
        <button
          data-testid="stub-show-rail"
          @click="showCompactChordRail = true; compactChordRailFlipped = true; compactChordRailLoading = false"
        >
          show rail
        </button>
      </div>
    `,
  })
}

describe('LyricsCardsView', () => {
  beforeEach(() => {
    localStorage.removeItem('frisches:show-chords')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('expands the stage when the card requests it', async () => {
    const wrapper = mount(LyricsCardsView, {
      global: {
        stubs: {
          LyricsFlipCard: createLyricsFlipCardStub(),
        },
      },
    })

    expect(wrapper.find('.lyrics-cards__cell').classes()).not.toContain(
      'lyrics-cards__cell--expanded'
    )

    await wrapper.find('[data-testid="lyrics-card-expand"]').trigger('click')

    expect(wrapper.find('.lyrics-cards__cell').classes()).toContain('lyrics-cards__cell--expanded')
  })

  // ----- Req 9: Click outside the card collapses expanded state -----

  it('collapses when clicking the stage outside the card element', async () => {
    const wrapper = mount(LyricsCardsView, {
      attachTo: document.body,
      global: {
        stubs: {
          LyricsFlipCard: createLyricsFlipCardStub(),
          AnimatedLoadingGlyph: { template: '<div data-testid="loading-glyph" />' },
          ChordFretboard: {
            props: ['name'],
            template: '<div data-testid="fretboard">{{ name }}</div>',
          },
        },
      },
    })

    // Expand
    await wrapper.find('[data-testid="lyrics-card-expand"]').trigger('click')
    expect(wrapper.find('.lyrics-cards__cell').classes()).toContain('lyrics-cards__cell--expanded')

    // Click the stage element directly (outside the card)
    await wrapper.find('[data-testid="lyrics-cards-carousel"]').trigger('click')

    expect(wrapper.find('.lyrics-cards__cell').classes()).not.toContain(
      'lyrics-cards__cell--expanded'
    )
  })

  it('renders the reserved rail card and loading state while chord lyrics are still loading', async () => {
    localStorage.setItem('frisches:show-chords', 'true')
    stubMatchMedia(false)
    const raf = stubAnimationFrame()

    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // Keep the lyrics request pending so the parent has to render the rail loading state.
          })
      )
    )

    const wrapper = mountWithRealLyricsCard()
    await openLyricsDetail(wrapper)
    await raf.flush()

    expect(wrapper.find('[data-testid="lyrics-chord-rail-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lyrics-card-chords-rail-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lyrics-card-chords-rail"]').exists()).toBe(false)
  })

  it('renders rail items in the parent and forwards clicks back to the child handler', async () => {
    localStorage.setItem('frisches:show-chords', 'true')
    stubMatchMedia(false)
    const raf = stubAnimationFrame()

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

    const wrapper = mountWithRealLyricsCard()
    await openLyricsDetail(wrapper)
    await raf.flush()

    const railButtons = wrapper.findAll('.lyrics-chord-rail__item')
    expect(railButtons).toHaveLength(2)
    expect(railButtons[0].classes()).toContain('is-active')

    await railButtons[1].trigger('click')
    await nextTick()

    expect(wrapper.findAll('.lyrics-chord-rail__item')[1].classes()).toContain('is-active')
  })

  it('compensates stage scroll when reserving the rail slot shifts the main card', async () => {
    localStorage.setItem('frisches:show-chords', 'true')
    stubMatchMedia(false)

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

    const wrapper = mountWithRealLyricsCard()

    const stage = wrapper.find('[data-testid="lyrics-cards-carousel"]').element as HTMLElement
    const cardCell = wrapper.find('.lyrics-cards__cell').element as HTMLElement

    Object.defineProperty(stage, 'scrollLeft', {
      value: 0,
      writable: true,
      configurable: true,
    })

    const rectForLeft = (left: number) =>
      ({
        left,
        top: 0,
        right: left + 200,
        bottom: 200,
        width: 200,
        height: 200,
        x: left,
        y: 0,
        toJSON: () => {},
      }) as DOMRect

    vi.spyOn(cardCell, 'getBoundingClientRect')
      .mockImplementationOnce(() => rectForLeft(100))
      .mockImplementation(() => rectForLeft(140))

    const trigger = wrapper.find('.lyrics-flip-card__row').trigger('click')
    await trigger
    await flushPromises()
    await nextTick()

    expect(stage.scrollLeft).toBe(40)
  })
})
