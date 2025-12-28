import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LyricsDisplay from '../LyricsDisplay.vue'
import type { LyricsData } from '@/types/lyrics'

describe('LyricsDisplay', () => {
  const mockLyricsData: LyricsData = {
    meta: {
      title: 'Test Song',
      totalDurationMs: 8000,
      version: '1.0',
    },
    lyrics: [
      {
        id: 'line-1',
        startTime: 1000,
        endTime: 3000,
        text: 'First line here',
        words: [
          { text: 'First', startTime: 1000, endTime: 1500, duration: 500 },
          { text: 'line', startTime: 1500, endTime: 2000, duration: 500 },
          { text: 'here', startTime: 2000, endTime: 3000, duration: 1000 },
        ],
      },
      {
        id: 'line-2',
        startTime: 3500,
        endTime: 5500,
        text: 'Second line test',
        words: [
          { text: 'Second', startTime: 3500, endTime: 4000, duration: 500 },
          { text: 'line', startTime: 4000, endTime: 4500, duration: 500 },
          { text: 'test', startTime: 4500, endTime: 5500, duration: 1000 },
        ],
      },
      {
        id: 'line-3',
        startTime: 6000,
        endTime: 8000,
        text: 'Third line words',
        words: [
          { text: 'Third', startTime: 6000, endTime: 6500, duration: 500 },
          { text: 'line', startTime: 6500, endTime: 7000, duration: 500 },
          { text: 'words', startTime: 7000, endTime: 8000, duration: 1000 },
        ],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders lyrics lines', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 0,
        isPlaying: false,
      },
    })

    const lines = wrapper.findAll('.lyrics-line')
    expect(lines).toHaveLength(3)
    expect(lines[0]?.text()).toContain('First')
    expect(lines[1]?.text()).toContain('Second')
    expect(lines[2]?.text()).toContain('Third')
  })

  it('renders all words in each line', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 0,
        isPlaying: false,
      },
    })

    const firstLine = wrapper.find('[data-line-index="0"]')
    const words = firstLine.findAll('.lyrics-word')
    expect(words).toHaveLength(3)
    expect(words[0]?.text()).toBe('First')
    expect(words[1]?.text()).toBe('line')
    expect(words[2]?.text()).toBe('here')
  })

  it('marks active line correctly', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2, // 2 seconds = 2000ms, in first line
        isPlaying: true,
      },
    })

    const lines = wrapper.findAll('.lyrics-line')
    expect(lines[0]?.classes()).toContain('is-active')
    expect(lines[1]?.classes()).not.toContain('is-active')
    expect(lines[2]?.classes()).not.toContain('is-active')
  })

  it('marks past lines correctly', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 7, // 7 seconds = 7000ms, in third line
        isPlaying: true,
      },
    })

    const lines = wrapper.findAll('.lyrics-line')
    expect(lines[0]?.classes()).toContain('is-past')
    expect(lines[1]?.classes()).toContain('is-past')
    expect(lines[2]?.classes()).toContain('is-active')
  })

  it('marks future lines correctly', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2, // In first line
        isPlaying: true,
      },
    })

    const lines = wrapper.findAll('.lyrics-line')
    expect(lines[0]?.classes()).toContain('is-active')
    expect(lines[1]?.classes()).toContain('is-future')
    expect(lines[2]?.classes()).toContain('is-future')
  })

  it('marks active word correctly', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 1.75, // 1750ms, in "line" word of first line
        isPlaying: true,
      },
    })

    const firstLine = wrapper.find('[data-line-index="0"]')
    const words = firstLine.findAll('.lyrics-word')
    expect(words[0]?.classes()).not.toContain('is-active')
    expect(words[1]?.classes()).toContain('is-active')
    expect(words[2]?.classes()).not.toContain('is-active')
  })

  it('marks past words correctly', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2.5, // 2500ms, in "here" word, past "First" and "line"
        isPlaying: true,
      },
    })

    const firstLine = wrapper.find('[data-line-index="0"]')
    const words = firstLine.findAll('.lyrics-word')
    expect(words[0]?.classes()).toContain('is-past')
    expect(words[1]?.classes()).toContain('is-past')
    expect(words[2]?.classes()).toContain('is-active')
  })

  it('emits seek event when line is clicked', async () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 0,
        isPlaying: false,
      },
    })

    const secondLine = wrapper.find('[data-line-index="1"]')
    await secondLine.trigger('click')

    expect(wrapper.emitted('seek')).toBeTruthy()
    expect(wrapper.emitted('seek')?.[0]).toEqual([3.5]) // 3500ms / 1000
  })

  it('shows sync button when not in sync mode and playing', async () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2,
        isPlaying: true,
      },
    })

    // Initially in sync mode, no button
    expect(wrapper.find('.sync-button').exists()).toBe(false)

    // Simulate manual scroll
    const container = wrapper.find('.lyrics-container')
    await container.trigger('wheel')
    await container.trigger('scroll')
    await nextTick()

    // Should show sync button after manual scroll
    expect(wrapper.find('.sync-button').exists()).toBe(true)
  })

  it('hides sync button when not playing', async () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2,
        isPlaying: false,
      },
    })

    // Simulate manual scroll
    const container = wrapper.find('.lyrics-container')
    await container.trigger('wheel')
    await container.trigger('scroll')
    await nextTick()

    // Should not show sync button when not playing
    expect(wrapper.find('.sync-button').exists()).toBe(false)
  })

  it('re-syncs when sync button is clicked', async () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2,
        isPlaying: true,
      },
    })

    // Simulate manual scroll to show sync button
    const container = wrapper.find('.lyrics-container')
    await container.trigger('wheel')
    await container.trigger('scroll')
    await nextTick()

    // Click sync button
    const syncButton = wrapper.find('.sync-button')
    await syncButton.trigger('click')
    await nextTick()

    // Sync button should disappear
    expect(wrapper.find('.sync-button').exists()).toBe(false)
  })

  it('does not disable sync on programmatic scroll', async () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2,
        isPlaying: true,
      },
      attachTo: document.body,
    })

    // Programmatic scroll: emit scroll without user intent
    const container = wrapper.find('.lyrics-container')
    await container.trigger('scroll')
    await nextTick()

    expect(wrapper.find('.sync-button').exists()).toBe(false)
  })

  it('auto re-enables sync when lyrics catch up into view', async () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 2,
        isPlaying: true,
      },
      attachTo: document.body,
    })

    const container = wrapper.find('.lyrics-container')

    // Stub layout geometry (jsdom returns 0s otherwise)
    ;(container.element as HTMLElement).getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        bottom: 200,
        right: 300,
        width: 300,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect

    const line0 = wrapper.find('[data-line-index="0"]').element as HTMLElement
    const line1 = wrapper.find('[data-line-index="1"]').element as HTMLElement

    // Start with active line (0) out of the sync window
    line0.getBoundingClientRect = () =>
      ({
        top: -600,
        left: 0,
        bottom: -560,
        right: 300,
        width: 300,
        height: 40,
        x: 0,
        y: -600,
        toJSON: () => {},
      }) as DOMRect
    // When line 1 becomes active, pretend it's centered
    line1.getBoundingClientRect = () =>
      ({
        top: 80,
        left: 0,
        bottom: 120,
        right: 300,
        width: 300,
        height: 40,
        x: 0,
        y: 80,
        toJSON: () => {},
      }) as DOMRect

    // Ensure scrollIntoView exists (used when re-syncing)
    ;(line1 as unknown as { scrollIntoView?: () => void }).scrollIntoView = vi.fn()

    // User manually scrolls -> sync disabled -> button visible
    await container.trigger('wheel')
    await container.trigger('scroll')
    await nextTick()
    expect(wrapper.find('.sync-button').exists()).toBe(true)

    // As time advances, active line becomes visible/centered -> auto re-sync
    await wrapper.setProps({ currentTime: 3.6 })
    await nextTick()

    expect(wrapper.find('.sync-button').exists()).toBe(false)
  })

  it('does not mark a word active at its exact start time', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: mockLyricsData,
        currentTime: 1, // 1000ms, exactly at the start of "First"
        isPlaying: true,
      },
    })

    const firstLine = wrapper.find('[data-line-index="0"]')
    const words = firstLine.findAll('.lyrics-word')
    expect(words[0]?.classes()).not.toContain('is-active')
  })

  it('renders empty state when no lyrics data', () => {
    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: null,
        currentTime: 0,
        isPlaying: false,
      },
    })

    expect(wrapper.find('.lyrics-line').exists()).toBe(false)
  })

  it('handles lyrics with empty words array', () => {
    const emptyWordsData: LyricsData = {
      meta: {
        title: 'Empty Words Test',
        totalDurationMs: 2000,
        version: '1.0',
      },
      lyrics: [
        {
          id: 'line-1',
          startTime: 1000,
          endTime: 2000,
          text: 'Test',
          words: [],
        },
      ],
    }

    const wrapper = mount(LyricsDisplay, {
      props: {
        lyricsData: emptyWordsData,
        currentTime: 1.5,
        isPlaying: true,
      },
    })

    const line = wrapper.find('.lyrics-line')
    expect(line.exists()).toBe(true)
    expect(line.findAll('.lyrics-word')).toHaveLength(0)
  })
})
