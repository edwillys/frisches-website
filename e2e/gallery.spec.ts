import { test, expect, type Locator } from '@playwright/test'

async function clickRobust(locator: Locator) {
  try {
    await locator.click({ timeout: 5000 })
  } catch {
    await locator.evaluate((el) => (el as HTMLElement).click())
  }
}

test.describe('Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')

    // Open the menu (LogoButton)
    const logoButton = page.getByRole('button', { name: /Frisches - Click to reveal menu/i })
    await clickRobust(logoButton)

    // Open Gallery card
    const galleryCard = page.locator('.card-dealer__card', { hasText: 'Gallery' }).first()
    await clickRobust(galleryCard)

    await expect(page.locator('[data-testid="gallery-manager"]')).toBeVisible()
  })

  test('rail labels show only when expanded', async ({ page }) => {
    const toggle = page.locator('[data-testid="gallery-rail-toggle"]')

    await clickRobust(toggle) // expand
    await expect(page.locator('.gallery-rail__label:has-text("Photos")')).toBeVisible()

    await clickRobust(toggle) // collapse
    await expect(page.locator('.gallery-rail__label:has-text("Photos")')).toBeHidden()
  })

  test('TreeSelect chips can be added and removed', async ({ page }) => {
    const treeSelect = page.locator('.filters-bar .p-treeselect').first()
    await clickRobust(treeSelect)

    // PrimeVue TreeSelect panel is teleported; wait for its search input.
    const search = page.getByRole('textbox', { name: 'Search' })
    await expect(search).toBeVisible()
    await search.fill('Show')

    // Ensure the Tags group is expanded so filtered results are reachable.
    const tagsRoot = page.getByRole('treeitem', { name: /^Tags$/ })
    const toggle = tagsRoot.locator('button').first()
    await clickRobust(toggle)

    const showNode = page.getByRole('treeitem', { name: /^Show$/ }).first()
    const checkbox = showNode.getByRole('checkbox').first()
    await clickRobust(checkbox)

    // Close the panel so it doesn't cover the chips row
    await page.keyboard.press('Escape')

    // Chip should appear in the TreeSelect input
    await expect(treeSelect).toContainText('Show')

    // Remove by unchecking inside the TreeSelect panel
    await clickRobust(treeSelect)
    await expect(page.getByRole('textbox', { name: 'Search' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Search' }).fill('Show')

    const showAgain = page.getByRole('treeitem', { name: /^Show$/ }).first()
    const checkboxAgain = showAgain.getByRole('checkbox').first()
    await clickRobust(checkboxAgain)
    await page.keyboard.press('Escape')

    await expect(treeSelect).not.toContainText('Show')
  })

  test('lightbox shows zoom controls and supports wheel zoom', async ({ page }) => {
    const firstItem = page.locator('.gallery-item').first()
    await clickRobust(firstItem)

    const lightbox = page.locator('.lightbox')
    await expect(lightbox).toBeVisible()

    const zoomLabel = page.locator('.lightbox-zoom')
    await expect(zoomLabel).toHaveText(/100%/) // default

    // Wheel up to zoom in
    await page.mouse.wheel(0, -250)
    await expect(zoomLabel).not.toHaveText('100%')

    // No metadata/tooltip should be present
    await expect(page.locator('.lightbox-tooltip')).toHaveCount(0)

    await clickRobust(page.locator('[data-testid="gallery-lightbox-close"]'))
    await expect(lightbox).toBeHidden()
  })
})
