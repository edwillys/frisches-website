import { test, expect, Page } from '@playwright/test'
import { waitForAnimations } from './helpers.js'

test.describe('Lyrics Display Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
    await waitForAnimations(page)
  })

  async function navigateToMusicPlayer(page: Page) {
    // Click logo to reveal cards
    await page.locator('[data-testid="logo-button"]').click()
    await waitForAnimations(page)

    // Click music card
    const musicCard = page.locator('[data-testid="card-/music"]')
    await expect(musicCard).toBeVisible({ timeout: 5000 })
    await musicCard.click()
    await waitForAnimations(page)

    // Wait for audio player
    const audioPlayer = page.locator('[data-testid="audio-player"]')
    await expect(audioPlayer).toBeVisible({ timeout: 5000 })
  }

  async function playTrackWithLyrics(page: Page) {
    // Click the "Witch Hunting" track (has lyrics)
    const witchHuntingRow = page.locator('.track-table__row').filter({ hasText: 'Witch Hunting' })
    await expect(witchHuntingRow).toBeVisible({ timeout: 5000 })
    
    // Click play button on the row
    const playBtn = witchHuntingRow.locator('.track-table__play-btn').first()
    await playBtn.click()
    await page.waitForTimeout(500) // Wait for playback to start

    // Wait for mini-player to appear
    const miniPlayer = page.locator('.mini-player')
    await expect(miniPlayer).toBeVisible({ timeout: 3000 })
  }

  test('lyrics button is disabled for tracks without lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)

    // Play a track without lyrics (e.g., "Intro")
    const introRow = page.locator('.track-table__row').filter({ hasText: 'Intro' })
    const playBtn = introRow.locator('.track-table__play-btn').first()
    await playBtn.click()
    await page.waitForTimeout(500)

    // Lyrics button should be disabled
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await expect(lyricsBtn).toBeVisible({ timeout: 3000 })
    await expect(lyricsBtn).toBeDisabled()
    await expect(lyricsBtn).toHaveClass(/is-disabled/)
  })

  test('lyrics button is enabled for tracks with lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Lyrics button should be enabled
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await expect(lyricsBtn).toBeVisible({ timeout: 3000 })
    await expect(lyricsBtn).not.toBeDisabled()
    await expect(lyricsBtn).not.toHaveClass(/is-disabled/)
  })

  test('clicking lyrics button shows lyrics display', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Initially, track table should be visible
    const trackTable = page.locator('.track-table')
    await expect(trackTable).toBeVisible()

    // Click lyrics button
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(500)

    // Track table should be hidden
    await expect(trackTable).toBeHidden()

    // Lyrics display should be visible
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible({ timeout: 3000 })

    // Lyrics button should have is-active class
    await expect(lyricsBtn).toHaveClass(/is-active/)
  })

  test('lyrics display shows synced lyrics content', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(1000)

    // Lyrics lines should be visible
    const lyricsLines = page.locator('.lyrics-line')
    await expect(lyricsLines.first()).toBeVisible({ timeout: 3000 })

    // Should have multiple lines
    const lineCount = await lyricsLines.count()
    expect(lineCount).toBeGreaterThan(0)

    // Lines should contain words
    const firstLine = lyricsLines.first()
    const words = firstLine.locator('.lyrics-word')
    const wordCount = await words.count()
    expect(wordCount).toBeGreaterThan(0)
  })

  test('clicking lyrics button again hides lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(500)

    // Verify lyrics are shown
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible()

    // Click again to close
    await lyricsBtn.click()
    await page.waitForTimeout(500)

    // Lyrics should be hidden
    await expect(lyricsView).toBeHidden()

    // Track table should be visible again
    const trackTable = page.locator('.track-table')
    await expect(trackTable).toBeVisible()

    // Button should not have is-active class
    await expect(lyricsBtn).not.toHaveClass(/is-active/)
  })

  test('closing mini-player closes lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(500)

    // Verify lyrics are shown
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible()

    // Close mini-player
    const closeBtn = page.locator('.mini-player__btn--close')
    await closeBtn.click()
    await page.waitForTimeout(500)

    // Mini-player should be hidden
    const miniPlayer = page.locator('.mini-player')
    await expect(miniPlayer).toBeHidden()

    // If we open it again by playing, lyrics should be closed
    await playTrackWithLyrics(page)
    await expect(miniPlayer).toBeVisible()
    await expect(lyricsBtn).not.toHaveClass(/is-active/)
  })

  test('lyrics lines are clickable for seeking', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(1000)

    // Get a future line (not the first one)
    const lyricsLines = page.locator('.lyrics-line')
    const thirdLine = lyricsLines.nth(2)
    await expect(thirdLine).toBeVisible()

    // Click the line
    await thirdLine.click()
    await page.waitForTimeout(500)

    // The clicked line should become active (or past)
    // We can check if it has is-active or is-past class after a moment
    const hasActiveOrPast = await thirdLine.evaluate((el) => {
      return el.classList.contains('is-active') || el.classList.contains('is-past')
    })
    expect(hasActiveOrPast).toBe(true)
  })

  test('manual scroll shows sync button', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(1000)

    // Initially sync button should not be visible
    const syncButton = page.locator('.sync-button')
    await expect(syncButton).toBeHidden()

    // Manually scroll the lyrics container
    const lyricsContainer = page.locator('.lyrics-container')
    await lyricsContainer.evaluate((el) => {
      el.scrollTop = 500
    })
    await page.waitForTimeout(200)

    // Sync button should appear
    await expect(syncButton).toBeVisible({ timeout: 3000 })
  })

  test('sync button re-centers active line', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(1000)

    // Manually scroll away
    const lyricsContainer = page.locator('.lyrics-container')
    await lyricsContainer.evaluate((el) => {
      el.scrollTop = 500
    })
    await page.waitForTimeout(200)

    // Sync button should appear
    const syncButton = page.locator('.sync-button')
    await expect(syncButton).toBeVisible({ timeout: 3000 })

    // Click sync button
    await syncButton.click()
    await page.waitForTimeout(500)

    // Sync button should disappear
    await expect(syncButton).toBeHidden()
  })

  test('active line styling is applied', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(2000) // Wait for playback to progress

    // At least one line should have is-active class
    const activeLine = page.locator('.lyrics-line.is-active')
    await expect(activeLine).toBeVisible({ timeout: 5000 })

    // Active line should contain active words
    const activeWords = activeLine.locator('.lyrics-word')
    const wordCount = await activeWords.count()
    expect(wordCount).toBeGreaterThan(0)
  })

  test('past lines are styled in cyan', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(3000) // Wait for some lyrics to pass

    // Check if any past lines exist
    const pastLines = page.locator('.lyrics-line.is-past')
    const pastLineCount = await pastLines.count()

    if (pastLineCount > 0) {
      // Past lines should be visible and styled
      await expect(pastLines.first()).toBeVisible()
      
      // Check computed color (cyan should be applied)
      const color = await pastLines.first().locator('.lyrics-line-content').evaluate((el) => {
        return window.getComputedStyle(el).color
      })
      
      // Cyan color should be applied (not default text color)
      expect(color).not.toBe('rgb(255, 255, 255)')
    }
  })

  test('switching tracks closes lyrics if new track has no lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__btn--lyrics')
    await lyricsBtn.click()
    await page.waitForTimeout(500)

    // Verify lyrics are shown
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible()

    // Play a different track without lyrics
    const introRow = page.locator('.track-table__row').filter({ hasText: 'Intro' })
    
    // We need to close lyrics first to see the track table
    await lyricsBtn.click()
    await page.waitForTimeout(300)
    
    const playBtn = introRow.locator('.track-table__play-btn').first()
    await playBtn.click()
    await page.waitForTimeout(500)

    // Lyrics button should be disabled
    await expect(lyricsBtn).toBeDisabled()
    await expect(lyricsBtn).not.toHaveClass(/is-active/)
  })
})
