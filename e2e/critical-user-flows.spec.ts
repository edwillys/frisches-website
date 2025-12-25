import { test, expect } from '@playwright/test'

test.describe('Frisches Website', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('domcontentloaded')
  })

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Frisches/)
  })

  test('card dealer component renders', async ({ page }) => {
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toHaveCount(1)
  })

  test('logo button is present', async ({ page }) => {
    const logoButton = page.locator('[data-testid="logo-button"]')
    await expect(logoButton).toHaveCount(1)
  })

  test('cards container exists', async ({ page }) => {
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toHaveCount(1)
  })

  test('can navigate to music content', async ({ page }) => {
    const musicCard = page.locator('[data-testid="card-music"]')
    await expect(musicCard).toHaveCount(1)
    await musicCard.click()
    const audioPlayer = page.locator('[data-testid="audio-player"]')
    await expect(audioPlayer).toHaveCount(1, { timeout: 5000 })
  })

  test('can navigate to about content', async ({ page }) => {
    const aboutCard = page.locator('[data-testid="card-about"]')
    await expect(aboutCard).toHaveCount(1)
    await aboutCard.click()
    const charSelection = page.locator('[data-testid="character-selection"]')
    await expect(charSelection).toHaveCount(1, { timeout: 5000 })
  })

  test('character cards render in about section', async ({ page }) => {
    const aboutCard = page.locator('[data-testid="card-about"]')
    await expect(aboutCard).toHaveCount(1)
    await aboutCard.click()
    const characters = page.locator('[data-testid="character-card"]')
    await expect(characters).toHaveCount(4, { timeout: 5000 })
  })

  test('page loads in reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000)
  })

  test('viewport works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toHaveCount(1)
  })

  test('viewport works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toHaveCount(1)
  })

  test('viewport works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toHaveCount(1)
  })
})
