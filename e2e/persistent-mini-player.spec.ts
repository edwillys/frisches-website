import { test, expect } from '@playwright/test'
import { waitForAnimations, clickAndWaitForAnimations } from './helpers.js'

test.describe('Persistent mini-player (Phase 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
    await waitForAnimations(page)
  })

  test('mini-player appears only after user starts, persists across navigation, and X hides until Music/About restart', async ({ page }, testInfo) => {
    // Skip this test on CI for webkit which is currently flaky
    test.skip(process.env.CI && testInfo.project.name === 'webkit',
      'Skipping persistent mini-player test on CI for webkit')
    const miniPlayer = page.locator('[data-testid="audio-mini-player"]')
    await expect(miniPlayer).toBeHidden()

    // Open cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')

    // Go to Music
    await page.locator('[data-testid="card-music"]').click()
    await waitForAnimations(page)

    // Mini-player should still be hidden until play is pressed
    await expect(miniPlayer).toBeHidden()

    // Wait for AudioPlayer to fully render
    await expect(page.locator('[data-testid="album-rail-toggle"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="album-title"]')).toBeVisible({ timeout: 10000 })

    // Start playback from Music (explicit gesture)
    const playButton = page.locator('[data-testid="btn-play-album"]')
    await expect(playButton).toBeVisible({ timeout: 10000 })
    await playButton.click()
    await expect(miniPlayer).toBeVisible({ timeout: 10000 })

    // Mini-player shows cover image when available
    await expect(page.locator('[data-testid="audio-mini-player"] img')).toBeVisible({ timeout: 10000 })

    // Navigate back to cards -> mini-player persists
    await page.locator('.card-dealer__back-button').first().click()
    await waitForAnimations(page)
    await expect(miniPlayer).toBeVisible({ timeout: 10000 })

    // Cards -> Logo (click outside) -> mini-player persists
    await page.mouse.click(100, 100)
    await waitForAnimations(page)
    await expect(page.locator('[data-testid="logo-button"]')).toBeVisible({ timeout: 15000 })
    await expect(miniPlayer).toBeVisible({ timeout: 10000 })

    // Close via X: stops playback and hides the overlay
    await page.locator('[data-testid="audio-mini-close"]').click()
    await expect(miniPlayer).toBeHidden({ timeout: 10000 })

    const pausedAndReset = await page.evaluate(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      if (!audio) return false
      return audio.paused && Math.abs(audio.currentTime) < 0.25
    })
    expect(pausedAndReset).toBe(true)

    // Navigate around should not re-open the mini-player
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    await expect(page.locator('[data-testid="card-dealer-cards-container"]')).toBeVisible({ timeout: 10000 })
    await expect(miniPlayer).toBeHidden()

    // Restart path 1: About chip can start playback again
    await page.locator('[data-testid="card-about"]').click()
    await waitForAnimations(page)

    // Navigate to a band member (Edgar) who has a favorite song
    await page.keyboard.press('E')
    await waitForAnimations(page)

    await page.locator('[data-testid="favorite-song-chip"]').click()
    await expect(miniPlayer).toBeVisible({ timeout: 10000 })

    // Clicking inside mini-player should NOT be treated as outside click (should stay in About view)
    await page.locator('[data-testid="mini-play-pause"]').click()
    await expect(page.locator('[data-testid="character-selection"]')).toBeVisible({ timeout: 20000 })

    // Next/Prev buttons work in mini-player
    const titleLocator = page.locator('[data-testid="audio-mini-player"] .mini-player__title')
    const titleBefore = await titleLocator.innerText()
    await page.locator('[data-testid="audio-mini-player"] button[aria-label="Next"]').click()
    await expect(titleLocator).not.toHaveText(titleBefore)
    await page.locator('[data-testid="audio-mini-player"] button[aria-label="Previous"]').click()
    await expect(titleLocator).toHaveText(titleBefore)
  })
})
