import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    const wrapper = mount(App)
    // App mounts and renders the CardDealer component
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.card-dealer').exists()).toBe(true)
  })
})
