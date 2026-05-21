import { test, expect, type Locator, type Page } from '@playwright/test'
import { clickAndWaitForAnimations, waitForAnimations } from './helpers.js'

type PlaybackSnapshot = {
  audioPaused: boolean | null
  audioCurrentTime: number | null
  audioVolume: number | null
  storeCurrentTime: number
  storeIsPlaying: boolean
  hasUserStartedPlayback: boolean
}

type StemName = 'drums' | 'guitar' | 'bass' | 'vocals' | 'percussion' | 'strings'

type OutputLevelStats = {
  maxCombinedLevel: number
  maxMasterLevel: number
  maxStemLevel: number
  stemsActive: boolean
}

type WaveformSnapshot = {
  master: number[]
  stem: number[]
}

type WaveformChunk = {
  samples: number[]
  storeTime: number
  sampleRate: number
}

type PairedWaveformChunk = {
  master: number[]
  stem: number[]
}

const allTojdStemFaders: StemName[] = ['drums', 'guitar', 'bass', 'vocals', 'percussion', 'strings']
const coreAudibleStems: Array<Extract<StemName, 'vocals' | 'bass' | 'guitar' | 'drums'>> = [
  'vocals',
  'bass',
  'guitar',
  'drums',
]

async function ensureStemMixEditingEnabled(page: Page): Promise<void> {
  const toggle = page.locator('[data-testid="stems-enable-toggle"]')
  await toggle.waitFor({ state: 'visible', timeout: 15000 })

  if ((await toggle.getAttribute('aria-pressed')) !== 'true') {
    await toggle.click()
  }

  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

async function waitForStemsActive(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="global-audio-player"]')).toHaveAttribute(
    'data-stems-active',
    'true',
    { timeout: 15000 }
  )
  await page.waitForFunction(
    () => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return Boolean(audio && audio.volume <= 0.05)
    },
    null,
    { timeout: 5000, polling: 100 }
  )
}

async function waitForStemsPrebuffered(page: Page, timeout = 20000): Promise<void> {
  await expect(page.locator('[data-testid="global-audio-player"]')).toHaveAttribute(
    'data-stems-prebuffered',
    'true',
    { timeout }
  )
}

async function seekToKnownHotspot(page: Page, seconds = 32): Promise<void> {
  await page.evaluate(async (targetSeconds: number) => {
    const { useAudioStore } = await import('/src/stores/audio.ts')
    useAudioStore().seek(targetSeconds)
  }, seconds)

  await page.waitForFunction(
    (targetSeconds: number) => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return Boolean(audio && !audio.seeking && Math.abs(audio.currentTime - targetSeconds) < 0.4)
    },
    seconds,
    { timeout: 10000, polling: 100 }
  )
}

async function setStemSlider(page: Page, stem: StemName, value: number): Promise<void> {
  const slider = page.locator(`[data-testid="stem-${stem}"] input[type="range"]`).first()
  await slider.waitFor({ state: 'attached', timeout: 10000 })
  await slider.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement
    input.value = String(nextValue)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

async function toggleStemMute(page: Page, stem: StemName): Promise<void> {
  const button = page.locator(`[data-testid="stem-${stem}-mute"]`)
  await button.waitFor({ state: 'attached', timeout: 10000 })

  try {
    await button.click({ timeout: 5000 })
  } catch {
    await button.evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })
  }
}

async function sampleOutputLevels(
  page: Page,
  durationMs = 1200,
  sampleEveryMs = 100
): Promise<OutputLevelStats> {
  return page.evaluate(
    async ({ probeDurationMs, probeSampleEveryMs }) => {
      const probe = (
        window as Window & {
          __FRISCHES_E2E_AUDIO__?: {
            readState: () => {
              masterLevel: number
              stemLevel: number
              combinedLevel: number
              stemsActive: boolean
            }
          }
        }
      ).__FRISCHES_E2E_AUDIO__

      if (!probe) {
        throw new Error('Missing __FRISCHES_E2E_AUDIO__ output probe')
      }

      let maxCombinedLevel = 0
      let maxMasterLevel = 0
      let maxStemLevel = 0
      let stemsActive = false

      const startedAt = performance.now()
      while (performance.now() - startedAt < probeDurationMs) {
        const state = probe.readState()
        maxCombinedLevel = Math.max(maxCombinedLevel, state.combinedLevel)
        maxMasterLevel = Math.max(maxMasterLevel, state.masterLevel)
        maxStemLevel = Math.max(maxStemLevel, state.stemLevel)
        stemsActive ||= state.stemsActive
        await new Promise((resolve) => setTimeout(resolve, probeSampleEveryMs))
      }

      return {
        maxCombinedLevel,
        maxMasterLevel,
        maxStemLevel,
        stemsActive,
      }
    },
    { probeDurationMs: durationMs, probeSampleEveryMs: sampleEveryMs }
  )
}

async function captureWaveformSnapshots(
  page: Page,
  durationMs = 1400,
  sampleEveryMs = 10
): Promise<WaveformSnapshot[]> {
  return page.evaluate(
    async ({ probeDurationMs, probeSampleEveryMs }) => {
      const probe = (
        window as Window & {
          __FRISCHES_E2E_AUDIO__?: {
            readMasterSamples: () => number[]
            readStemSamples: () => number[]
          }
        }
      ).__FRISCHES_E2E_AUDIO__

      if (!probe) {
        throw new Error('Missing __FRISCHES_E2E_AUDIO__ waveform probe')
      }

      const snapshots: WaveformSnapshot[] = []
      const startedAt = performance.now()

      while (performance.now() - startedAt < probeDurationMs) {
        snapshots.push({
          master: probe.readMasterSamples(),
          stem: probe.readStemSamples(),
        })
        await new Promise((resolve) => setTimeout(resolve, probeSampleEveryMs))
      }

      return snapshots
    },
    { probeDurationMs: durationMs, probeSampleEveryMs: sampleEveryMs }
  )
}

async function captureWaveformChunk(
  page: Page,
  source: 'master' | 'stem',
  durationMs = 2500,
  sampleEveryMs = 20
): Promise<WaveformChunk> {
  return page.evaluate(
    async ({ probeDurationMs, probeSampleEveryMs, sourceName }) => {
      const probe = (
        window as Window & {
          __FRISCHES_E2E_AUDIO__?: {
            readMasterSamples: () => number[]
            readStemSamples: () => number[]
            readSampleRate: () => number
          }
        }
      ).__FRISCHES_E2E_AUDIO__

      if (!probe) {
        throw new Error('Missing __FRISCHES_E2E_AUDIO__ waveform probe')
      }

      const samples: number[] = []
      const storeTime = (await import('/src/stores/audio.ts')).useAudioStore().currentTime
      const startedAt = performance.now()

      while (performance.now() - startedAt < probeDurationMs) {
        const nextSamples =
          sourceName === 'master' ? probe.readMasterSamples() : probe.readStemSamples()
        samples.push(...nextSamples)
        await new Promise((resolve) => setTimeout(resolve, probeSampleEveryMs))
      }

      return {
        samples,
        storeTime,
        sampleRate: probe.readSampleRate(),
      }
    },
    { probeDurationMs: durationMs, probeSampleEveryMs: sampleEveryMs, sourceName: source }
  )
}

async function capturePairedWaveformChunk(
  page: Page,
  durationMs = 5000,
  sampleEveryMs = 10
): Promise<PairedWaveformChunk> {
  return page.evaluate(
    async ({ probeDurationMs, probeSampleEveryMs }) => {
      const probe = (
        window as Window & {
          __FRISCHES_E2E_AUDIO__?: {
            readMasterSamples: () => number[]
            readStemSamples: () => number[]
          }
        }
      ).__FRISCHES_E2E_AUDIO__

      if (!probe) {
        throw new Error('Missing __FRISCHES_E2E_AUDIO__ waveform probe')
      }

      const master: number[] = []
      const stem: number[] = []
      const startedAt = performance.now()

      while (performance.now() - startedAt < probeDurationMs) {
        master.push(...probe.readMasterSamples())
        stem.push(...probe.readStemSamples())
        await new Promise((resolve) => setTimeout(resolve, probeSampleEveryMs))
      }

      return { master, stem }
    },
    { probeDurationMs: durationMs, probeSampleEveryMs: sampleEveryMs }
  )
}

function normalizedCorrelation(left: number[], right: number[]): number {
  const n = Math.min(left.length, right.length)
  if (n === 0) return 0

  let sumLeft = 0
  let sumRight = 0
  for (let index = 0; index < n; index += 1) {
    sumLeft += left[index]!
    sumRight += right[index]!
  }

  const meanLeft = sumLeft / n
  const meanRight = sumRight / n

  let numerator = 0
  let denomLeft = 0
  let denomRight = 0
  for (let index = 0; index < n; index += 1) {
    const centeredLeft = left[index]! - meanLeft
    const centeredRight = right[index]! - meanRight
    numerator += centeredLeft * centeredRight
    denomLeft += centeredLeft * centeredLeft
    denomRight += centeredRight * centeredRight
  }

  const denominator = Math.sqrt(denomLeft * denomRight)
  if (denominator <= Number.EPSILON) return 0
  return numerator / denominator
}

async function expectAudibleOutput(page: Page, reason: string): Promise<void> {
  const stats = await sampleOutputLevels(page, 1500, 100)
  expect(
    stats.maxCombinedLevel,
    `${reason} (master=${stats.maxMasterLevel.toFixed(4)}, stems=${stats.maxStemLevel.toFixed(4)})`
  ).toBeGreaterThan(0.03)
}

async function expectSilentOutput(page: Page, reason: string): Promise<void> {
  let stats: OutputLevelStats | null = null

  // Allow a brief settle window for mute/crossfade tails before enforcing strict silence.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    stats = await sampleOutputLevels(page, 900, 100)
    if (stats.maxCombinedLevel < 0.005) return
    await page.waitForTimeout(250)
  }

  expect(
    stats!.maxCombinedLevel,
    `${reason} (master=${stats!.maxMasterLevel.toFixed(4)}, stems=${stats!.maxStemLevel.toFixed(4)})`
  ).toBeLessThan(0.005)
}

async function expectMasterPlaybackHealthyAfterDisable(page: Page, reason: string): Promise<void> {
  const before = await capturePlaybackSnapshot(page)
  await page.waitForFunction(
    (startTime: number) => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return Boolean(audio && !audio.paused && audio.currentTime > startTime + 0.35)
    },
    before.audioCurrentTime ?? 0,
    { timeout: 7000, polling: 100 }
  )
  const after = await capturePlaybackSnapshot(page)

  expect(after.audioPaused, `${reason} (audio should keep playing)`).toBe(false)
  expect(after.audioVolume, `${reason} (master element volume should be restored)`).toBeGreaterThan(
    0.1
  )
  expect(
    after.audioCurrentTime,
    `${reason} (timeline should keep advancing under master playback)`
  ).toBeGreaterThan((before.audioCurrentTime ?? 0) + 0.35)
}

async function openStemsOverlayOnTojd(page: Page): Promise<Locator> {
  await page.goto('/')
  await page.waitForLoadState('load')
  await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
  await waitForAnimations(page)

  await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
  await page.locator('[data-testid="card-music"]').click()
  await waitForAnimations(page)

  await page.locator('[data-testid="album-carousel"]').waitFor({ state: 'visible', timeout: 15000 })

  await page.evaluate(async () => {
    const { useAudioStore } = await import('/src/stores/audio.ts')
    const store = useAudioStore()
    store.startFromMusic('tftc:02-tojd')
  })

  await page.waitForFunction(
    () => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return Boolean(audio && !audio.paused && audio.currentTime > 0.25)
    },
    null,
    { timeout: 20000, polling: 100 }
  )

  const stemsToggle = page.locator('[data-testid="mini-stems"]')
  await stemsToggle.waitFor({ state: 'visible', timeout: 15000 })
  await stemsToggle.click()

  const overlay = page.locator('[data-testid="stems-overlay"]')
  await overlay.waitFor({ state: 'visible', timeout: 15000 })

  const stemsEnableToggle = page.locator('[data-testid="stems-enable-toggle"]')
  await stemsEnableToggle.waitFor({ state: 'visible', timeout: 15000 })
  await expect(stemsEnableToggle).toBeEnabled()
  return stemsEnableToggle
}

async function capturePlaybackSnapshot(page: Page): Promise<PlaybackSnapshot> {
  return page.evaluate(async () => {
    const audio = document.querySelector('audio') as HTMLAudioElement | null
    const { useAudioStore } = await import('/src/stores/audio.ts')
    const store = useAudioStore()

    return {
      audioPaused: audio?.paused ?? null,
      audioCurrentTime: audio?.currentTime ?? null,
      audioVolume: audio?.volume ?? null,
      storeCurrentTime: store.currentTime,
      storeIsPlaying: store.isPlaying,
      hasUserStartedPlayback: store.hasUserStartedPlayback,
    }
  })
}

test.describe('Stems playback switching', () => {
  test('enabling stems keeps playback continuous and disabling stems keeps timeline aligned', async ({
    page,
  }) => {
    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
    const player = page.locator('[data-testid="global-audio-player"]')

    const beforeEnable = await capturePlaybackSnapshot(page)
    expect(beforeEnable.audioPaused).toBe(false)
    expect(beforeEnable.storeIsPlaying).toBe(true)
    expect(beforeEnable.hasUserStartedPlayback).toBe(true)
    expect(beforeEnable.audioCurrentTime).not.toBeNull()
    expect(beforeEnable.audioVolume).toBeGreaterThan(0.1)

    await waitForStemsPrebuffered(page)
    await stemsEnableToggle.click()
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 7000 })

    const shortlyAfterEnable = await capturePlaybackSnapshot(page)
    expect(shortlyAfterEnable.audioPaused).toBe(false)
    expect(shortlyAfterEnable.storeIsPlaying).toBe(true)
    expect(shortlyAfterEnable.audioCurrentTime).toBeGreaterThan(beforeEnable.audioCurrentTime!)
    expect(shortlyAfterEnable.storeCurrentTime).toBeGreaterThan(beforeEnable.storeCurrentTime)
    expect(shortlyAfterEnable.audioVolume).not.toBeNull()

    await page.waitForFunction(
      (startTime: number) => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null
        return Boolean(audio && audio.currentTime > startTime + 1)
      },
      shortlyAfterEnable.audioCurrentTime ?? 0,
      { timeout: 7000, polling: 100 }
    )
    const whileEnabled = await capturePlaybackSnapshot(page)

    await stemsEnableToggle.click()
    await expect(player).toHaveAttribute('data-stems-active', 'false', { timeout: 7000 })

    const afterDisable = await capturePlaybackSnapshot(page)
    expect(afterDisable.audioPaused).toBe(false)
    expect(afterDisable.storeIsPlaying).toBe(true)
    expect(afterDisable.audioCurrentTime).toBeGreaterThan(whileEnabled.audioCurrentTime!)
    expect(
      Math.abs(afterDisable.audioCurrentTime! - afterDisable.storeCurrentTime)
    ).toBeLessThanOrEqual(0.35)
  })

  test('TOJD master and stems stay phase-aligned during the activation crossfade', async ({
    page,
  }) => {
    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
    await seekToKnownHotspot(page)

    const recordPromise = capturePairedWaveformChunk(page, 5000, 20)
    await stemsEnableToggle.click()

    const player = page.locator('[data-testid="global-audio-player"]')
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 7000 })

    const chunks = await recordPromise
    const correlation = normalizedCorrelation(chunks.master, chunks.stem)

    expect(
      correlation,
      `expected TOJD master/stem correlation near 1, got ${correlation}`
    ).toBeGreaterThan(0.95)
  })

  test('enabling stems activates within 300ms once buffers are pre-decoded', async ({ page }) => {
    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
    const player = page.locator('[data-testid="global-audio-player"]')

    // Verify stems are not active before clicking
    await expect(player).toHaveAttribute('data-stems-active', 'false')

    // Wait for background pre-decode to finish (fetch + decodeAudioData).
    // This happens automatically from track load — we just gate on it here so
    // the activation timing is purely for graph-build + source scheduling.
    await waitForStemsPrebuffered(page, 15000)

    const t0 = Date.now()
    await stemsEnableToggle.click()

    // With pre-decoded buffers, activation should be near-instant.
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 300 })
    const activationMs = Date.now() - t0

    // Pure graph-build + source-schedule should stay comfortably sub-half-second.
    expect(activationMs).toBeLessThan(450)

    // After the 300ms crossfade the master must be fully muted.
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null
        return Boolean(audio && audio.volume <= 0.05)
      },
      null,
      { timeout: 2000, polling: 50 }
    )
    const volAfterFade = await page.evaluate(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return audio?.volume ?? 1
    })
    expect(volAfterFade).toBeLessThan(0.05)
  })

  test('refresh keeps TOJD stems mode on and fully muted with no audible output', async ({
    page,
  }) => {
    test.setTimeout(120000)

    await page.goto('/')
    await page.waitForLoadState('load')
    await page.evaluate(() => localStorage.clear())

    await openStemsOverlayOnTojd(page)
    await ensureStemMixEditingEnabled(page)

    // Start from a known full-volume stem mix and verify audible output at the actual output.
    await page.locator('[data-testid="stems-reset"]').click()
    await waitForStemsActive(page)
    await seekToKnownHotspot(page)
    await expectAudibleOutput(page, 'all TOJD stems at 1 should be audible at output')

    // Pull every visible TOJD stem fader to zero and verify true silence.
    for (const stem of allTojdStemFaders) {
      await setStemSlider(page, stem, 0)
    }
    await expectSilentOutput(page, 'all TOJD stem faders at 0 should mute output')

    // Restore all stems to 1, then mute them via the mute buttons and verify silence again.
    for (const stem of allTojdStemFaders) {
      await setStemSlider(page, stem, 1)
    }
    for (const stem of allTojdStemFaders) {
      await toggleStemMute(page, stem)
      await expect(page.locator(`[data-testid="stem-${stem}-mute"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    }
    await expectSilentOutput(page, 'all TOJD stems muted via mute buttons should mute output')

    // Unmute the core stems one by one at 0:32 and verify each produces audible output.
    for (const stem of coreAudibleStems) {
      await seekToKnownHotspot(page)
      await toggleStemMute(page, stem)
      await expect(page.locator(`[data-testid="stem-${stem}-mute"]`)).toHaveAttribute(
        'aria-pressed',
        'false'
      )
      await expectAudibleOutput(page, `${stem} alone should be audible at 0:32`)
      await toggleStemMute(page, stem)
      await expect(page.locator(`[data-testid="stem-${stem}-mute"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      await expectSilentOutput(page, `${stem} re-muted should return output to silence`)
    }

    // Refresh and replay TOJD: stem mode must remain on, the muted state must be restored,
    // and the combined audible output must still be silent.
    await page.reload()
    await page.waitForLoadState('load')
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
    await waitForAnimations(page)

    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    await page.locator('[data-testid="card-music"]').click()
    await waitForAnimations(page)
    await page
      .locator('[data-testid="album-carousel"]')
      .waitFor({ state: 'visible', timeout: 15000 })

    await page.evaluate(async () => {
      const { useAudioStore } = await import('/src/stores/audio.ts')
      useAudioStore().startFromMusic('tftc:02-tojd')
    })

    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null
        return Boolean(audio && !audio.paused && audio.currentTime > 0.25)
      },
      null,
      { timeout: 20000, polling: 100 }
    )

    await waitForStemsActive(page)

    await page.locator('[data-testid="mini-stems"]').click()
    await ensureStemMixEditingEnabled(page)

    for (const stem of allTojdStemFaders) {
      await expect(page.locator(`[data-testid="stem-${stem}-mute"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      await expect(
        page.locator(`[data-testid="stem-${stem}"] input[type="range"]`).first()
      ).toHaveValue('0')
    }

    await seekToKnownHotspot(page)
    await expectSilentOutput(
      page,
      'refresh should keep TOJD stems on but fully muted with no output'
    )

    const persistedState = await page.evaluate(async () => {
      const { useAudioStore } = await import('/src/stores/audio.ts')
      const store = useAudioStore()
      return {
        stemMixEnabled: store.stemMixEnabled,
        gains: {
          drums: store.stemGains.drums,
          guitar: store.stemGains.guitar,
          bass: store.stemGains.bass,
          vocals: store.stemGains.vocals,
          percussion: store.stemGains.percussion,
          strings: store.stemGains.strings,
        },
      }
    })
    expect(persistedState.stemMixEnabled).toBe(true)
    expect(Object.values(persistedState.gains)).toEqual([0, 0, 0, 0, 0, 0])
  })

  test('pause then play in stems mode keeps stems active without reloading', async ({ page }) => {
    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
    const player = page.locator('[data-testid="global-audio-player"]')

    // Enable stems and wait for activation
    await stemsEnableToggle.click()
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 7000 })

    // Wait for crossfade to complete so master is fully muted
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null
        return Boolean(audio && audio.volume <= 0.05)
      },
      null,
      { timeout: 2000, polling: 50 }
    )

    // Pause playback
    const playPauseBtn = page.locator('[data-testid="mini-play-pause"]')
    await playPauseBtn.click()
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null
        return Boolean(audio && audio.paused)
      },
      null,
      { timeout: 5000, polling: 100 }
    )

    // CRITICAL: stems must stay active while paused — no deactivate on pause
    await expect(player).toHaveAttribute('data-stems-active', 'true')

    // Resume playback
    await playPauseBtn.click()

    // Stems must still be active within 300ms (no re-load cycle)
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 300 })

    // Master must still be muted (stems are producing the sound)
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null
        return Boolean(audio && audio.volume <= 0.05)
      },
      null,
      { timeout: 2000, polling: 50 }
    )
    const volAfterResume = await page.evaluate(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return audio?.volume ?? 1
    })
    expect(volAfterResume).toBeLessThan(0.05)
  })

  test('toggling stems on and off 5 times keeps output audible in both states', async ({
    page,
  }) => {
    test.setTimeout(120000)

    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
    const player = page.locator('[data-testid="global-audio-player"]')

    for (let cycle = 1; cycle <= 5; cycle += 1) {
      // Re-seek each cycle so ON/OFF level checks are not affected by natural
      // quiet passages later in the song.
      await seekToKnownHotspot(page)
      await waitForStemsPrebuffered(page)

      if ((await stemsEnableToggle.getAttribute('aria-pressed')) !== 'true') {
        await stemsEnableToggle.click()
      }
      await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 5000 })
      await expectAudibleOutput(page, `cycle ${cycle}: stems ON should be audible`)

      if ((await stemsEnableToggle.getAttribute('aria-pressed')) === 'true') {
        await stemsEnableToggle.click()
      }
      await expect(player).toHaveAttribute('data-stems-active', 'false', { timeout: 5000 })
      await expectMasterPlaybackHealthyAfterDisable(
        page,
        `cycle ${cycle}: stems OFF should restore healthy master playback`
      )
    }
  })
})
