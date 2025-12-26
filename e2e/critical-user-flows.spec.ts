import { test, expect } from '@playwright/test'
import { waitForAnimations, clickAndWaitForAnimations } from './helpers.js'

test.describe('Frisches Website - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    // Wait for the card dealer component to be ready
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
    // Ensure initial page load animations complete
    await waitForAnimations(page)
  })

  test('page loads with correct title and components', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Frisches/)
    
    // Check main components
    const cardDealer = page.locator('[data-testid="card-dealer"]')
    await expect(cardDealer).toBeVisible({ timeout: 10000 })
    
    const logoButton = page.locator('[data-testid="logo-button"]')
    await expect(logoButton).toBeVisible({ timeout: 10000 })
  })

  test('logo reveals cards with animations', async ({ page }) => {
    const logoButton = page.locator('[data-testid="logo-button"]')
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    
    // Initial state: cards hidden
    await expect(cardsContainer).toBeHidden()
    
    // Click logo and wait for animation
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    // Cards should be visible
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
    
    // All three cards should be present
    const musicCard = page.locator('[data-testid="card-/music"]')
    const aboutCard = page.locator('[data-testid="card-/about"]')
    const tourCard = page.locator('[data-testid="card-/tour"]')
    
    await expect(musicCard).toBeVisible({ timeout: 10000 })
    await expect(aboutCard).toBeVisible({ timeout: 10000 })
    await expect(tourCard).toBeVisible({ timeout: 10000 })
    
    // Logo should be hidden
    await expect(logoButton).toBeHidden()
  })

  test('navigates to music content and back', async ({ page }) => {
    // Navigate to cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
    
    // Click music card
    const musicCard = page.locator('[data-testid="card-/music"]')
    await expect(musicCard).toBeVisible({ timeout: 10000 })
    await musicCard.click()
    await waitForAnimations(page)
    
    // Verify music content - wait for AudioPlayer internal elements to render
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="album-rail-toggle"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="album-title"]')).toBeVisible({ timeout: 10000 })

    // Regression guard: album hero cover should be visible
    await expect(page.locator('[data-testid="album-hero-cover"]')).toBeVisible({ timeout: 10000 })
    
    // Click back button
    const backButton = page.locator('.card-dealer__back-button').first()
    await backButton.click()
    await waitForAnimations(page)
    
    // Should be back to cards
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
  })

  test('audio files load correctly', async ({ page }) => {
    // Navigate to music section
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const musicCard = page.locator('[data-testid="card-/music"]')
    await musicCard.click()
    await waitForAnimations(page)
    
    // Wait for AudioPlayer and its internal elements to be fully rendered
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="album-rail-toggle"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="album-title"]')).toBeVisible({ timeout: 10000 })

    // Start playback via an explicit user gesture
    const playButton = page.locator('[data-testid="btn-play-album"]')
    await expect(playButton).toBeVisible({ timeout: 10000 })
    await playButton.click()
    await expect(page.locator('[data-testid="audio-mini-player"]')).toBeVisible({ timeout: 10000 })
    
    // Wait for audio element to exist and load metadata
    const hasLoadedAudio = await page.evaluate(async () => {
      const audio = document.querySelector('audio')
      if (!audio) return false
      
      // If already loaded, return true
      if (audio.readyState >= 2) return true
      
      // Otherwise wait for loadedmetadata event
      return new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => resolve(true), { once: true })
        audio.addEventListener('error', () => resolve(false), { once: true })
        // Timeout after 10 seconds
        setTimeout(() => resolve(false), 10000)
      })
    })
    
    // This will fail if Git LFS files aren't pulled (audio will be a pointer file)
    expect(hasLoadedAudio).toBe(true)
  })

  test('3D character models load correctly', async ({ page }) => {
    // Navigate to about section
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const aboutCard = page.locator('[data-testid="card-/about"]')
    await aboutCard.click()
    await waitForAnimations(page)
    
    const charSelection = page.locator('[data-testid="character-selection"]')
    await expect(charSelection).toBeVisible({ timeout: 20000 })
    
    // Wait for loading spinner to disappear (means model loaded successfully)
    // This will fail if Git LFS files aren't pulled (.glb will be a pointer file and fail to load)
    const loadingSpinner = charSelection.locator('.character-selection__loading')
    await expect(loadingSpinner).toBeHidden({ timeout: 20000 })
    
    // Verify the 3D GLTF canvas exists (indicates WebGL rendered the model successfully)
    const canvas = page.locator('[data-testid="gltf-canvas"]')
    await expect(canvas).toBeVisible({ timeout: 5000 })
  })

  test('navigates to about content with character selection', async ({ page }) => {
    // Navigate to cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    
    const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
    await expect(cardsContainer).toBeVisible({ timeout: 10000 })
    
    // Click about card
    const aboutCard = page.locator('[data-testid="card-/about"]')
    await expect(aboutCard).toBeVisible({ timeout: 10000 })
    await aboutCard.click()
    await waitForAnimations(page)
    
    // Verify character selection with 4 cards
    const charSelection = page.locator('[data-testid="character-selection"]')
    await expect(charSelection).toBeVisible({ timeout: 20000 })
    
    const characters = page.locator('[data-testid="character-card"]')
    await expect(characters).toHaveCount(4, { timeout: 20000 })
  })

  test('complete navigation cycle: logo → cards → content → cards → logo', async ({ page }) => {
    const logoButton = page.locator('[data-testid="logo-button"]')
    const cardsContainer = page.locator('.card-dealer__cards')
    const contentView = page.locator('.card-dealer__content-view')

    // Step 1: Logo → Cards
    await expect(logoButton).toBeVisible()
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Step 2: Cards → Content
    const firstCard = page.locator('.menu-card').first()
    await firstCard.click()
    await waitForAnimations(page)
    await expect(contentView).toBeVisible({ timeout: 5000 })

    // Step 3: Content → Cards
    const backButton = page.locator('.card-dealer__back-button').first()
    await backButton.click()
    await waitForAnimations(page)
    await expect(cardsContainer).toBeVisible({ timeout: 5000 })

    // Verify all three cards are present
    const cards = page.locator('.menu-card')
    expect(await cards.count()).toBe(3)

    // Step 4: Cards → Logo (click outside)
    await page.mouse.click(100, 100)
    await waitForAnimations(page)
    await expect(logoButton).toBeVisible({ timeout: 15000 })
  })

  test('handles all three cards sequentially', async ({ page }) => {
    // Navigate to cards
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })

    const cards = page.locator('.menu-card')
    const cardCount = await cards.count()

    // Click each card and return - with generous timeouts for sequential animations
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i)
      
      // Navigate to content
      await card.click()
      await waitForAnimations(page, 30000) // Increased timeout for complex animations
      const contentView = page.locator('.card-dealer__content-view')
      await expect(contentView).toBeVisible({ timeout: 5000 })

      // Navigate back
      const backButton = page.locator('.card-dealer__back-button').first()
      await backButton.click()
      await waitForAnimations(page, 30000) // Increased timeout
      await expect(page.locator('.card-dealer__cards')).toBeVisible({ timeout: 5000 })
    }
  })

  test('page loads in reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('load')
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000)
  })

  test('responsive design works across viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Verify card dealer is visible at this viewport
      const cardDealer = page.locator('[data-testid="card-dealer"]')
      await expect(cardDealer).toBeVisible({ timeout: 10000 })
      
      // Test basic interaction at this viewport
      await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
      const cardsContainer = page.locator('[data-testid="card-dealer-cards-container"]')
      await expect(cardsContainer).toBeVisible({ timeout: 10000 })
      
      // Return to logo for next iteration
      await page.mouse.click(100, 100)
      await waitForAnimations(page)
    }
  })
})

