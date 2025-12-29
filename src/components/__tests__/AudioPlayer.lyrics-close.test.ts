import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AudioPlayer from '../AudioPlayer.vue'
import { useAudioStore } from '@/stores/audio'

describe('AudioPlayer - Lyrics close button', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify({ lyrics: [], durationMs: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('closes lyrics when the close button is clicked', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(AudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.find('[data-testid="lyrics-view-close"]').exists()).toBe(false)

    audio.toggleLyrics()
    await wrapper.vm.$nextTick()

    const closeBtn = wrapper.find('[data-testid="lyrics-view-close"]')
    expect(closeBtn.exists()).toBe(true)

    await closeBtn.trigger('click')
    expect(audio.showLyrics).toBe(false)
  })
})
