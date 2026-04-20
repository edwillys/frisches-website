import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import AboutFlipCard from '../AboutFlipCard.vue'
import { getAboutMembers } from '@/data/aboutMembers'

const aboutMembers = getAboutMembers('en')
const edgarMember = aboutMembers[0]
const camiMember = aboutMembers[1]
const steffMember = aboutMembers[2]

if (!edgarMember || !camiMember || !steffMember) {
  throw new Error('Expected about members fixtures to include Edgar, Cami, and Steff')
}

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
        member: edgarMember,
        isFlipped: false,
      },
    })

    expect(wrapper.find('.about-flip-card__title').text()).toBe('Edgar')
    expect(wrapper.find('.about-flip-card__shortcut').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-badges-front"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-avatar-front"]').attributes('srcset')).toContain(
      '128w'
    )
    expect(wrapper.find('[data-testid="member-avatar-back"]').exists()).toBe(true)
    // When avatarBack is set without an explicit avatarBackSrcset (e.g. Edgar with pose frames),
    // the srcset attribute is intentionally omitted and the src alone is used.
    const backAvatarSrcset = wrapper.find('[data-testid="member-avatar-back"]').attributes('srcset')
    if (backAvatarSrcset !== undefined) {
      expect(backAvatarSrcset).toContain('128w')
    }
    expect(wrapper.find('.about-flip-card__title--back').exists()).toBe(false)
    expect(
      wrapper.find('.about-flip-card__face--front [data-testid="member-avatar-slot-back"]').exists()
    ).toBe(false)
    expect(
      wrapper.findAll('.about-flip-card__face--back [data-testid="member-badge"]')
    ).toHaveLength(2)
    expect(wrapper.find('[data-testid="member-avatar-skeleton"]').exists()).toBe(true)
  })

  it('emits toggle on click and on keyboard activation', async () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: camiMember,
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
        member: edgarMember,
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
        member: edgarMember,
        isFlipped: true,
      },
    })

    const description = wrapper.find('.about-flip-card__copy').text()
    expect(description).toContain('Plays the guitar and sometimes the fool')
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
      attachTo: document.body,
      props: {
        member: camiMember,
        isFlipped: false,
      },
    })

    Object.defineProperty(wrapper.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 300,
        width: 200,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: -20, clientY: -20 }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 24, clientY: 30 }))

    expect(wrapper.find('.about-flip-card__title').text()).toBe('Cami')

    await wrapper.trigger('mouseenter', { clientX: 24, clientY: 30 })
    await nextTick()

    expect(wrapper.classes()).toContain('about-flip-card--title-typing')

    await vi.runAllTimersAsync()
    await nextTick()

    expect(wrapper.find('.about-flip-card__title').text()).toBe('Cami')
    expect(wrapper.classes()).not.toContain('about-flip-card--title-typing')
    expect(wrapper.classes()).toContain('about-flip-card--show-title-cursor')
  })

  it('does not trigger hover typing when the pointer was already inside the card', async () => {
    const originalRect = HTMLElement.prototype.getBoundingClientRect

    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 300,
        width: 200,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: -20, clientY: -20 }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 38, clientY: 42 }))

    const wrapper = mount(AboutFlipCard, {
      attachTo: document.body,
      props: {
        member: camiMember,
        isFlipped: false,
      },
    })

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: -20, clientY: -20 }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 38, clientY: 42 }))

    await wrapper.setProps({ member: edgarMember })
    await nextTick()

    await wrapper.trigger('mouseenter', { clientX: 38, clientY: 42 })
    await nextTick()

    expect(wrapper.classes()).not.toContain('about-flip-card--title-typing')
    expect(wrapper.classes()).not.toContain('about-flip-card--show-title-cursor')

    wrapper.unmount()
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: originalRect,
    })
  })

  it('hides the loading glyph after the avatar resolves', async () => {
    const wrapper = mount(AboutFlipCard, {
      props: {
        member: edgarMember,
        isFlipped: false,
      },
    })

    expect(wrapper.find('[data-testid="member-avatar-skeleton"]').exists()).toBe(true)

    await wrapper.find('[data-testid="member-avatar-front"]').trigger('load')
    await nextTick()

    expect(wrapper.find('[data-testid="member-avatar-skeleton"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-avatar-front"]').classes()).toContain(
      'about-flip-card__avatar--loaded'
    )
  })

  it('types the back copy when the card flips open', async () => {
    vi.useFakeTimers()

    const wrapper = mount(AboutFlipCard, {
      props: {
        member: edgarMember,
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
        member: steffMember,
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
