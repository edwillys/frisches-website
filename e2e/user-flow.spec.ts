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
    await page.goto('http://localhost:5174/')
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display logo on initial load', async ({ page }) => {
    // Initial state: Logo should be visible
    const logoButton = page.locator('.card-dealer__logo-button-wrapper')
    await expect(logoButton).toBeVisible()

    // Logo button should be clickable
    const logoElement = page.locator('.logo-button')
    await expect(logoElement).toBeEnabled()

    // Cards should NOT be visible initially
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).not.toBeVisible()
  })

  test('should reveal cards when clicking logo', async ({ page }) => {
    // Click the logo button
    const logoButton = page.locator('.logo-button')
    await logoButton.click()

    // Wait for animation to complete (1.5s logo close + 1.8s cards open)
    await page.waitForTimeout(3500)

    // Cards should now be visible
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible()

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
    await expect(logoButton).not.toBeVisible()
  })

  test('should show content when clicking a card', async ({ page }) => {
    // First, click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await page.waitForTimeout(3500)

    // Click on the first card (Music)
    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()

    // Wait for card selection animation (1s)
    await page.waitForTimeout(1200)

    // Content view should be visible
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible()

    // Content placeholder should show
    const contentPlaceholder = page.locator('.card-dealer__content-placeholder')
    await expect(contentPlaceholder).toBeVisible()

    // Cards container should not be visible anymore
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).not.toBeVisible()
  })

  test('should return to cards view when clicking outside content', async ({ page }) => {
    // Setup: click logo, then click a card
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await page.waitForTimeout(3500)

    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    await page.waitForTimeout(1200)

    // Verify we're in content view
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible()

    // Click on the click overlay (outside the content)
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    const overlayBox = await clickOverlay.boundingBox()
    
    if (overlayBox) {
      // Click in the top-left corner of the overlay (away from content)
      await page.click(
        '.card-dealer__click-overlay',
        { position: { x: 50, y: 50 } }
      )
    } else {
      // Fallback: click the overlay element directly
      await clickOverlay.click()
    }

    // Wait for animation (1s)
    await page.waitForTimeout(1200)

    // Cards should be visible again
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible()

    // Content view should be hidden
    await expect(contentView).not.toBeVisible()

    // All three cards should still be present
    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()
    expect(cardCount).toBe(3)
  })

  test('should return to logo view when clicking outside cards', async ({ page }) => {
    // Setup: click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await page.waitForTimeout(3500)

    // Verify cards are visible
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible()

    // Click outside cards (on the background overlay)
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    const overlayBox = await clickOverlay.boundingBox()

    if (overlayBox) {
      // Click in the top-left corner of the overlay (away from cards)
      await page.click(
        '.card-dealer__click-overlay',
        { position: { x: 50, y: 50 } }
      )
    } else {
      // Fallback: click the overlay element
      await clickOverlay.click()
    }

    // Wait for animation (1.5s collapse + 1.5s logo reappear)
    await page.waitForTimeout(3200)

    // Cards should be hidden
    await expect(cardsContainer).not.toBeVisible()

    // Logo button should be visible again
    await expect(logoButton).toBeVisible()

    // Logo button should be clickable
    await expect(logoButton).toBeEnabled()
  })

  test('should complete full cycle: logo → cards → content → cards → logo', async ({ page }) => {
    // Step 1: Initial state - logo visible
    const logoButton = page.locator('.logo-button')
    const cardsContainer = page.locator('.card-dealer__cards')
    const contentView = page.locator('.card-dealer__content-view')

    await expect(logoButton).toBeVisible()
    await expect(cardsContainer).not.toBeVisible()
    await expect(contentView).not.toBeVisible()

    // Step 2: Click logo → cards appear
    await logoButton.click()
    await page.waitForTimeout(3500)

    await expect(logoButton).not.toBeVisible()
    await expect(cardsContainer).toBeVisible()
    await expect(contentView).not.toBeVisible()

    // Step 3: Click card → content appears
    const firstCard = page.locator('.menu-card').first()
    const cardTitle = firstCard.locator('.menu-card__title')
    const selectedTitle = await cardTitle.textContent()

    await firstCard.click()
    await page.waitForTimeout(1200)

    await expect(logoButton).not.toBeVisible()
    await expect(cardsContainer).not.toBeVisible()
    await expect(contentView).toBeVisible()

    // Verify content shows selected card title
    const contentPlaceholder = page.locator('.card-dealer__content-placeholder')
    const contentText = await contentPlaceholder.textContent()
    expect(contentText).toContain(selectedTitle)

    // Step 4: Click outside content → cards return
    const clickOverlay = page.locator('.card-dealer__click-overlay')
    const overlayBox = await clickOverlay.boundingBox()

    if (overlayBox) {
      await page.click('.card-dealer__click-overlay', { position: { x: 50, y: 50 } })
    } else {
      await clickOverlay.click()
    }

    await page.waitForTimeout(1200)

    await expect(logoButton).not.toBeVisible()
    await expect(cardsContainer).toBeVisible()
    await expect(contentView).not.toBeVisible()

    // Verify all three cards are back
    const cards = page.locator('.menu-card')
    expect(await cards.count()).toBe(3)

    // Step 5: Click outside cards → logo returns
    await clickOverlay.click()
    await page.waitForTimeout(3200)

    await expect(logoButton).toBeVisible()
    await expect(cardsContainer).not.toBeVisible()
    await expect(contentView).not.toBeVisible()
  })

  test('should handle multiple card clicks in sequence', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await page.waitForTimeout(3500)

    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()

    // Click each card and verify content changes
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i)
      const cardTitle = await card.locator('.menu-card__title').textContent()

      // Click card
      await card.click()
      await page.waitForTimeout(1200)

      // Verify content is shown with correct title
      const contentPlaceholder = page.locator('.card-dealer__content-placeholder')
      await expect(contentPlaceholder).toBeVisible()
      const contentText = await contentPlaceholder.textContent()
      expect(contentText).toContain(cardTitle)

      // Click overlay to return to cards
      const clickOverlay = page.locator('.card-dealer__click-overlay')
      await clickOverlay.click()
      await page.waitForTimeout(1200)

      // Verify back to cards view
      const cardsContainer = page.locator('.card-dealer__cards')
      await expect(cardsContainer).toBeVisible()
    }
  })

  test('should have proper z-index layering for click detection', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('.logo-button')
    await logoButton.click()
    await page.waitForTimeout(3500)

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
    await page.waitForTimeout(3500)

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
