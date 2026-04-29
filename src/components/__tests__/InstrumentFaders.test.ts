import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import InstrumentFaders from '../InstrumentFaders.vue'
import type { StemAvailability, StemGains } from '../InstrumentFaders.vue'

const defaultGains: StemGains = {
  drums: 1,
  guitar: 1,
  bass: 1,
  vocals: 1,
  flute: 1,
  brass: 1,
  percussion: 1,
  keyboard: 1,
}

const defaultAvailability: StemAvailability = {
  drums: true,
  guitar: true,
  bass: true,
  vocals: true,
  flute: true,
  brass: true,
  percussion: true,
  keyboard: true,
}

describe('InstrumentFaders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function enableEditing(wrapper: ReturnType<typeof mount>) {
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
  }

  function mountOpen(
    gains: StemGains = defaultGains,
    availability: StemAvailability = defaultAvailability
  ) {
    return mount(InstrumentFaders, {
      props: { modelValue: true, gains, availability },
    })
  }

  it('renders the faders toggle button', () => {
    const wrapper = mount(InstrumentFaders, {
      props: { modelValue: false, gains: defaultGains, availability: defaultAvailability },
    })
    expect(wrapper.find('[data-testid="mini-stems"]').exists()).toBe(true)
  })

  it('does not show the overlay when closed', () => {
    const wrapper = mount(InstrumentFaders, {
      props: { modelValue: false, gains: defaultGains, availability: defaultAvailability },
    })
    expect(wrapper.find('[data-testid="stems-overlay"]').exists()).toBe(false)
  })

  it('shows the overlay when open', () => {
    const wrapper = mountOpen()
    expect(wrapper.find('[data-testid="stems-overlay"]').exists()).toBe(true)
  })

  it('renders all 8 stems when open', () => {
    const wrapper = mountOpen()
    const stemKeys = [
      'drums',
      'guitar',
      'bass',
      'vocals',
      'flute',
      'brass',
      'percussion',
      'keyboard',
    ]
    for (const key of stemKeys) {
      expect(wrapper.find(`[data-testid="stem-${key}"]`).exists()).toBe(true)
    }
  })

  it('renders all added stems including keyboard', () => {
    const wrapper = mountOpen()
    expect(wrapper.find('[data-testid="stem-flute"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-brass"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-percussion"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-keyboard"]').exists()).toBe(true)
  })

  it('adds data-tooltip with instrument name on each icon button', () => {
    const wrapper = mountOpen()
    const tooltips = [
      'Drums',
      'Guitar',
      'Bass',
      'Vocals',
      'Flute',
      'Brass',
      'Percussion',
      'Keyboard',
    ]
    for (const name of tooltips) {
      const btn = wrapper.find(`[data-tooltip="${name}"]`)
      expect(btn.exists()).toBe(true)
    }
  })

  it('emits update:modelValue on toggle button click', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: { modelValue: false, gains: defaultGains, availability: defaultAvailability },
    })
    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('emits setGain with 0 when muting an active stem', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-drums-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')).toBeTruthy()
    expect(wrapper.emitted('setGain')?.[0]).toEqual(['drums', 0])
  })

  it('emits setGain restoring last gain when unmuting a muted stem', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: { ...defaultGains, drums: 0 },
        availability: defaultAvailability,
      },
    })
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-drums-mute"]').trigger('click')
    const events = wrapper.emitted('setGain')
    expect(events).toBeTruthy()
    const [stem, value] = events![0] as [string, number]
    expect(stem).toBe('drums')
    expect(value).toBeGreaterThan(0)
  })

  it('emits setGain on slider input', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    const slider = wrapper.find('[data-testid="stem-guitar"] input[type="range"]')
    await slider.setValue('0.5')
    const events = wrapper.emitted('setGain')
    expect(events).toBeTruthy()
    expect(events?.[0]?.[0]).toBe('guitar')
    expect(Number(events?.[0]?.[1])).toBeCloseTo(0.5)
  })

  it('emits setGain for new stem flute on mute toggle', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-flute-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')?.[0]).toEqual(['flute', 0])
  })

  it('emits setGain for new stem brass on mute toggle', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-brass-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')?.[0]).toEqual(['brass', 0])
  })

  it('emits setGain for new stem percussion on mute toggle', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-percussion-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')?.[0]).toEqual(['percussion', 0])
  })

  it('emits setGain for keyboard on mute toggle', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-keyboard-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')?.[0]).toEqual(['keyboard', 0])
  })

  it('closes the overlay when close button is clicked', async () => {
    const wrapper = mountOpen()
    await wrapper.find('[data-testid="stems-close"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('does not emit setGain when fader editing is disabled', async () => {
    const wrapper = mountOpen()
    await wrapper.find('[data-testid="stem-drums-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')).toBeUndefined()
  })

  it('keeps unavailable stems disabled even when editing is enabled', async () => {
    const wrapper = mountOpen(defaultGains, { ...defaultAvailability, flute: false })
    await enableEditing(wrapper)

    const muteButton = wrapper.find('[data-testid="stem-flute-mute"]')
    const slider = wrapper.find('[data-testid="stem-flute"] input[type="range"]')

    expect(muteButton.attributes('disabled')).toBeDefined()
    expect(slider.attributes('disabled')).toBeDefined()
  })

  it('adds the unavailable suffix to the tooltip when a stem is not available', () => {
    const wrapper = mountOpen(defaultGains, { ...defaultAvailability, percussion: false })
    const button = wrapper.find('[data-testid="stem-percussion-mute"]')

    expect(button.attributes('data-tooltip')).toBe('Percussion (not available)')
  })
})
