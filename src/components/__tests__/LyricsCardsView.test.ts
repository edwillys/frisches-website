import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LyricsCardsView from '../LyricsCardsView.vue'

vi.mock('@/composables/useLyricsCards', () => ({
  useLyricsCards: () => ({
    albumId: 'tftc',
    albumTitle: 'Tales From The Cellar',
    coverUrl: '/cover.png',
    themeColor: '#d4711c',
    themeColorDark: '#8b4f1a',
    tracks: [],
  }),
}))

describe('LyricsCardsView', () => {
  it('expands the stage when the card requests it', async () => {
    const wrapper = mount(LyricsCardsView, {
      global: {
        stubs: {
          LyricsFlipCard: {
            emits: ['toggle-expand'],
            template:
              '<button data-testid="lyrics-card-expand" @click="$emit(\'toggle-expand\')">expand</button>',
          },
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
          LyricsFlipCard: {
            emits: ['toggle-expand'],
            template:
              '<div data-testid="lyrics-flip-card-stub"><button data-testid="lyrics-card-expand" @click="$emit(\'toggle-expand\')">expand</button></div>',
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
})
