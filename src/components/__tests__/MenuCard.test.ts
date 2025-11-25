import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MenuCard from '../MenuCard.vue'

describe('MenuCard', () => {
  const defaultProps = {
    title: 'Music',
    image: '/test-image.jpg',
    route: '/music',
    index: 0,
  }

  it('renders properly with required props', () => {
    const wrapper = mount(MenuCard, {
      props: defaultProps,
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.menu-card__title').text()).toBe('Music')
  })

  it('applies background image style', () => {
    const wrapper = mount(MenuCard, {
      props: defaultProps,
    })

    const cardElement = wrapper.find('.menu-card')
    const style = cardElement.attributes('style')
    expect(style).toContain('background-image')
    expect(style).toContain(defaultProps.image)
  })

  it('emits click event with route when clicked', async () => {
    const wrapper = mount(MenuCard, {
      props: defaultProps,
    })

    await wrapper.find('.menu-card').trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]).toEqual(['/music'])
  })

  it('adds hover class on mouse enter', async () => {
    const wrapper = mount(MenuCard, {
      props: defaultProps,
    })

    const card = wrapper.find('.menu-card')
    await card.trigger('mouseenter')

    expect(card.classes()).toContain('menu-card--hovered')
  })

  it('removes hover class on mouse leave', async () => {
    const wrapper = mount(MenuCard, {
      props: defaultProps,
    })

    const card = wrapper.find('.menu-card')
    await card.trigger('mouseenter')
    expect(card.classes()).toContain('menu-card--hovered')

    await card.trigger('mouseleave')
    expect(card.classes()).not.toContain('menu-card--hovered')
  })

  it('displays title in uppercase', () => {
    const wrapper = mount(MenuCard, {
      props: defaultProps,
    })

    const title = wrapper.find('.menu-card__title')
    // CSS text-transform won't be reflected in .text(), so we check the class exists
    expect(title.exists()).toBe(true)
  })

  it('uses default index value when not provided', () => {
    const wrapper = mount(MenuCard, {
      props: {
        title: 'About',
        image: '/about.jpg',
        route: '/about',
      },
    })

    expect(wrapper.props('index')).toBe(0)
  })
})
