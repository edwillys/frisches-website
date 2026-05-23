import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import AboutView from '../AboutView.vue'

const gsapMocks = vi.hoisted(() => {
  let toCallCount = 0

  return {
    to: vi.fn(() => {
      toCallCount += 1
      // First outgoing animation resolves (entry -> members), second one stays pending
      // to reproduce re-entry reset timing behavior.
      if (toCallCount === 1) {
        return Promise.resolve()
      }
      return new Promise(() => {})
    }),
    fromTo: vi.fn(() => Promise.resolve()),
    __reset: () => {
      toCallCount = 0
    },
  }
})

vi.mock('gsap', () => ({
  default: {
    to: gsapMocks.to,
    fromTo: gsapMocks.fromTo,
  },
}))

describe('AboutView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gsapMocks.__reset()
  })

  it('resets immediately to entry when re-entering about', async () => {
    const wrapper = mount(AboutView, {
      props: { isActive: true },
      global: {
        stubs: {
          AboutEntryCard: {
            template:
              '<button data-testid="open-members" @click="$emit(\'open-members\')">open</button>',
          },
          AboutMembersView: {
            template: '<div data-testid="members-stub">members</div>',
          },
          LyricsCardsView: {
            template: '<div data-testid="lyrics-stub">lyrics</div>',
          },
        },
      },
      attachTo: document.body,
    })

    await wrapper.find('[data-testid="open-members"]').trigger('click')
    await flushPromises()
    await nextTick()

    const membersSectionBeforeReenter = wrapper.find('[data-about-section="members"]')
    const entrySectionBeforeReenter = wrapper.find('[data-about-section="entry"]')

    expect(membersSectionBeforeReenter.attributes('style') || '').not.toContain('display: none;')
    expect(entrySectionBeforeReenter.attributes('style') || '').toContain('display: none;')

    await wrapper.setProps({ isActive: false })
    await nextTick()

    await wrapper.setProps({ isActive: true })
    await nextTick()

    const membersSectionAfterReenter = wrapper.find('[data-about-section="members"]')
    const entrySectionAfterReenter = wrapper.find('[data-about-section="entry"]')

    expect(entrySectionAfterReenter.attributes('style') || '').not.toContain('display: none;')
    expect(membersSectionAfterReenter.attributes('style') || '').toContain('display: none;')

    wrapper.unmount()
  })

  it('emits none as active submenu on the about entry state', async () => {
    const wrapper = mount(AboutView, {
      props: { isActive: true },
      global: {
        stubs: {
          AboutEntryCard: {
            template: '<div data-testid="entry-stub" />',
          },
          AboutMembersView: {
            template: '<div data-testid="members-stub" />',
          },
          LyricsCardsView: {
            template: '<div data-testid="lyrics-stub" />',
          },
        },
      },
    })

    await nextTick()

    const emitted = wrapper.emitted('state-change') ?? []
    expect(emitted.length).toBeGreaterThan(0)
    expect(emitted[0]?.[0]).toEqual({
      activeSubmenu: 'none',
      canGoBack: false,
      isLyricsExpanded: false,
    })

    wrapper.unmount()
  })

  it('widens the about layout when the lyrics card enters expanded mode', async () => {
    const wrapper = mount(AboutView, {
      props: { isActive: true },
      global: {
        stubs: {
          AboutEntryCard: {
            template:
              '<button data-testid="open-lyrics" @click="$emit(\'open-lyrics\')">lyrics</button>',
          },
          AboutMembersView: {
            template: '<div data-testid="members-stub" />',
          },
          LyricsCardsView: {
            template:
              '<button data-testid="expand-lyrics" @click="$emit(\'expand-change\', true)">expand</button>',
          },
        },
      },
    })

    await wrapper.find('[data-testid="open-lyrics"]').trigger('click')
    await flushPromises()
    await nextTick()

    await wrapper.find('[data-testid="expand-lyrics"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="about-view"]').classes()).toContain(
      'about-view--lyrics-expanded'
    )

    const emitted = wrapper.emitted('state-change') ?? []
    expect(emitted.at(-1)?.[0]).toEqual({
      activeSubmenu: 'lyrics',
      canGoBack: true,
      isLyricsExpanded: true,
    })

    wrapper.unmount()
  })
})
