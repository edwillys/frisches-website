import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import InstrumentFaders from '../InstrumentFaders.vue'
import type { StemAvailability, StemGains } from '../InstrumentFaders.vue'
import type { StemGroupItem } from '@/data/stems'

const defaultGains: StemGains = {
  drums: 1,
  guitar: 1,
  bass: 1,
  vocals: 1,
  flute: 1,
  brass: 1,
  percussion: 1,
  keyboard: 1,
  strings: 1,
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
  strings: true,
}

describe('InstrumentFaders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  async function enableEditing(wrapper: ReturnType<typeof mount>) {
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await wrapper.setProps({ stemsRequested: true, stemsEnabled: true })
    await nextTick()
  }

  function dispatchDetailedClick(button: ReturnType<typeof mount>['element'], detail: number) {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
  }

  function mountOpen(
    gains: StemGains = defaultGains,
    availability: StemAvailability = defaultAvailability
  ) {
    return mount(InstrumentFaders, {
      props: { modelValue: true, gains, availability, stemsModeAvailable: true },
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

  it('renders all 9 stems when open', () => {
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
      'strings',
    ]
    for (const key of stemKeys) {
      expect(wrapper.find(`[data-testid="stem-${key}"]`).exists()).toBe(true)
    }
  })

  it('renders all added stems including keyboard and strings', () => {
    const wrapper = mountOpen()
    expect(wrapper.find('[data-testid="stem-flute"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-brass"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-percussion"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-keyboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-strings"]').exists()).toBe(true)
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
      'Strings',
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
        stemsModeAvailable: true,
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

  it('emits setGain for new stem strings on mute toggle', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-strings-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')?.[0]).toEqual(['strings', 0])
  })

  it('double clicking a stem icon emits a global stem solo state', async () => {
    vi.useFakeTimers()
    const wrapper = mountOpen()
    await enableEditing(wrapper)

    const button = wrapper.find('[data-testid="stem-drums-mute"]')
    dispatchDetailedClick(button.element, 1)
    dispatchDetailedClick(button.element, 2)
    await nextTick()

    expect(wrapper.emitted('setSoloState')?.[0]).toEqual([
      {
        targets: [{ scope: 'global-stem', stem: 'drums', index: null }],
      },
    ])
    expect(wrapper.emitted('setGain')).toBeUndefined()
  })

  it('soloing a muted stem keeps gains untouched and emits solo state', async () => {
    vi.useFakeTimers()
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: { ...defaultGains, drums: 0 },
        availability: defaultAvailability,
        stemsModeAvailable: true,
      },
    })
    await enableEditing(wrapper)

    const button = wrapper.find('[data-testid="stem-drums-mute"]')
    dispatchDetailedClick(button.element, 1)
    dispatchDetailedClick(button.element, 2)
    await nextTick()

    expect(wrapper.emitted('setSoloState')?.[0]).toEqual([
      {
        targets: [{ scope: 'global-stem', stem: 'drums', index: null }],
      },
    ])
    expect(wrapper.emitted('setGain')).toBeUndefined()
  })

  it('renders mute badges for muted stem and muted group items', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: { ...defaultGains, drums: 0 },
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: { 'guitar-0': 0 },
      },
    })

    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')

    expect(wrapper.find('[data-testid="stem-drums-mute"] .stem__mute-badge').text()).toBe('M')
    expect(wrapper.find('[data-testid="stem-guitar-item-0-mute"] .stem__mute-badge').text()).toBe(
      'M'
    )
  })

  it('disable toggle is inactive when stemsModeAvailable is false', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: false,
      },
    })
    const toggle = wrapper.find('[data-testid="stems-enable-toggle"]')
    expect(toggle.attributes('disabled')).toBeDefined()
  })

  it('emits enableStems when toggle is clicked while stems are available', async () => {
    const wrapper = mountOpen()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    expect(wrapper.emitted('enableStems')).toBeTruthy()
  })

  it('shows the middle loading state while stems are still activating', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        stemsRequested: false,
        stemsEnabled: false,
        isStemsLoading: false,
      },
    })

    const toggle = wrapper.find('[data-testid="stems-enable-toggle"]')
    expect(toggle.classes()).not.toContain('is-enabled')
    expect(toggle.classes()).not.toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(false)

    await toggle.trigger('click')
    expect(wrapper.emitted('enableStems')).toBeTruthy()

    await wrapper.setProps({ stemsRequested: true, isStemsLoading: true })
    await nextTick()

    expect(wrapper.find('[data-testid="mini-stems"]').classes()).toContain('is-active')
    expect(toggle.classes()).not.toContain('is-enabled')
    expect(toggle.classes()).toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(true)

    await wrapper.setProps({ isStemsLoading: false, stemsRequested: true, stemsEnabled: true })
    await nextTick()

    expect(toggle.classes()).toContain('is-enabled')
    expect(toggle.classes()).not.toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(false)
  })

  it('returns the switch to OFF immediately when loading is cancelled from the middle state', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        stemsRequested: true,
        stemsEnabled: false,
        isStemsLoading: true,
      },
    })

    const toggle = wrapper.find('[data-testid="stems-enable-toggle"]')
    expect(toggle.classes()).toContain('is-loading')
    expect(toggle.classes()).not.toContain('is-enabled')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(true)

    await toggle.trigger('click')
    expect(wrapper.emitted('disableStems')).toBeTruthy()

    await wrapper.setProps({ stemsRequested: false, stemsEnabled: false, isStemsLoading: true })
    await nextTick()

    expect(wrapper.find('[data-testid="mini-stems"]').classes()).not.toContain('is-active')
    expect(toggle.classes()).not.toContain('is-enabled')
    expect(toggle.classes()).not.toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(true)
  })

  it('re-enters the middle state when turning stems back on while loading still continues', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        stemsRequested: false,
        stemsEnabled: false,
        isStemsLoading: true,
      },
    })

    const toggle = wrapper.find('[data-testid="stems-enable-toggle"]')
    expect(toggle.classes()).not.toContain('is-enabled')
    expect(toggle.classes()).not.toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(true)

    await toggle.trigger('click')

    expect(wrapper.emitted('enableStems')).toBeTruthy()
    expect(wrapper.emitted('disableStems')).toBeFalsy()

    await wrapper.setProps({ stemsRequested: true, stemsEnabled: false, isStemsLoading: true })
    await nextTick()

    expect(toggle.classes()).not.toContain('is-enabled')
    expect(toggle.classes()).toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(true)
  })

  it('goes straight to ON when turning stems back on after loading has already finished', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        stemsRequested: false,
        stemsEnabled: false,
        isStemsLoading: false,
      },
    })

    const toggle = wrapper.find('[data-testid="stems-enable-toggle"]')
    expect(toggle.classes()).not.toContain('is-enabled')
    expect(toggle.classes()).not.toContain('is-loading')

    await toggle.trigger('click')

    expect(wrapper.emitted('enableStems')).toBeTruthy()

    await wrapper.setProps({ stemsRequested: true, stemsEnabled: true, isStemsLoading: false })
    await nextTick()

    expect(toggle.classes()).toContain('is-enabled')
    expect(toggle.classes()).not.toContain('is-loading')
    expect(wrapper.find('.stems__activation-spinner').exists()).toBe(false)
  })

  it('emits disableStems when toggling off', async () => {
    const wrapper = mountOpen()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click') // enable
    await wrapper.setProps({ stemsRequested: true, stemsEnabled: true })
    await nextTick()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click') // disable
    const events = wrapper.emitted('disableStems')
    expect(events).toBeTruthy()
  })

  it('emits resetGains when reset button is clicked', async () => {
    const wrapper = mountOpen()
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stems-reset"]').trigger('click')
    expect(wrapper.emitted('resetGains')).toBeTruthy()
  })

  it('shows expand toggle for stems with group items', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
      { label: 'Guitar Maton', role: 'base', type: 'acoustic', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })
    expect(wrapper.find('[data-testid="stem-guitar-expand"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-drums-expand"]').exists()).toBe(false)
  })

  it('expands group items when expand button is clicked', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })
    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
    expect(wrapper.find('[data-testid="stem-guitar-item-0"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-guitar-label-0"]').text()).toBe('1')
    expect(wrapper.find('[data-testid="stem-guitar-expand"]').attributes('data-tooltip')).toBe(
      'Close stem group'
    )
  })

  it('uses the generic closed stem-group tooltip before opening', () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })

    expect(wrapper.find('[data-testid="stem-guitar-expand"]').attributes('data-tooltip')).toBe(
      'Open stem group'
    )
  })

  it('does not render drawer label items while a group is closed', () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
      {
        label: 'Guitar Solo',
        shortLabel: 'SOLO',
        role: 'solo',
        type: 'electric',
        isAvailable: true,
      },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })
    expect(wrapper.find('.stem-group__drawer').classes()).not.toContain('is-open')
  })

  it('renders metadata short labels once in the open group footer', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
      { label: 'Guitar MM', shortLabel: '2', role: 'base', type: 'electric', isAvailable: true },
      {
        label: 'Guitar Solo',
        shortLabel: 'SOLO',
        role: 'solo',
        type: 'electric',
        isAvailable: true,
      },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })

    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')

    expect(wrapper.find('[data-testid="stem-guitar-labels"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-guitar-label-2"]').text()).toBe('SOLO')
    expect(wrapper.findAll('.stem-group__item-label')).toHaveLength(3)
    expect(wrapper.text().match(/SOLO/g)).toHaveLength(1)
  })

  it('hides unavailable stems when some stems are present', () => {
    const wrapper = mountOpen(defaultGains, { ...defaultAvailability, flute: false, brass: false })

    expect(wrapper.find('[data-testid="stem-drums"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stem-flute"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="stem-brass"]').exists()).toBe(false)
  })

  it('keeps placeholder stems when no stems are present', () => {
    const noneAvailable: StemAvailability = {
      drums: false,
      guitar: false,
      bass: false,
      vocals: false,
      flute: false,
      brass: false,
      percussion: false,
      keyboard: false,
      strings: false,
    }

    const wrapper = mountOpen(defaultGains, noneAvailable)

    expect(wrapper.findAll('.stem-group')).toHaveLength(9)
    expect(wrapper.find('[data-testid="stem-drums-mute"]').attributes('disabled')).toBeDefined()
  })

  it('disables reset while stem editing is off', () => {
    const wrapper = mountOpen()
    const resetButton = wrapper.find('[data-testid="stems-reset"]')

    expect(resetButton.attributes('aria-disabled')).toBe('true')
  })

  it('emits setGroupGain when a group item slider changes', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })
    // open group
    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
    // enable editing
    await enableEditing(wrapper)
    // move child slider
    const slider = wrapper.find('[data-testid="stem-guitar-item-0"] input[type="range"]')
    await slider.setValue('0.6')
    const events = wrapper.emitted('setGroupGain')
    expect(events).toBeTruthy()
    expect(events?.[0]?.[0]).toBe('guitar')
    expect(events?.[0]?.[1]).toBe(0)
    expect(Number(events?.[0]?.[2])).toBeCloseTo(0.6)
  })

  it('opens a group-item context menu with mute, solo, and solo-in-group actions', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
      { label: 'Guitar MM', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      attachTo: document.body,
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: {},
      },
    })
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')

    await wrapper
      .find('[data-testid="stem-guitar-item-0-mute"]')
      .trigger('contextmenu', { clientX: 120, clientY: 140 })

    expect(document.body.querySelector('[data-testid="stems-context-menu"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="stems-context-action-mute"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="stems-context-action-solo"]')).not.toBeNull()
    expect(
      document.body.querySelector('[data-testid="stems-context-action-solo-in-group"]')
    ).not.toBeNull()
  })

  it('shows only unsolo when a group item is globally soloed even if it also has local group solo', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
      { label: 'Guitar MM', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      attachTo: document.body,
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: { 'guitar-0': 1, 'guitar-1': 1 },
        soloState: {
          targets: [
            { scope: 'global-item', stem: 'guitar', index: 0 },
            { scope: 'group-item', stem: 'guitar', index: 0 },
          ],
        },
      },
    })
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
    await wrapper
      .find('[data-testid="stem-guitar-item-0-mute"]')
      .trigger('contextmenu', { clientX: 120, clientY: 140 })

    expect(
      document.body.querySelector('[data-testid="stems-context-action-solo"]')?.textContent?.trim()
    ).toBe('Unsolo')
    expect(
      document.body.querySelector('[data-testid="stems-context-action-solo-in-group"]')
    ).toBeNull()
  })

  it('omits solo-in-group when a group item is already globally soloed', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
      { label: 'Guitar MM', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      attachTo: document.body,
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: { 'guitar-0': 1, 'guitar-1': 1 },
        soloState: {
          targets: [{ scope: 'global-item', stem: 'guitar', index: 0 }],
        },
      },
    })
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
    await wrapper
      .find('[data-testid="stem-guitar-item-0-mute"]')
      .trigger('contextmenu', { clientX: 120, clientY: 140 })

    expect(
      document.body.querySelector('[data-testid="stems-context-action-solo"]')?.textContent?.trim()
    ).toBe('Unsolo')
    expect(
      document.body.querySelector('[data-testid="stems-context-action-solo-in-group"]')
    ).toBeNull()
  })

  it('solo-in-group emits local group solo state without muting siblings through gains', async () => {
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
      { label: 'Guitar MM', role: 'base', type: 'electric', isAvailable: true },
    ]
    const wrapper = mount(InstrumentFaders, {
      attachTo: document.body,
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        groupItems: { guitar: guitarItems },
        groupGains: { 'guitar-0': 1, 'guitar-1': 1 },
      },
    })
    await enableEditing(wrapper)
    await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')

    await wrapper
      .find('[data-testid="stem-guitar-item-0-mute"]')
      .trigger('contextmenu', { clientX: 120, clientY: 140 })
    ;(
      document.body.querySelector(
        '[data-testid="stems-context-action-solo-in-group"]'
      ) as HTMLButtonElement
    ).click()
    await nextTick()

    expect(wrapper.emitted('setSoloState')?.[0]).toEqual([
      {
        targets: [{ scope: 'group-item', stem: 'guitar', index: 0 }],
      },
    ])
    expect(wrapper.emitted('setGroupGain')).toBeUndefined()
    expect(wrapper.emitted('setGain')).toBeUndefined()
  })

  it('closes the overlay when close button is clicked', async () => {
    const wrapper = mountOpen()
    await wrapper.find('[data-testid="stems-close"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('clears all solos from the momentary !S button without latching', async () => {
    const wrapper = mount(InstrumentFaders, {
      props: {
        modelValue: true,
        gains: defaultGains,
        availability: defaultAvailability,
        stemsModeAvailable: true,
        soloState: {
          targets: [{ scope: 'global-stem', stem: 'drums', index: null }],
        },
      },
    })
    await enableEditing(wrapper)

    const clearButton = wrapper.find('[data-testid="stems-solo-all"]')
    expect(clearButton.text()).toBe('!S')
    expect(clearButton.classes()).not.toContain('is-active')

    await clearButton.trigger('click')

    expect(wrapper.emitted('setSoloState')?.[0]).toEqual([null])
  })

  it('single touch tap still mutes after the delayed action resolves', async () => {
    vi.useFakeTimers()
    const wrapper = mountOpen()
    await enableEditing(wrapper)

    const button = wrapper.find('[data-testid="stem-drums-mute"]')
    await button.trigger('pointerup', { pointerType: 'touch' })
    dispatchDetailedClick(button.element, 1)
    vi.advanceTimersByTime(221)
    await nextTick()

    expect(wrapper.emitted('setGain')?.[0]).toEqual(['drums', 0])
    expect(wrapper.emitted('setSoloState')).toBeUndefined()
  })

  it('double touch tap emits solo without firing the mute action', async () => {
    vi.useFakeTimers()
    const wrapper = mountOpen()
    await enableEditing(wrapper)

    const button = wrapper.find('[data-testid="stem-drums-mute"]')
    await button.trigger('pointerup', { pointerType: 'touch' })
    dispatchDetailedClick(button.element, 1)
    await button.trigger('pointerup', { pointerType: 'touch' })
    dispatchDetailedClick(button.element, 1)
    await nextTick()

    expect(wrapper.emitted('setSoloState')?.[0]).toEqual([
      {
        targets: [{ scope: 'global-stem', stem: 'drums', index: null }],
      },
    ])
    expect(wrapper.emitted('setGain')).toBeUndefined()
  })

  it('does not emit setGain when fader editing is disabled', async () => {
    const wrapper = mountOpen()
    await wrapper.find('[data-testid="stem-drums-mute"]').trigger('click')
    expect(wrapper.emitted('setGain')).toBeUndefined()
  })

  it('keeps unavailable stems disabled even when editing is enabled', async () => {
    const wrapper = mountOpen(defaultGains, { ...defaultAvailability, flute: false })
    await enableEditing(wrapper)

    expect(wrapper.find('[data-testid="stem-flute"]').exists()).toBe(false)
  })

  it('adds the unavailable suffix to placeholder tooltips when no stems are available', () => {
    const wrapper = mountOpen(defaultGains, {
      drums: false,
      guitar: false,
      bass: false,
      vocals: false,
      flute: false,
      brass: false,
      percussion: false,
      keyboard: false,
      strings: false,
    })
    const button = wrapper.find('[data-testid="stem-percussion-mute"]')

    expect(button.attributes('data-tooltip')).toBe('Percussion (not available)')
  })

  describe('lastNonZero memory initialisation from persisted props', () => {
    it('unmuting a stem restores to the non-zero value from props on mount (not hard-coded 1)', async () => {
      // Simulate restore after page refresh: guitar was 0.65 in the store
      const wrapper = mount(InstrumentFaders, {
        props: {
          modelValue: true,
          gains: { ...defaultGains, guitar: 0.65 },
          availability: defaultAvailability,
          stemsModeAvailable: true,
        },
      })

      await enableEditing(wrapper)

      // Mute the guitar (emits setGain('guitar', 0))
      await wrapper.find('[data-testid="stem-guitar-mute"]').trigger('click')
      expect(Number(wrapper.emitted('setGain')?.at(-1)?.[1])).toBe(0)

      // Simulate the parent updating the prop (as GlobalAudioPlayer would after setStemGain)
      await wrapper.setProps({ gains: { ...defaultGains, guitar: 0 } })

      // Unmute → should restore to 0.65, NOT to 1
      await wrapper.find('[data-testid="stem-guitar-mute"]').trigger('click')
      expect(Number(wrapper.emitted('setGain')?.at(-1)?.[1])).toBeCloseTo(0.65)
    })

    it('unmuting a group item restores to the non-zero value from groupGains on mount', async () => {
      const guitarItems: StemGroupItem[] = [
        { label: 'Guitar PRS', role: 'base', type: 'electric', isAvailable: true },
      ]
      // Simulate restore: guitar-0 was 0.4 in the store
      const wrapper = mount(InstrumentFaders, {
        props: {
          modelValue: true,
          gains: defaultGains,
          availability: defaultAvailability,
          stemsModeAvailable: true,
          groupItems: { guitar: guitarItems },
          groupGains: { 'guitar-0': 0.4 },
        },
      })

      await enableEditing(wrapper)
      await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')

      const groupMuteBtn = wrapper.find('[data-testid="stem-guitar-item-0-mute"]')

      // Mute the group item (emits setGroupGain('guitar', 0, 0))
      await groupMuteBtn.trigger('click')
      expect(Number(wrapper.emitted('setGroupGain')?.at(-1)?.[2])).toBe(0)

      // Simulate the parent updating the groupGains prop
      await wrapper.setProps({ groupGains: { 'guitar-0': 0 } })

      // Unmute → should restore to 0.4, NOT to 1
      await groupMuteBtn.trigger('click')
      expect(Number(wrapper.emitted('setGroupGain')?.at(-1)?.[2])).toBeCloseTo(0.4)
    })

    it('unmuting a muted stem (gain=0 on mount) falls back to 1 when no prior non-zero is known', async () => {
      // Simulate restore after page refresh: guitar was already muted at 0
      const wrapper = mount(InstrumentFaders, {
        props: {
          modelValue: true,
          gains: { ...defaultGains, guitar: 0 },
          availability: defaultAvailability,
          stemsModeAvailable: true,
        },
      })

      await enableEditing(wrapper)

      // Guitar is already muted — clicking mute icon should unmute to default 1
      await wrapper.find('[data-testid="stem-guitar-mute"]').trigger('click')
      expect(Number(wrapper.emitted('setGain')?.at(-1)?.[1])).toBe(1)
    })
  })

  describe('Group handle drag interactions', () => {
    // 1 guitar item → maxWidth = 38 (item) + 0 (gaps) + 2 (padding) = 40px
    const guitarItems: StemGroupItem[] = [
      { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
    ]

    function rect(left: number, width = 100): DOMRect {
      return {
        right: left + width,
        left,
        top: 0,
        bottom: 100,
        width,
        height: 100,
        x: left,
        y: 0,
        toJSON() {
          return this
        },
      } as DOMRect
    }

    function mountWithGroup() {
      return mount(InstrumentFaders, {
        props: {
          modelValue: true,
          gains: defaultGains,
          availability: defaultAvailability,
          stemsModeAvailable: true,
          groupItems: { guitar: guitarItems },
          groupGains: {},
        },
      })
    }

    // PointerEvent constructor correctly sets clientX (unlike trigger() which
    // tries to assign to the read-only getter on MouseEvent).
    async function ptr(target: EventTarget, type: string, init: PointerEventInit = {}) {
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }))
      await nextTick()
    }

    function drawerWidth(wrapper: ReturnType<typeof mount>) {
      const mainEl = wrapper.find('[data-testid="stem-guitar"] .stem-group__main')
        .element as HTMLElement
      return mainEl.style.getPropertyValue('--drawer-width')
    }

    beforeEach(() => {
      // JSDOM does not implement setPointerCapture; define it so the component doesn't throw.
      if (!('setPointerCapture' in Element.prototype)) {
        Object.defineProperty(Element.prototype, 'setPointerCapture', {
          value: () => {},
          configurable: true,
          writable: true,
        })
      }
      vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {})
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element
      ) {
        const element = this as Element
        const mainEl = element.closest('.stem-group__main') as HTMLElement | null
        const drawerWidthPx = Number.parseFloat(
          mainEl?.style.getPropertyValue('--drawer-width') || '0'
        )

        if (element.classList.contains('stem-group__handle')) {
          const centerX = 200 + drawerWidthPx / 2
          return rect(centerX - 2.5, 5)
        }

        if (element.classList.contains('stem-group__anchor')) {
          const right = 197.5 - drawerWidthPx / 2
          return rect(right - 38, 38)
        }

        if (element.classList.contains('stem-group__shell')) {
          return rect(100, 100 + drawerWidthPx)
        }

        return rect(100, 100)
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
      document.body.style.cursor = ''
    })

    it('collapses an open group on second handle click', async () => {
      const wrapper = mountWithGroup()
      const handle = wrapper.find('[data-testid="stem-guitar-expand"]')
      await handle.trigger('click') // open
      await handle.trigger('click') // close
      expect(wrapper.find('.stem-group__drawer').classes()).not.toContain('is-open')
    })

    it('sets grabbing cursor on body and handle element on pointerdown', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      expect(document.body.style.cursor).toBe('grabbing')
      expect((handleEl as HTMLElement).style.cursor).toBe('grabbing')
    })

    it('clears grabbing cursor from body and handle on pointerup', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(document.body.style.cursor).toBe('')
      expect((handleEl as HTMLElement).style.cursor).toBe('')
    })

    it('clears body cursor on unmount while a drag is active', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      expect(document.body.style.cursor).toBe('grabbing')
      wrapper.unmount()
      expect(document.body.style.cursor).toBe('')
    })

    it('applies transition:none on the drawer while dragging', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      const drawer = wrapper.find('.stem-group__drawer')
      expect((drawer.element as HTMLElement).style.transition).toBe('none')
    })

    it('restores drawer transition after drag ends', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(
        (wrapper.find('.stem-group__drawer').element as HTMLElement).style.transition
      ).not.toBe('none')
    })

    it('does not open the drawer when drag delta is below the threshold (6px)', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      // startClientX = 200; move only 3px which is below the 6px threshold
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 203, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(wrapper.find('.stem-group__drawer').classes()).not.toContain('is-open')
    })

    it('snaps the group open when drag reaches > 50% of max width', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      // zero-width handle center = 200, so 230 maps to width 60, clamped to max 40 → open
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 230, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
    })

    it('snaps the group closed when drag is below 50% of max width', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      // zero-width handle center = 200, so 209 maps to width 18 < 20 threshold for snap-open
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 209, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(wrapper.find('.stem-group__drawer').classes()).not.toContain('is-open')
    })

    it('clamps drawer width to 0 when cursor drags left of shell origin', async () => {
      // Open the group first, then drag handle left of shell origin (negative rawWidth → clamped 0)
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click') // open
      await ptr(handleEl, 'pointerdown', { clientX: 220, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 150, pointerId: 1 }) // negative width → clamped 0
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(wrapper.find('.stem-group__drawer').classes()).not.toContain('is-open')
    })

    it('clamps drawer width to maxWidth when cursor drags far right', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      // clientX = 400 maps to width 400, clamped to maxWidth (40) → snaps open
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 400, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
    })

    it('suppresses the click handler after a completed drag', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      // Drag to snap group open
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 230, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
      // Subsequent click must be suppressed (not toggle group back closed)
      await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
    })

    it('does not suppress click when no drag threshold was crossed', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element
      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointerup', { pointerId: 1 })
      await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
    })

    it('shrinks progressively while dragging an open drawer closed', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element

      await wrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
      expect(drawerWidth(wrapper)).toBe('40px')

      await ptr(handleEl, 'pointerdown', { clientX: 220, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 214, pointerId: 1 })

      expect(drawerWidth(wrapper)).toBe('28px')
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
    })

    it('grows proportionally while dragging open within the available range', async () => {
      const wrapper = mountWithGroup()
      const handleEl = wrapper.find('[data-testid="stem-guitar-expand"]').element

      await ptr(handleEl, 'pointerdown', { clientX: 200, pointerId: 1 })
      await ptr(window, 'pointermove', { clientX: 214, pointerId: 1 })

      expect(drawerWidth(wrapper)).toBe('28px')
      expect(wrapper.find('.stem-group__drawer').classes()).toContain('is-open')
    })
  })
})
