import { beforeEach, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { createPinia } from 'pinia'
import router from '../router'

describe('App', () => {
  beforeEach(async () => {
    await router.push('/home')
    await router.isReady()
  })

  function mountApp() {
    return mount(App, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          RouterView: { template: '<div class="router-view-stub" />' },
          CardDealer: { template: '<div class="card-dealer" />' },
          GlobalAudioPlayer: { template: '<div class="global-audio-player" />' },
          MouseParticles: { template: '<div class="mouse-particles" />' },
        },
      },
    })
  }

  it('renders the main site shell on home routes', () => {
    const wrapper = mountApp()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.card-dealer').exists()).toBe(true)
    expect(wrapper.find('.router-view-stub').exists()).toBe(false)

    wrapper.unmount()
  })

  it('renders standalone routed views on gallery routes', async () => {
    await router.push('/gallery')

    const wrapper = mountApp()

    expect(wrapper.find('.card-dealer').exists()).toBe(false)
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)

    wrapper.unmount()
  })

  it('renders standalone routed views on legal routes', async () => {
    await router.push('/impressum')

    const wrapper = mountApp()

    expect(wrapper.find('.card-dealer').exists()).toBe(false)
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)

    wrapper.unmount()
  })
})
