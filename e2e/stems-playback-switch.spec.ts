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
  await page.waitForTimeout(450)
}

async function seekToKnownHotspot(page: Page, seconds = 32): Promise<void> {
  await page.evaluate(async (targetSeconds: number) => {
    const { useAudioStore } = await import('/src/stores/audio.ts')
    useAudioStore().seek(targetSeconds)
  }, seconds)

  await page.waitForFunction(
    (targetSeconds: number) => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      return Boolean(audio && Math.abs(audio.currentTime - targetSeconds) < 0.4)
    },
    seconds,
    { timeout: 10000, polling: 100 }
  )

  await page.waitForTimeout(250)
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

async function expectAudibleOutput(page: Page, reason: string): Promise<void> {
  const stats = await sampleOutputLevels(page, 1500, 100)
  expect(
    stats.maxCombinedLevel,
    `${reason} (master=${stats.maxMasterLevel.toFixed(4)}, stems=${stats.maxStemLevel.toFixed(4)})`
  ).toBeGreaterThan(0.03)
}

async function expectSilentOutput(page: Page, reason: string): Promise<void> {
  await page.waitForTimeout(150)
  const stats = await sampleOutputLevels(page, 900, 100)
  expect(
    stats.maxCombinedLevel,
    `${reason} (master=${stats.maxMasterLevel.toFixed(4)}, stems=${stats.maxStemLevel.toFixed(4)})`
  ).toBeLessThan(0.005)
}

async function expectMasterPlaybackHealthyAfterDisable(page: Page, reason: string): Promise<void> {
  const before = await capturePlaybackSnapshot(page)
  await page.waitForTimeout(700)
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

    const beforeEnable = await capturePlaybackSnapshot(page)
    expect(beforeEnable.audioPaused).toBe(false)
    expect(beforeEnable.storeIsPlaying).toBe(true)
    expect(beforeEnable.hasUserStartedPlayback).toBe(true)
    expect(beforeEnable.audioCurrentTime).not.toBeNull()
    expect(beforeEnable.audioVolume).toBeGreaterThan(0.1)

    await stemsEnableToggle.click()
    await page.waitForTimeout(150)

    const shortlyAfterEnable = await capturePlaybackSnapshot(page)
    expect(shortlyAfterEnable.audioPaused).toBe(false)
    expect(shortlyAfterEnable.storeIsPlaying).toBe(true)
    expect(shortlyAfterEnable.audioCurrentTime).toBeGreaterThan(beforeEnable.audioCurrentTime!)
    expect(shortlyAfterEnable.storeCurrentTime).toBeGreaterThan(beforeEnable.storeCurrentTime)
    expect(shortlyAfterEnable.audioVolume).toBeGreaterThan(0.1)

    await page.waitForTimeout(1200)
    const whileEnabled = await capturePlaybackSnapshot(page)

    await stemsEnableToggle.click()
    await page.waitForTimeout(250)

    const afterDisable = await capturePlaybackSnapshot(page)
    expect(afterDisable.audioPaused).toBe(false)
    expect(afterDisable.storeIsPlaying).toBe(true)
    expect(afterDisable.audioCurrentTime).toBeGreaterThan(whileEnabled.audioCurrentTime!)
    expect(
      Math.abs(afterDisable.audioCurrentTime! - afterDisable.storeCurrentTime)
    ).toBeLessThanOrEqual(0.35)
  })

  test('enabling stems activates within 300ms once buffers are pre-decoded', async ({ page }) => {
    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
    const player = page.locator('[data-testid="global-audio-player"]')

    // Verify stems are not active before clicking
    await expect(player).toHaveAttribute('data-stems-active', 'false')

    // Wait for background pre-decode to finish (fetch + decodeAudioData).
    // This happens automatically from track load — we just gate on it here so
    // the activation timing is purely for graph-build + source scheduling.
    await expect(player).toHaveAttribute('data-stems-prebuffered', 'true', { timeout: 15000 })

    const t0 = Date.now()
    await stemsEnableToggle.click()

    // With pre-decoded buffers, activation should be near-instant.
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 300 })
    const activationMs = Date.now() - t0

    // Pure graph-build + source-schedule is < 300ms even on slow machines.
    expect(activationMs).toBeLessThan(300)

    // After the 300ms crossfade the master must be fully muted.
    await page.waitForTimeout(400)
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

    const stemsEnableToggle = await openStemsOverlayOnTojd(page)
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
    await page.waitForTimeout(400)

    // Pause playback
    const playPauseBtn = page.locator('[data-testid="mini-play-pause"]')
    await playPauseBtn.click()
    await page.waitForTimeout(200)

    // CRITICAL: stems must stay active while paused — no deactivate on pause
    await expect(player).toHaveAttribute('data-stems-active', 'true')

    // Resume playback
    await playPauseBtn.click()

    // Stems must still be active within 300ms (no re-load cycle)
    await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 300 })

    // Master must still be muted (stems are producing the sound)
    await page.waitForTimeout(100)
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

      await stemsEnableToggle.click()
      await expect(player).toHaveAttribute('data-stems-active', 'true', { timeout: 5000 })
      await expectAudibleOutput(page, `cycle ${cycle}: stems ON should be audible`)

      await stemsEnableToggle.click()
      await expect(player).toHaveAttribute('data-stems-active', 'false', { timeout: 5000 })
      await expectMasterPlaybackHealthyAfterDisable(
        page,
        `cycle ${cycle}: stems OFF should restore healthy master playback`
      )
    }
  })
})
