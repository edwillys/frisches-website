import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { createPinia } from 'pinia'
// Mock @tresjs/cientos to avoid module resolution issues
vi.mock('@tresjs/cientos', () => ({
  OrbitControls: { name: 'OrbitControls', template: '<div class="mock-orbit-controls"></div>' },
  GLTFModel: { name: 'GLTFModel', template: '<div class="mock-gltf-model"></div>' },
  useGLTF: vi.fn(() => ({ nodes: {}, materials: {} })),
}))

// Mock @tresjs/core
vi.mock('@tresjs/core', () => ({
  TresCanvas: { name: 'TresCanvas', template: '<div class="mock-tres-canvas"><slot /></div>' },
}))
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
  })
})
