import { test, expect } from '@playwright/test'

test.describe('Frisches Website', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    // Wait for the card dealer component to be ready
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
  })

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Frisches/)
  })

  test('card dealer component renders', async ({ page }) => {
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toBeVisible({ timeout: 10000 })
  })

  test('logo button is present', async ({ page }) => {
    const logoButton = page.locator('[data-testid="logo-button"]')
    await expect(logoButton).toBeVisible({ timeout: 10000 })
  })

  test('cards container exists', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('[data-testid="logo-button"]')
    await logoButton.click()
    // Now check if cards container is visible
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to music content', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('[data-testid="logo-button"]')
    await logoButton.click()
    // Wait for cards container to be visible
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
    // Wait for and click music card
    const musicCard = page.locator('[data-testid="card-/music"]')
    await expect(musicCard).toBeVisible({ timeout: 10000 })
    await musicCard.click()
    const audioPlayer = page.locator('[data-testid="audio-player"]')
    await expect(audioPlayer).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to about content', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('[data-testid="logo-button"]')
    await logoButton.click()
    // Wait for cards container to be visible
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000) // Wait for animation to complete
    // Wait for and click about card
    const aboutCard = page.locator('[data-testid="card-/about"]')
    await expect(aboutCard).toBeVisible({ timeout: 10000 })
    await aboutCard.click()
    const charSelection = page.locator('[data-testid="character-selection"]')
    await expect(charSelection).toBeVisible({ timeout: 20000 })
  })

  test('character cards render in about section', async ({ page }) => {
    // Click logo to reveal cards
    const logoButton = page.locator('[data-testid="logo-button"]')
    await logoButton.click()
    // Wait for cards container to be visible
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Necessary to wait for GSAP animation
    await page.waitForTimeout(2000) // Wait for animation to complete
    // Wait for and click about card
    const aboutCard = page.locator('[data-testid="card-/about"]')
    await expect(aboutCard).toBeVisible({ timeout: 10000 })
    await aboutCard.click()
    const characters = page.locator('[data-testid="character-card"]')
    await expect(characters).toHaveCount(4, { timeout: 20000 })
  })

  test('page loads in reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('load')
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000)
  })

  test('viewport works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toBeVisible({ timeout: 10000 })
  })

  test('viewport works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toBeVisible({ timeout: 10000 })
  })

  test('viewport works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toBeVisible({ timeout: 10000 })
  })
})
