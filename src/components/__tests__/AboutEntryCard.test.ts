import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import AboutEntryCard from '../AboutEntryCard.vue'
import ArcadeMenuButton from '../ArcadeMenuButton.vue'
import { SONGSTERR_TABS_URL } from '@/constants/links'

const CARD_RECT = {
  left: 0,
  top: 0,
  right: 200,
  bottom: 300,
  width: 200,
  height: 300,
  x: 0,
  y: 0,
  toJSON: () => ({}),
}

describe('AboutEntryCard', () => {
  const originalRect = HTMLElement.prototype.getBoundingClientRect

  beforeEach(() => {
    vi.useRealTimers()
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => CARD_RECT,
    })
  })

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: originalRect,
    })
    vi.restoreAllMocks()
  })

  it('shows a loading skeleton until the entry image resolves', async () => {
    const wrapper = mount(AboutEntryCard)

    expect(wrapper.find('.about-entry-card__image-skeleton').exists()).toBe(true)

    const baseImage = wrapper.find(
      'img.about-entry-card__image:not(.about-entry-card__image--frame)'
    )
    expect(baseImage.attributes('alt')).toBe('')

    await baseImage.trigger('load')
    await nextTick()

    expect(wrapper.find('.about-entry-card__image-skeleton').exists()).toBe(false)
    expect(baseImage.classes()).toContain('about-entry-card__image--loaded')
  })

  it('keeps the base image visible until the hover frame has loaded', async () => {
    const wrapper = mount(AboutEntryCard, { attachTo: document.body })

    const baseImage = wrapper.find(
      'img.about-entry-card__image:not(.about-entry-card__image--frame)'
    )
    await baseImage.trigger('load')
    await nextTick()

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: -20, clientY: -20 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 24, clientY: 30 }))

    await wrapper.trigger('mouseenter', { clientX: 24, clientY: 30 })
    await nextTick()

    const hoverFrame = wrapper.find('img.about-entry-card__image--frame')
    expect(hoverFrame.exists()).toBe(true)
    expect(baseImage.classes()).not.toContain('about-entry-card__image--covered')

    await hoverFrame.trigger('load')
    await nextTick()

    expect(baseImage.classes()).toContain('about-entry-card__image--covered')
    expect(hoverFrame.classes()).toContain('about-entry-card__image--loaded')

    wrapper.unmount()
  })

  it('does not restart the title typing while an in-flight animation is still running', async () => {
    vi.useFakeTimers()

    const wrapper = mount(AboutEntryCard, { attachTo: document.body })

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: -20, clientY: -20 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 24, clientY: 30 }))

    await wrapper.trigger('mouseenter', { clientX: 24, clientY: 30 })
    await nextTick()

    await vi.advanceTimersByTimeAsync(90)
    await nextTick()

    const title = wrapper.find('.about-entry-card__title').text()
    expect(title.length).toBeGreaterThan(0)
    expect(title).not.toBe("Hi, we're Frisches!")

    await wrapper.trigger('mouseleave')
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: -20, clientY: -20 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 24, clientY: 30 }))
    await wrapper.trigger('mouseenter', { clientX: 24, clientY: 30 })
    await nextTick()

    expect(wrapper.find('.about-entry-card__title').text().length).toBeGreaterThanOrEqual(
      title.length
    )

    await vi.runAllTimersAsync()
    await nextTick()

    expect(wrapper.find('.about-entry-card__title').text()).toContain("Hi, we're Frisches!")

    wrapper.unmount()
  })

  it('passes the stored YouTube tooltip metadata to the story hyperlink card', async () => {
    const wrapper = mount(AboutEntryCard)

    wrapper.findAllComponents(ArcadeMenuButton)[0]?.vm.$emit('press')
    await nextTick()

    const storyLink = wrapper.find('.about-entry-card__story-link')
    expect(storyLink.attributes('data-tooltip-yt')).toBe('_rZYN5G6-gg')
    expect(storyLink.attributes('data-tooltip-card-title')).toContain('Witch Hunting')
    expect(storyLink.attributes('data-tooltip-card-meta-primary')).toBe('2023')
  })

  it('opens the Tabs link in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const wrapper = mount(AboutEntryCard)

    const tabsButton = wrapper
      .findAllComponents(ArcadeMenuButton)
      .find((btn) => btn.props('buttonAriaLabel') === 'Tabs link')
    tabsButton?.vm.$emit('press')
    await nextTick()

    expect(openSpy).toHaveBeenCalledWith(SONGSTERR_TABS_URL, '_blank', 'noopener,noreferrer')
  })
})
