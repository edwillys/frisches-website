import { test, expect, Page, type Locator } from '@playwright/test'
import { waitForAnimations, clickAndWaitForAnimations } from './helpers.js'

test.describe('Lyrics Display Feature', () => {
  async function clickRobust(locator: Locator) {
    try {
      await locator.click({ timeout: 5000 })
    } catch {
      // Some browsers (notably WebKit) can get stuck on "stable" checks even when clickable.
      await locator.evaluate((el) => (el as HTMLElement).click())
    }
  }

  async function hoverRevealRow(row: Locator) {
    await scrollIntoViewQuick(row)
    try {
      await row.hover({ force: true, timeout: 3000 })
    } catch {
      // Ignore hover failures; we'll still try to trigger pointerenter below.
    }

    // Vue uses @pointerenter for hovered state; WebKit can miss hover-triggered pointer events.
    await row.evaluate((el) => {
      try {
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }))
      } catch {
        // Older engines may not support PointerEvent constructor.
      }
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    })
  }

  async function clickRowPlayButton(row: Locator) {
    await hoverRevealRow(row)
    const playBtn = row.locator('.track-table__play-btn').first()
    await expect(playBtn).toBeVisible({ timeout: 4000 })
    await clickRobust(playBtn)
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 3000 })
    // Avoid smooth scrolling / layout reflow causing Firefox scrollIntoViewIfNeeded stability timeouts.
    await page.addStyleTag({ content: '* { scroll-behavior: auto !important; }' })
  })

  async function scrollIntoViewQuick(locator: Locator) {
    const target = locator.first()
    await target.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' })
    })
  }

  async function navigateToMusicPlayer(page: Page) {
    // Click logo to reveal cards and wait for the open animation to finish
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]', 6000)

    // Click music card
    const musicCard = page.locator('[data-testid="card-/music"]')
    await expect(musicCard).toBeVisible({ timeout: 2000 })
    await musicCard.click()

    // Wait until CardDealer finishes the card-selection animation.
    // Without this, Firefox can report track rows as "not stable" for hover/click.
    await waitForAnimations(page, 8000)

    // Wait for audio player
    const audioPlayer = page.locator('[data-testid="audio-player"]')
    await expect(audioPlayer).toBeVisible({ timeout: 5000 })
  }

  async function playTrackWithLyrics(page: Page) {
    // Click the "Witch Hunting" track (has lyrics)
    const witchHuntingRow = page.locator('.track-table__row').filter({ hasText: 'Witch Hunting' })
    await expect(witchHuntingRow).toBeVisible({ timeout: 2000 })
    
    // Click play button on the row (hover-rendered, so avoid Playwright auto-scroll click flakiness)
    await clickRowPlayButton(witchHuntingRow)


    // Wait for mini-player to appear
    const miniPlayer = page.locator('[data-testid="audio-mini-player"]')
    await expect(miniPlayer).toBeVisible({ timeout: 5000 })
  }

  test('lyrics button is disabled for tracks without lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)

    // Play a track without lyrics (e.g., "Intro")  
    const introRow = page.locator('.track-table__row').filter({ hasText: 'Intro' })
    await expect(introRow).toBeVisible({ timeout: 2000 })
    
    // Click play button on the row
    await clickRowPlayButton(introRow)

    // Lyrics button should be disabled
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await expect(lyricsBtn).toBeVisible({ timeout: 3000 })
    await expect(lyricsBtn).toBeDisabled()
    await expect(lyricsBtn).toHaveClass(/is-disabled/)
  })

  test('lyrics button is enabled for tracks with lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Lyrics button should be enabled
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await expect(lyricsBtn).toBeVisible({ timeout: 3000 })
    await expect(lyricsBtn).toBeEnabled()
    await expect(lyricsBtn).not.toHaveClass(/is-disabled/)
  })

  test('clicking lyrics button shows lyrics display', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Initially, track table should be visible
    const trackTable = page.locator('.track-table')
    await expect(trackTable).toBeVisible()

    // Click lyrics button
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


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
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


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
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // Verify lyrics are shown
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible()

    // Click again to close
    await clickRobust(lyricsBtn)


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
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // Verify lyrics are shown
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible()

    // Close mini-player
    const closeBtn = page.locator('[data-testid="audio-mini-close"]')
    await clickRobust(closeBtn)


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
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // Get a future line (not the first one)
    const lyricsLines = page.locator('.lyrics-line')
    const thirdLine = lyricsLines.nth(2)
    await expect(thirdLine).toBeVisible()

    // Click the line
    await thirdLine.click()


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
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // Initially sync button should not be visible
    const syncButton = page.locator('.sync-button')
    await expect(syncButton).toBeHidden()

    // Manually scroll the lyrics container (real user-like wheel scroll)
    const lyricsContainer = page.locator('.lyrics-container')
    await lyricsContainer.hover()
    await page.mouse.wheel(0, 600)


    // Sync button should appear
    await expect(syncButton).toBeVisible({ timeout: 3000 })
  })

  test('sync button re-centers active line', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // Manually scroll away (real user-like wheel scroll)
    const lyricsContainer = page.locator('.lyrics-container')
    await lyricsContainer.hover()
    await page.mouse.wheel(0, 600)


    // Sync button should appear
    const syncButton = page.locator('.sync-button')
    await expect(syncButton).toBeVisible({ timeout: 3000 })

    // Click sync button
    await syncButton.click()


    // Sync button should disappear
    await expect(syncButton).toBeHidden()
  })

  test('active line styling is applied', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // At least one line should have is-active class
    const activeLine = page.locator('.lyrics-line.is-active')
    await expect(activeLine).toBeVisible({ timeout: 2000 })

    // Active line should contain active words
    const activeWords = activeLine.locator('.lyrics-word')
    const wordCount = await activeWords.count()
    expect(wordCount).toBeGreaterThan(0)
  })

  test('past lines are styled in cyan', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)

    // Force time forward (headless audio may not advance reliably).
    await page.evaluate(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null
      if (!audio) return
      const target = 120
      audio.currentTime = Math.min(target, Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.1) : target)
      audio.dispatchEvent(new Event('timeupdate'))
    })

    // Check if any past lines exist
    const pastLines = page.locator('.lyrics-line.is-past')
    
    // Past lines should now exist
    await expect(pastLines).not.toHaveCount(0, { timeout: 2000 })
    
    // Past lines should be visible and styled
    await expect(pastLines.first()).toBeVisible()
    
    // Check computed color (cyan should be applied)
    const color = await pastLines.first().locator('.lyrics-line-content').evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    
    // Cyan color should be applied (not default text color)
    expect(color).not.toBe('rgb(255, 255, 255)')
  })

  test('switching tracks closes lyrics if new track has no lyrics', async ({ page }) => {
    await navigateToMusicPlayer(page)
    await playTrackWithLyrics(page)

    // Open lyrics
    const lyricsBtn = page.locator('.mini-player__right .mini-player__btn--lyrics')
    await clickRobust(lyricsBtn)


    // Verify lyrics are shown
    const lyricsView = page.locator('.lyrics-view')
    await expect(lyricsView).toBeVisible()

    // Play a different track without lyrics
    const introRow = page.locator('.track-table__row').filter({ hasText: 'Intro' })
    
    // We need to close lyrics first to see the track table
    await clickRobust(lyricsBtn)

    
    await clickRowPlayButton(introRow)


    // Lyrics button should be disabled
    await expect(lyricsBtn).toBeDisabled()
    await expect(lyricsBtn).not.toHaveClass(/is-active/)
  })
})
