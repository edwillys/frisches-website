import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioDebugHud from '../AudioDebugHud.vue'

function buildSnapshot() {
  return {
    trackId: 'tftc:02-tojd',
    loading: true,
    loadingReason: 'starting',
    currentTrackTransferBytes: 1_572_864,
    currentTrackTransferLabel: '1.50 MB',
    mobileTransferEstimates: [
      { label: 'Slow 3G (0.4 Mbps)', seconds: 31.5 },
      { label: '4G (9 Mbps)', seconds: 1.4 },
    ],
    connection: {
      effectiveType: '4g',
      downlinkMbps: 8.4,
      rttMs: 90,
      saveData: false,
    },
    masterResource: {
      transferBytes: 524_288,
      encodedBodyBytes: 500_000,
      decodedBodyBytes: 1_000_000,
      durationMs: 128,
      src: '/audio/master.mp3',
    },
    totalSessionTransferBytes: 2_097_152,
    stems: {
      active: true,
      prebuffered: false,
      currentTrackPaths: ['/a.mp3', '/b.mp3'],
      currentTrackTransferredBytes: 1_048_576,
      currentTrackDecodedBytes: 4_194_304,
      currentCompressedCacheBytes: 262_144,
      currentDecodedCacheBytes: 1_048_576,
      totalTransferredBytes: 1_048_576,
      totalDecodedBytes: 4_194_304,
      assets: [
        {
          assetPath: '/src/assets/private/audio/test/stem-a.mp3',
          transferredBytes: 524_288,
          decodedBytes: 2_097_152,
          fetchCount: 1,
        },
      ],
    },
  }
}

describe('AudioDebugHud', () => {
  it('renders transfer, loading, and mobile estimate details', () => {
    const wrapper = mount(AudioDebugHud, {
      props: {
        snapshot: buildSnapshot(),
      },
    })

    expect(wrapper.find('[data-testid="audio-debug-hud"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('tftc:02-tojd')
    expect(wrapper.text()).toContain('Loading (starting)')
    expect(wrapper.text()).toContain('1.50 MB')
    expect(wrapper.text()).toContain('2.00 MB')
    expect(wrapper.text()).toContain('Slow 3G (0.4 Mbps)')
    expect(wrapper.text()).toContain('stem-a.mp3')
  })

  it('collapses and expands the overlay body', async () => {
    const wrapper = mount(AudioDebugHud, {
      props: {
        snapshot: buildSnapshot(),
      },
    })

    expect(wrapper.find('[data-testid="audio-debug-hud-body"]').exists()).toBe(true)

    await wrapper.find('[data-testid="audio-debug-hud-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="audio-debug-hud-body"]').exists()).toBe(false)

    await wrapper.find('[data-testid="audio-debug-hud-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="audio-debug-hud-body"]').exists()).toBe(true)
  })
})
