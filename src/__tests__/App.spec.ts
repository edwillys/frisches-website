import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { createPinia } from 'pinia'
describe('App', () => {
  it('mounts renders properly', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    })
    // App mounts and renders the CardDealer component
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.card-dealer').exists()).toBe(true)

    wrapper.unmount()
  }, 15000)
})
