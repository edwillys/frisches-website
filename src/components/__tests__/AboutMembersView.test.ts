import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import AboutMembersView from '../AboutMembersView.vue'
import { useAudioStore } from '@/stores/audio'

const gsapMocks = vi.hoisted(() => ({
  to: vi.fn(),
  set: vi.fn(),
  killTweensOf: vi.fn(),
  context: vi.fn((fn?: () => void) => {
    fn?.()
    return { revert: vi.fn() }
  }),
}))

vi.mock('gsap', () => ({
  default: {
    to: gsapMocks.to,
    set: gsapMocks.set,
    killTweensOf: gsapMocks.killTweensOf,
    context: gsapMocks.context,
  },
}))

describe('AboutMembersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    setActivePinia(createPinia())
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders four cards and focuses the first one when active', async () => {
    const wrapper = mount(AboutMembersView, {
      props: {
        isActive: true,
      },
      attachTo: document.body,
    })

    await nextTick()
    await nextTick()

    expect(wrapper.find('[data-testid="about-members-carousel"]').exists()).toBe(true)
    const cards = wrapper.findAll('[data-member-card="true"]')
    expect(cards).toHaveLength(4)
    expect(document.activeElement).toBe(cards[0]?.element)

    wrapper.unmount()
  })

  it('supports independent flips via member initial shortcuts', async () => {
    const wrapper = mount(AboutMembersView, {
      props: {
        isActive: true,
      },
      attachTo: document.body,
    })

    await nextTick()
    await nextTick()

    const cards = wrapper.findAll('[data-member-card="true"]')
    await cards[0]!.trigger('keydown', { key: 'e' })
    await nextTick()
    await cards[0]!.trigger('keydown', { key: 'c' })
    await nextTick()

    expect(cards[0]!.classes()).toContain('about-flip-card--flipped')
    expect(cards[1]!.classes()).toContain('about-flip-card--flipped')

    wrapper.unmount()
  })

  it('moves focus with arrow keys and toggles the focused card with space', async () => {
    const wrapper = mount(AboutMembersView, {
      props: {
        isActive: true,
      },
      attachTo: document.body,
    })

    await nextTick()
    await nextTick()

    const cards = wrapper.findAll('[data-member-card="true"]')
    await cards[0]!.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()

    expect(document.activeElement).toBe(cards[1]!.element)

    await cards[1]!.trigger('keydown', { key: ' ' })
    await nextTick()

    expect(cards[1]!.classes()).toContain('about-flip-card--flipped')

    wrapper.unmount()
  })

  it('plays the favorite song through the audio store', async () => {
    vi.useFakeTimers()

    const audioStore = useAudioStore()
    const startFromAboutSpy = vi.spyOn(audioStore, 'startFromAbout')

    const wrapper = mount(AboutMembersView, {
      props: {
        isActive: true,
      },
      attachTo: document.body,
    })

    await nextTick()
    await nextTick()

    const firstCard = wrapper.findAll('[data-member-card="true"]')[0]
    await firstCard!.trigger('click')
    await nextTick()

    await vi.runAllTimersAsync()
    await nextTick()

    await wrapper.find('[data-testid="favorite-song-chip"]').trigger('click')

    expect(startFromAboutSpy).toHaveBeenCalledWith('tftc:02-tojd')

    wrapper.unmount()
  })
})
