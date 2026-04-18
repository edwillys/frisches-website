import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import AboutFlipCard from '../AboutFlipCard.vue'
import { getAboutMembers } from '@/data/aboutMembers'

const aboutMembers = getAboutMembers('en')

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

describe('AboutFlipCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('renders a centered front title and keeps badges on the back only', () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[0],
        isFlipped: false,
      },
    })

    expect(wrapper.find('.about-flip-card__title').text()).toBe('Edgar')
    expect(wrapper.find('.about-flip-card__shortcut').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-badges-front"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-avatar-front"]').attributes('srcset')).toContain(
      '128w'
    )
    expect(wrapper.find('[data-testid="member-avatar-slot-back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="member-avatar-back"]').attributes('srcset')).toContain(
      '128w'
    )
    expect(wrapper.find('.about-flip-card__title--back').exists()).toBe(false)
    expect(
      wrapper.find('.about-flip-card__face--front [data-testid="member-avatar-slot-back"]').exists()
    ).toBe(false)
    expect(
      wrapper.findAll('.about-flip-card__face--back [data-testid="member-badge"]')
    ).toHaveLength(2)
  })

  it('emits toggle on click and on keyboard activation', async () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[1],
        isFlipped: false,
      },
      attachTo: document.body,
    })

    await wrapper.trigger('click')
    await wrapper.trigger('keydown', { key: 'Enter' })
    await wrapper.trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('toggle')).toHaveLength(3)

    wrapper.unmount()
  })

  it('emits favorite-song playback without toggling the card', async () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[0],
        isFlipped: true,
      },
    })

    await wrapper.find('[data-testid="favorite-song-chip"]').trigger('click')

    expect(wrapper.emitted('play-favorite')).toEqual([['tftc:02-tojd']])
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('renders the favorite song as an inline description link on the back', () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[0],
        isFlipped: true,
      },
    })

    const description = wrapper.find('.about-flip-card__copy').text()
    expect(description).toContain('Edgar still chases Zeppelin-sized weight')
    expect(description).toContain('Tears Of Joyful Despair')
    expect(wrapper.find('.about-flip-card__face--back .about-flip-card__song-chip').exists()).toBe(
      true
    )
    expect(
      wrapper.findAll('.about-flip-card__face--back [data-testid="member-badge"]')
    ).toHaveLength(2)
  })

  it('types the front title on hover before showing the cursor', async () => {
    vi.useFakeTimers()

    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[1],
        isFlipped: false,
      },
    })

    expect(wrapper.find('.about-flip-card__title').text()).toBe('Cami')

    await wrapper.trigger('mouseenter')
    await nextTick()

    expect(wrapper.classes()).toContain('about-flip-card--title-typing')

    await vi.runAllTimersAsync()
    await nextTick()

    expect(wrapper.find('.about-flip-card__title').text()).toBe('Cami')
    expect(wrapper.classes()).not.toContain('about-flip-card--title-typing')
    expect(wrapper.classes()).toContain('about-flip-card--show-title-cursor')
  })

  it('types the back copy when the card flips open', async () => {
    vi.useFakeTimers()

    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[0],
        isFlipped: false,
      },
    })

    expect(wrapper.find('.about-flip-card__copy').text()).toBe('')

    await wrapper.setProps({ isFlipped: true })
    await nextTick()

    expect(wrapper.classes()).toContain('about-flip-card--typing')
    expect(wrapper.find('.about-flip-card__copy').text()).not.toContain('Tears Of Joyful Despair')

    await vi.runAllTimersAsync()
    await nextTick()

    expect(wrapper.classes()).not.toContain('about-flip-card--typing')
    expect(wrapper.find('.about-flip-card__copy').text()).toContain('Tears Of Joyful Despair')
  })

  it('animates the card rotation when flipped state changes', async () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: aboutMembers[2],
        isFlipped: false,
      },
    })

    await wrapper.setProps({ isFlipped: true })

    expect(gsapMocks.to).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ rotateY: 180 })
    )
  })
})
