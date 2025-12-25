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

    // Click on the first card (Music)
    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()

    // Wait for content view to appear after selecting card
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible({ timeout: 3000 })

    // Content placeholder should show
    const contentPlaceholder = page.locator('.card-dealer__content-placeholder')
    await expect(contentPlaceholder).toBeVisible()

    // Cards container should not be visible anymore
    await expect(cardsContainer).toBeHidden()
  })

  test('should return to cards view when clicking outside content', async ({ page }) => {
    // Setup: click logo, then click a card
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible({ timeout: 3000 })

    // verified content view above

    // Click on the click overlay (outside the content)
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    // Wait until overlay is visible then click a safe area (deterministic)
    await clickOverlay.waitFor({ state: 'visible', timeout: 3000 })
    await clickOverlay.click({ position: { x: 50, y: 50 } })

    // Wait for cards to re-appear
    await expect(cardsContainer).toBeVisible({ timeout: 3000 })

    // Content view should be hidden
    await expect(contentView).toBeHidden()

    // All three cards should still be present
    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()
    expect(cardCount).toBe(3)
  })

  test('should return to logo view when clicking outside cards', async ({ page }) => {
    // Setup: click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Click outside cards (on the background overlay)
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    await clickOverlay.waitFor({ state: 'visible', timeout: 3000 })
    await clickOverlay.click({ position: { x: 50, y: 50 } })

    // Wait for logo to reappear
    await expect(logoButton).toBeVisible({ timeout: 5000 })

    // Cards should be hidden
    await expect(cardsContainer).toBeHidden()

    // Logo button should be clickable
    await expect(logoButton).toBeEnabled()
  })

  test('should complete full cycle: logo → cards → content → cards → logo', async ({ page }) => {
    // Step 1: Initial state - logo visible
    const logoButton = page.locator('.logo-button')
    const cardsContainer = page.locator('.card-dealer__cards')
    const contentView = page.locator('.card-dealer__content-view')

    await expect(logoButton).toBeVisible()
    await expect(cardsContainer).toBeHidden()
    await expect(contentView).toBeHidden()

    // Step 2: Click logo → cards appear
    await logoButton.click()
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    await expect(logoButton).toBeHidden()
    await expect(cardsContainer).toBeVisible()
    await expect(contentView).toBeHidden()

    // Step 3: Click card → content appears
    const firstCard = page.locator('.menu-card').first()
    const cardTitle = firstCard.locator('.menu-card__title')
    const selectedTitle = await cardTitle.textContent()

    await firstCard.click()
    await expect(contentView).toBeVisible({ timeout: 3000 })

    await expect(logoButton).toBeHidden()
    await expect(cardsContainer).toBeHidden()
    await expect(contentView).toBeVisible()

    // Verify content shows selected card title
    const contentPlaceholder = page.locator('.card-dealer__content-placeholder')
    const contentText = await contentPlaceholder.textContent()
    expect(contentText).toContain(selectedTitle)

    // Step 4: Click outside content → cards return
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    await clickOverlay.waitFor({ state: 'visible', timeout: 3000 })
    await clickOverlay.click({ position: { x: 50, y: 50 } })

    await expect(cardsContainer).toBeVisible({ timeout: 3000 })

    await expect(logoButton).toBeHidden()
    await expect(cardsContainer).toBeVisible()
    await expect(contentView).toBeHidden()

    // Verify all three cards are back
    const cards = page.locator('.menu-card')
    expect(await cards.count()).toBe(3)

    // Step 5: Click outside cards → logo returns
    await clickOverlay.click()
    await expect(logoButton).toBeVisible({ timeout: 5000 })

    await expect(cardsContainer).toBeHidden()
    await expect(contentView).toBeHidden()
  })

  test('should handle multiple card clicks in sequence', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })

    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()

    // Click each card and verify content changes
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i)
      const cardTitle = await card.locator('.menu-card__title').textContent()

      // Click card and wait for content to appear
      await card.click()
      const contentPlaceholder = page.locator('.card-dealer__content-placeholder')
      await expect(contentPlaceholder).toBeVisible({ timeout: 3000 })
      const contentText = await contentPlaceholder.textContent()
      expect(contentText).toContain(cardTitle)

      // Click overlay to return to cards
      const clickOverlay = page.locator('.card-dealer__click-overlay')
      await clickOverlay.click()
      await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 3000 })
    }
  })

  test('should have proper z-index layering for click detection', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })

    // Verify click overlay is present and has correct z-index
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    await expect(clickOverlay).toBeVisible()

    // Get z-index value
    const zIndex = await clickOverlay.evaluate((el) => {
      return window.getComputedStyle(el).zIndex
    })

    // z-index should be 1 (below cards z-index 4 but above background z-index 0)
    expect(parseInt(zIndex)).toBe(1)

    // Cards should have higher z-index for click capture
    const cards = page.locator('.menu-card').first()
    const cardZIndex = await cards.evaluate((el) => {
      return window.getComputedStyle(el).zIndex
    })

    expect(parseInt(cardZIndex)).toBeGreaterThan(parseInt(zIndex))
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
