/**
 * useStemPlayback.sync.test.ts
 *
 * Unit tests for the useStemPlayback composable, focusing on:
 * - Synchronicity guarantees (all stems start at the same offset)
 * - Crossfade behaviour
 * - Real-time gain updates during active playback
 * - setSources / dispose lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computed, ref } from 'vue'
import type { AudioStemName } from '@/stores/audio'

// ─── Web Audio mocks ──────────────────────────────────────────────────────────

const startOffsets: number[] = []

function buildMockCtx() {
  const gainNodes: {
    gain: {
      value: number
      setValueAtTime: ReturnType<typeof vi.fn>
      linearRampToValueAtTime: ReturnType<typeof vi.fn>
    }
    connect: ReturnType<typeof vi.fn>
  }[] = []

  function makeGainNode() {
    const node = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }
    gainNodes.push(node)
    return node
  }

  function makeSource() {
    return {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn((_when: number, offset: number) => {
        startOffsets.push(offset)
      }),
      stop: vi.fn(),
    }
  }

  const compressor = {
    threshold: { value: 0 },
    knee: { value: 0 },
    ratio: { value: 0 },
    attack: { value: 0 },
    release: { value: 0 },
    connect: vi.fn(),
  }

  const analyser = {
    fftSize: 2048,
    smoothingTimeConstant: 0,
    connect: vi.fn(),
    getFloatTimeDomainData: vi.fn((buffer: Float32Array) => {
      buffer.fill(0)
    }),
  }

  const ctx = {
    currentTime: 5,
    state: 'running' as AudioContextState,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    createGain: vi.fn(makeGainNode),
    createAnalyser: vi.fn(() => analyser),
    createDynamicsCompressor: vi.fn(() => compressor),
    createBufferSource: vi.fn(makeSource),
    decodeAudioData: vi.fn(() => Promise.resolve({ duration: 30 } as unknown as AudioBuffer)),
    _gainNodes: gainNodes,
    _analyser: analyser,
    _compressor: compressor,
  }

  return ctx
}

let mockCtx: ReturnType<typeof buildMockCtx>

vi.stubGlobal(
  'AudioContext',
  // Regular function (not arrow) so `new AudioContext()` works correctly.
  // When a constructor returns an explicit object, JS uses that object as the result.
  vi.fn(function MockAudioContext() {
    return mockCtx
  })
)

vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb: FrameRequestCallback) => {
    cb(performance.now())
    return 0
  })
)
vi.stubGlobal('cancelAnimationFrame', vi.fn())

// ─── Asset loader mocks ───────────────────────────────────────────────────────

export const fakeAudioPath = '/src/assets/private/audio/test/stem.mp3'
export const fakeAudioPath2 = '/src/assets/private/audio/test/stem2.mp3'
export const fakeAudioPathRace = '/src/assets/private/audio/test/race.mp3'
export const fakeAudioPathRace2 = '/src/assets/private/audio/test/race-2.mp3'
export const fakeAudioPathCacheA = '/src/assets/private/audio/test/cache-a.mp3'
export const fakeAudioPathCacheB = '/src/assets/private/audio/test/cache-b.mp3'

vi.mock('@/data/stems', async () => {
  const actual = await vi.importActual<typeof import('@/data/stems')>('@/data/stems')
  return {
    ...actual,
    stemAssetLoaders: {
      [fakeAudioPath]: vi.fn(() => Promise.resolve({ default: 'blob:fake-url' })),
      [fakeAudioPath2]: vi.fn(() => Promise.resolve({ default: 'blob:fake-url-2' })),
      [fakeAudioPathRace]: vi.fn(() => Promise.resolve({ default: 'blob:race-url' })),
      [fakeAudioPathRace2]: vi.fn(() => Promise.resolve({ default: 'blob:race-url-2' })),
      [fakeAudioPathCacheA]: vi.fn(() => Promise.resolve({ default: 'blob:cache-a-url' })),
      [fakeAudioPathCacheB]: vi.fn(() => Promise.resolve({ default: 'blob:cache-b-url' })),
    },
  }
})

vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
    })
  )
)

// ─── Helper ───────────────────────────────────────────────────────────────────

async function buildAndActivate(offsetSeconds = 5, paths = [fakeAudioPath]) {
  const { useStemPlayback } = await import('@/composables/useStemPlayback')
  const audioEl = ref<HTMLAudioElement | null>(null)
  const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
  const groupGains = computed<Record<string, number>>(() => ({}))
  const playback = useStemPlayback(audioEl, stemGains, groupGains)
  playback.setSources({ guitar: paths })
  await playback.activate(offsetSeconds)
  return { playback, audioEl }
}

async function flushAsyncTasks(times = 6) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve()
  }
}

type MockFetchResponse = {
  ok: boolean
  arrayBuffer: () => Promise<ArrayBuffer>
}

function requireFetchResolver(
  resolver: ((value: MockFetchResponse) => void) | null,
  label: string
): (value: MockFetchResponse) => void {
  if (!resolver) {
    throw new Error(`Expected ${label} fetch resolver to be registered`)
  }
  return resolver
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useStemPlayback', () => {
  beforeEach(() => {
    startOffsets.length = 0
    mockCtx = buildMockCtx()
    vi.clearAllMocks()
    // Re-assign fresh implementation after clearAllMocks (which resets spy implementations)
    const AudioContextSpy = globalThis.AudioContext as ReturnType<typeof vi.fn>
    AudioContextSpy.mockImplementation(function MockAudioContext() {
      return mockCtx
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
    })
    // Advance performance.now() by 1 second per call so _fadeMasterVolume's
    // rAF loop reaches t=1 on the first tick and does not recurse infinitely.
    let _perfNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (_perfNow += 1000))
    ;(globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>).mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(performance.now())
        return 0
      }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('all AudioBufferSourceNodes start at the same offset', async () => {
    await buildAndActivate(12.5, [fakeAudioPath, fakeAudioPath2])
    expect(startOffsets.length).toBeGreaterThanOrEqual(2)
    expect(startOffsets.every((o) => Math.abs(o - 12.5) < 0.01)).toBe(true)
  }, 15000)

  it('isActive becomes true after activate', async () => {
    const { playback } = await buildAndActivate()
    expect(playback.isActive.value).toBe(true)
    playback.dispose()
  })

  it('isActive is false after dispose', async () => {
    const { playback } = await buildAndActivate()
    playback.dispose()
    expect(playback.isActive.value).toBe(false)
  })

  it('does not activate when no sources are set', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({}))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    // intentionally do NOT call setSources
    await playback.activate(0)
    expect(playback.isActive.value).toBe(false)
  })

  it('setSources while active deactivates gracefully without throwing', async () => {
    const { playback } = await buildAndActivate()
    expect(() => playback.setSources({})).not.toThrow()
    expect(() => playback.dispose()).not.toThrow()
  })

  it('fades outputGain from 0 to 1 via linearRampToValueAtTime on activate', async () => {
    await buildAndActivate()
    const outputGain = mockCtx._gainNodes[0]
    expect(outputGain).toBeDefined()
    expect(outputGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))
  })

  it('fades master audio element volume toward 0 on activate', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const fakeEl = { volume: 1 } as HTMLAudioElement
    audioEl.value = fakeEl

    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath] })
    await playback.activate(0)

    expect(fakeEl.volume).toBeLessThan(1)
    playback.dispose()
  })

  it('deactivateWithOptions fades master volume to restoreToVolume, not always 1', async () => {
    // Regression: _fadeMasterVolume was hardcoded to fade TO 1 regardless of the
    // actual user volume level.  After the fix, the target is the supplied
    // restoreToVolume value so the crossfade lands at the correct volume.
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const fakeEl = { volume: 1 } as HTMLAudioElement
    audioEl.value = fakeEl

    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath] })
    await playback.activate(0)
    // After activate the master element was faded to 0.
    expect(fakeEl.volume).toBeLessThan(1)

    // Deactivate and request restoration to a specific volume (e.g. 0.6).
    await playback.deactivateWithOptions({ restoreMasterVolume: true, restoreToVolume: 0.6 })

    // The rAF fade (synchronous in tests) must have ended at the requested target.
    expect(fakeEl.volume).toBeCloseTo(0.6)
    playback.dispose()
  })

  it('updateStemGain sets the stem GainNode value', async () => {
    const { playback } = await buildAndActivate()
    // Graph order: outputGain(0), outputVolumeGain(1), preGain(2), stemGain(3)
    playback.updateStemGain('guitar', 0.4)
    const stemGainNode = mockCtx._gainNodes[3]
    expect(stemGainNode?.gain.value).toBeCloseTo(0.4)
    playback.dispose()
  })

  it('activate() bakes muted stemGain (0) into the GainNode without needing updateStemGain', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    // Guitar is muted at activation time — simulates restored persisted state
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 0 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath] })
    await playback.activate(0)

    // Graph order: outputGain(0), outputVolumeGain(1), preGain(2), stemGain(3)
    const stemGainNode = mockCtx._gainNodes[3]
    expect(stemGainNode?.gain.value).toBe(0)
    playback.dispose()
  })

  it('activate() bakes muted groupGain (0) into the item GainNode without needing updateGroupItemGain', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    // guitar-0 is muted at activation time — simulates restored persisted state
    const groupGains = computed<Record<string, number>>(() => ({ 'guitar-0': 0 }))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath] })
    await playback.activate(0)

    // Graph order: outputGain(0), outputVolumeGain(1), preGain(2), stemGain(3), itemGain[0](4)
    const itemGainNode = mockCtx._gainNodes[4]
    expect(itemGainNode?.gain.value).toBe(0)
    playback.dispose()
  })

  it('activate() applies independent gain per item when multiple group items exist', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    // Only guitar-0 is muted; guitar-1 is not
    const groupGains = computed<Record<string, number>>(() => ({ 'guitar-0': 0, 'guitar-1': 1 }))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath, fakeAudioPath2] })
    await playback.activate(0)

    // Graph order: outputGain(0), outputVolumeGain(1), preGain(2), stemGain(3), itemGain[0](4), itemGain[1](5)
    const itemGain0 = mockCtx._gainNodes[4]
    const itemGain1 = mockCtx._gainNodes[5]
    expect(itemGain0?.gain.value).toBe(0)
    expect(itemGain1?.gain.value).toBe(1)
    playback.dispose()
  })

  it('updateGroupItemGain sets the item GainNode value while active', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath, fakeAudioPath2] })
    await playback.activate(0)

    // Graph order: ..., stemGain(3), itemGain[0](4), itemGain[1](5)
    playback.updateGroupItemGain('guitar', 0, 0)
    expect(mockCtx._gainNodes[4]?.gain.value).toBe(0)

    playback.updateGroupItemGain('guitar', 1, 0.6)
    expect(mockCtx._gainNodes[5]?.gain.value).toBeCloseTo(0.6)
    playback.dispose()
  })

  it('starts muted group items lazily when they become audible after activation', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>({ currentTime: 9 } as HTMLAudioElement)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const currentGroupGains = ref<Record<string, number>>({ 'guitar-0': 1, 'guitar-1': 0 })
    const groupGains = computed<Record<string, number>>(() => currentGroupGains.value)
    const playback = useStemPlayback(audioEl, stemGains, groupGains)

    playback.setSources({ guitar: [fakeAudioPath, fakeAudioPath2] })
    await playback.activate(0)

    expect(startOffsets).toHaveLength(1)
    expect(startOffsets[0]).toBeCloseTo(9, 2)

    currentGroupGains.value = { 'guitar-0': 1, 'guitar-1': 1 }
    playback.updateGroupItemGain('guitar', 1, 1)

    await vi.waitFor(() => {
      expect(startOffsets).toHaveLength(2)
    })
    expect(startOffsets[1]).toBeCloseTo(9, 2)
    playback.dispose()
  })

  it('re-activating after deactivate re-reads current stemGains from ComputedRef', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    // Use a reactive ref so the computed is properly invalidated when the gain changes,
    // mirroring how production code uses a Pinia reactive store.
    const currentGuitarGain = ref(1)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({
      guitar: currentGuitarGain.value,
    }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)
    playback.setSources({ guitar: [fakeAudioPath] })

    // First activation: guitar = 1
    // Graph order on first activation: outputGain(0), outputVolumeGain(1), preGain(2), stemGain(3), itemGain[0](4)
    await playback.activate(0)
    expect(mockCtx._gainNodes[3]?.gain.value).toBe(1)
    await playback.deactivate()

    // Second activation: guitar = 0 (muted — simulates user muting before re-enabling)
    // activate() calls _disposeGraph() internally which clears old references, then buildGraph()
    // and loadAllStems() append new gain nodes to the same AudioContext.
    // Graph order on second activation: outputGain(5), outputVolumeGain(6), preGain(7), stemGain(8), itemGain[0](9)
    currentGuitarGain.value = 0
    await playback.activate(0)
    const gainNodesAfterReactivation = mockCtx._gainNodes
    // The second stemGain is the second-to-last node created (stem before its single item)
    const secondStemGain = gainNodesAfterReactivation[gainNodesAfterReactivation.length - 2]
    expect(secondStemGain?.gain.value).toBe(0)
    playback.dispose()
  })

  it('marks stems as prebuffered after first activate without explicit preload', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)

    playback.setSources({ guitar: [fakeAudioPath] })
    expect(playback.isStemsPrebuffered.value).toBe(false)

    await playback.activate(0)

    // Track-start in stems mode calls activate() directly; this must still mark
    // buffers as ready so toggling stems off/on on the same track is instant.
    expect(playback.isStemsPrebuffered.value).toBe(true)
    playback.dispose()
  })

  it('evicts decoded buffers for removed sources when switching tracks', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)

    playback.setSources({ guitar: [fakeAudioPathCacheA] })
    await playback.preloadStemsForCurrentSources()
    await vi.waitFor(() => {
      expect(playback.isStemsPrebuffered.value).toBe(true)
    })

    playback.setSources({ guitar: [fakeAudioPathCacheB] })
    await playback.preloadStemsForCurrentSources()
    await vi.waitFor(() => {
      expect(playback.isStemsPrebuffered.value).toBe(true)
    })

    playback.setSources({ guitar: [fakeAudioPathCacheA] })
    await playback.preloadStemsForCurrentSources()
    await vi.waitFor(() => {
      expect(playback.isStemsPrebuffered.value).toBe(true)
    })

    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(3)
    playback.dispose()
  })

  it('dispose does not throw even when called twice', async () => {
    const { playback } = await buildAndActivate()
    expect(() => {
      playback.dispose()
      playback.dispose()
    }).not.toThrow()
  })

  it('ignores stale prebuffer completion after sources change', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)

    let resolveRaceFetch: ((value: MockFetchResponse) => void) | null = null
    let resolveRaceFetch2: ((value: MockFetchResponse) => void) | null = null
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (input: RequestInfo | URL) => {
        if (String(input) === 'blob:race-url') {
          return new Promise((resolve) => {
            resolveRaceFetch = resolve as (value: MockFetchResponse) => void
          })
        }

        if (String(input) === 'blob:race-url-2') {
          return new Promise((resolve) => {
            resolveRaceFetch2 = resolve as (value: MockFetchResponse) => void
          })
        }

        return Promise.resolve({
          ok: true,
          arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
        })
      }
    )

    playback.setSources({ guitar: [fakeAudioPathRace] })
    const firstPreloadPromise = playback.preloadStemsForCurrentSources()
    playback.setSources({ guitar: [fakeAudioPathRace2] })
    const secondPreloadPromise = playback.preloadStemsForCurrentSources()

    expect(playback.isStemsPrebuffered.value).toBe(false)

    await vi.waitFor(() => {
      expect(resolveRaceFetch).not.toBeNull()
      expect(resolveRaceFetch2).not.toBeNull()
    })

    const firstRaceFetch = requireFetchResolver(resolveRaceFetch, 'first race')
    firstRaceFetch({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
    await firstPreloadPromise
    await flushAsyncTasks()

    expect(playback.isStemsPrebuffered.value).toBe(false)

    const secondRaceFetch = requireFetchResolver(resolveRaceFetch2, 'second race')
    secondRaceFetch({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
    await secondPreloadPromise

    await vi.waitFor(() => {
      expect(playback.isStemsPrebuffered.value).toBe(true)
    })
    playback.dispose()
  })

  it('does not throw when sources change while activate() is still loading stems', async () => {
    const { useStemPlayback } = await import('@/composables/useStemPlayback')
    const audioEl = ref<HTMLAudioElement | null>(null)
    const stemGains = computed<Partial<Record<AudioStemName, number>>>(() => ({ guitar: 1 }))
    const groupGains = computed<Record<string, number>>(() => ({}))
    const playback = useStemPlayback(audioEl, stemGains, groupGains)

    let resolveRaceFetch: ((value: MockFetchResponse) => void) | null = null
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (input: RequestInfo | URL) => {
        if (String(input) === 'blob:race-url') {
          return new Promise((resolve) => {
            resolveRaceFetch = resolve as (value: MockFetchResponse) => void
          })
        }

        return Promise.resolve({
          ok: true,
          arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
        })
      }
    )

    playback.setSources({ guitar: [fakeAudioPathRace] })
    const activatePromise = playback.activate(0)

    await vi.waitFor(() => {
      expect(resolveRaceFetch).not.toBeNull()
    })

    playback.setSources({})

    const delayedFetch = requireFetchResolver(resolveRaceFetch, 'delayed activate race')
    delayedFetch({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })

    await expect(activatePromise).resolves.toBeUndefined()
    expect(playback.isActive.value).toBe(false)
    playback.dispose()
  })
})
