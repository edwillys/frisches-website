import { test, expect } from '@playwright/test'
import { waitForAnimations, clickAndWaitForAnimations } from './helpers.js'

/**
 * End-to-End Integration Test: Extended User Flows
 * 
 * Tests advanced user journeys and edge cases beyond critical flows.
 * This complements critical-user-flows.spec.ts with more detailed scenarios.
 */

test.describe('Frisches Website - Extended User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await waitForAnimations(page)
  })

  test('initial load state verification', async ({ page }) => {
    // Logo should be visible
    const logoButton = page.locator('.card-dealer__logo-button-wrapper')
    await expect(logoButton).toBeVisible()

    // Logo button should be enabled
    const logoElement = page.locator('.logo-button')
    await expect(logoElement).toBeEnabled()

    // Cards should NOT be visible initially
    await expect(page.locator('.card-dealer__cards')).toBeHidden()
  })

  test('cards display with correct titles', async ({ page }) => {
    // Reveal cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')

    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Verify all three cards with correct titles
    const musicCard = page.locator('.menu-card__title:has-text("Music")')
    const aboutCard = page.locator('.menu-card__title:has-text("About")')
    const galeryCard = page.locator('.menu-card__title:has-text("Galery")')

    await expect(musicCard).toBeVisible()
    await expect(aboutCard).toBeVisible()
    await expect(galeryCard).toBeVisible()

    // Logo should be hidden after cards appear
    const logoButton = page.locator('.logo-button')
    await expect(logoButton).toBeHidden()
  })

  test('music card shows audio player', async ({ page }) => {
    // Navigate to music
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const musicCard = page.locator('[data-testid="card-music"]')
    await musicCard.click()
    await waitForAnimations(page)

    // Verify audio player in content view
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible({ timeout: 5000 })

    const audioPlayer = page.locator('[data-testid="audio-player"]')
    await expect(audioPlayer).toBeVisible({ timeout: 10000 })
  })

  test('clicking outside cards returns to logo', async ({ page }) => {
    const logoButton = page.locator('[data-testid="logo-button"]')
    
    // Navigate to cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Click outside to return
    await page.mouse.click(100, 100)
    await waitForAnimations(page)
    
    // Logo should reappear
    await expect(logoButton).toBeVisible({ timeout: 15000 })
    await expect(logoButton).toBeEnabled()
  })

  test('back button functionality in content view', async ({ page }) => {
    // Navigate to content
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    await waitForAnimations(page)
    
    const contentView = page.locator('.card-dealer__content-view')
    await expect(contentView).toBeVisible({ timeout: 5000 })

    // Wait for back button to be visible and enabled
    const backButton = page.locator('.card-dealer__back-button').first()
    await expect(backButton).toBeVisible({ timeout: 10000 })
    await backButton.click()
    await waitForAnimations(page)

    // Should return to cards
    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // All cards should still be present
    const cards = page.locator('.menu-card')
    expect(await cards.count()).toBe(3)
  })

  test('responsive card layout properties', async ({ page }) => {
    // Reveal cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')

    const cardsContainer = page.locator('.card-dealer__cards')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Verify flex layout
    const display = await cardsContainer.evaluate((el) => {
      return window.getComputedStyle(el).display
    })
    expect(display).toBe('flex')

    // Verify no wrapping
    const flexWrap = await cardsContainer.evaluate((el) => {
      return window.getComputedStyle(el).flexWrap
    })
    expect(flexWrap).toBe('nowrap')
  })
})
