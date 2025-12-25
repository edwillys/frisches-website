import { test, expect } from '@playwright/test'

/**
 * End-to-End Integration Test: Complete User Flow
 * 
 * Tests the full user journey through the Frisches website:
 * 1. Landing on the site and seeing the logo
 * 2. Clicking the logo to reveal cards
 * 3. Clicking a card to view content
 * 4. Returning to cards view
 * 5. Returning to logo view
 */

test.describe('Frisches Website - Complete User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the website
    await page.goto('/')
    // Wait for page to load
    await page.waitForLoadState('load')
  })

  test('should display logo on initial load', async ({ page }) => {
    // Initial state: Logo should be visible
    const logoButton = page.locator('.card-dealer__logo-button-wrapper')
    await expect(logoButton).toBeVisible()

    // Logo button should be clickable
    const logoElement = page.locator('.logo-button')
    await expect(logoElement).toBeEnabled()

    // Cards should NOT be visible initially
    await expect(page.locator('.card-dealer__cards')).toBeHidden()
  })

  test('should reveal cards when clicking logo', async ({ page }) => {
    // Click the logo button
    const logoButton = page.locator('.logo-button')
    await logoButton.click()

    // Wait for cards to appear after animation
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // All three menu cards should be present and visible
    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()
    expect(cardCount).toBe(3)

    // Each card should have correct title
    const musicCard = page.locator('.menu-card__title:has-text("Music")')
    const aboutCard = page.locator('.menu-card__title:has-text("About")')
    const tourCard = page.locator('.menu-card__title:has-text("Tour")')

    await expect(musicCard).toBeVisible()
    await expect(aboutCard).toBeVisible()
    await expect(tourCard).toBeVisible()

    // Logo button should no longer be visible
    await expect(logoButton).toBeHidden()
  })

  test('should show content when clicking a card', async ({ page }) => {
    // First, click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Click on the music card
    const musicCard = page.locator('[data-testid="card-/music"]')
    await musicCard.click()

    // Wait for content view to appear after selecting card
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible({ timeout: 5000 })

    // Audio player should show for music content
    const audioPlayer = page.locator('[data-testid="audio-player"]')
    await expect(audioPlayer).toBeVisible({ timeout: 10000 })
  })

  test('should return to cards view when clicking back button', async ({ page }) => {
    // Setup: click logo, then click a card
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible({ timeout: 5000 })

    // Click the back button
    const backButton = page.locator('.card-dealer__back-button').first()
    await backButton.click()

    // Wait for cards to be visible again (indicating we're back)
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // All three cards should still be present
    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()
    expect(cardCount).toBe(3)
  })

  test('should return to logo view when clicking outside cards', async ({ page }) => {
    // Setup: click logo to reveal cards
    const logoButton = page.locator('[data-testid="logo-button"]')
    await logoButton.click()
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    // Wait for card animation to fully complete
    await page.waitForTimeout(3000)

    // Click outside the cards area to return to logo (click in a safe area)
    await page.mouse.click(100, 100)

    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    // Wait for logo transition animation
    await page.waitForTimeout(3000)
    
    // Wait for logo to reappear
    await expect(logoButton).toBeVisible({ timeout: 15000 })

    // Logo button should be clickable
    await expect(logoButton).toBeEnabled()
  })

  test('should complete full cycle: logo → cards → content → cards → logo', async ({ page }) => {
    // Step 1: Initial state - logo visible
    const logoButton = page.locator('[data-testid="logo-button"]')
    const cardsContainer = page.locator('.card-dealer__cards')
    const contentView = page.locator('.card-dealer__content-view')

    await expect(logoButton).toBeVisible()

    // Step 2: Click logo → cards appear
    await logoButton.click()
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    await page.waitForTimeout(2000) // Wait for animation to fully complete

    // Step 3: Click card → content appears
    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    await expect(contentView).toBeVisible({ timeout: 5000 })
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    await page.waitForTimeout(2000) // Wait for animation to fully complete

    // Step 4: Click back button → cards return
    const backButton = page.locator('.card-dealer__back-button').first()
    await backButton.click()
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    await page.waitForTimeout(3000) // Wait longer for animation to fully complete

    // Verify all three cards are back
    const cards = page.locator('.menu-card')
    expect(await cards.count()).toBe(3)

    // Step 5: Click outside cards → logo returns (click in a safe area away from cards)
    await page.mouse.click(100, 100)
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    await page.waitForTimeout(3000) // Wait for logo transition animation
    await expect(logoButton).toBeVisible({ timeout: 15000 })
  })

  test('should handle multiple card clicks in sequence', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    await page.waitForTimeout(2000) // Wait for animation to fully complete

    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()

    // Click each card and verify content changes
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i)

      // Click card and wait for content to appear
      await card.click()
      const contentView = page.locator('.card-dealer__content-view')
      await expect(contentView).toBeVisible({ timeout: 5000 })
      // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
      await page.waitForTimeout(2000) // Wait for animation to fully complete

      // Click back button to return to cards
      const backButton = page.locator('.card-dealer__back-button').first()
      await backButton.click()
      await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })
      // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
      await page.waitForTimeout(2000) // Wait for animation to fully complete
    }
  })

  test('should have working back buttons in both cards and content views', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })

    // Verify back button is present in cards view
    const cardsBackButton = page.locator('.card-dealer__cards-back-button-wrapper .card-dealer__back-button')
    await expect(cardsBackButton).toBeVisible()

    // Click a card to go to content view
    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    await expect(page.locator('.card-dealer__content-view')).toBeVisible({ timeout: 5000 })

    // Verify back button is present in content view
    const contentBackButton = page.locator('.card-dealer__header .card-dealer__back-button')
    await expect(contentBackButton).toBeVisible()
  })

  test('should have responsive card layout', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })

    // Get cards container
    const cardsContainer = page.locator('.card-dealer__cards')

    // Verify flex display
    const display = await cardsContainer.evaluate((el) => {
      return window.getComputedStyle(el).display
    })
    expect(display).toBe('flex')

    // Verify no wrapping
    const flexWrap = await cardsContainer.evaluate((el) => {
      return window.getComputedStyle(el).flexWrap
    })
    expect(flexWrap).toBe('nowrap')

    // Verify cards are side-by-side (flex-shrink: 0)
    const firstCard = page.locator('.menu-card').first()
    const flexShrink = await firstCard.evaluate((el) => {
      return window.getComputedStyle(el).flexShrink
    })
    expect(flexShrink).toBe('0')
  })
})
