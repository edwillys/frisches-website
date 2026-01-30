import { test, expect, type Locator, type Page } from '@playwright/test'

async function clickRobust(locator: Locator, timeout = 5000) {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 2000 })
  } catch {
    // ignore
  }

  try {
    await locator.click({ timeout })
  } catch {
    await locator.click({ timeout })
  }
}

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function ensureTreeItemExpanded(page: Page, label: string) {
  const item = page.getByRole('treeitem', { name: new RegExp(`^${escapeRegexLiteral(label)}$`) })
  if ((await item.count()) === 0) return

  const treeItem = item.first()
  const expanded = await treeItem.getAttribute('aria-expanded')
  if (expanded === 'true') return

  const toggle = treeItem.locator('button').first()
  if ((await toggle.count()) === 0) return

  await clickRobust(toggle, 10000)
}

async function getTreeSelectCheckboxByLabel(page: Page, label: string): Promise<Locator> {
  await ensureTreeItemExpanded(page, 'Tags')
  await ensureTreeItemExpanded(page, 'Activity')

  const exactNode = page.getByRole('treeitem', {
    name: new RegExp(`^${escapeRegexLiteral(label)}$`, 'i'),
  })
  const node = ((await exactNode.count()) > 0
    ? exactNode.first()
    : page.getByRole('treeitem', { name: new RegExp(label, 'i') }).first())

  const checkbox = node.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible({ timeout: 15000 })
  return checkbox
}

async function toggleTreeSelectCheckboxByLabel(page: Page, label: string) {
  const checkbox = await getTreeSelectCheckboxByLabel(page, label)
  await clickRobust(checkbox, 15000)
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
    const search = page.getByRole('textbox', { name: /Search/i })
    await expect(search).toBeVisible()
    await search.fill('Show')

    await toggleTreeSelectCheckboxByLabel(page, 'Show')
    await page.keyboard.press('Escape')

    // Verify it's selected by re-opening and checking aria-checked.
    await clickRobust(treeSelect)
    await expect(page.getByRole('textbox', { name: /Search/i })).toBeVisible()
    await page.getByRole('textbox', { name: /Search/i }).fill('Show')
    const checkboxSelected = await getTreeSelectCheckboxByLabel(page, 'Show')
    await expect(checkboxSelected).toBeChecked()
    await page.keyboard.press('Escape')

    // Remove by unchecking inside the TreeSelect panel
    await clickRobust(treeSelect)
    await expect(page.getByRole('textbox', { name: /Search/i })).toBeVisible()
    await page.getByRole('textbox', { name: /Search/i }).fill('Show')
    await toggleTreeSelectCheckboxByLabel(page, 'Show')
    await page.keyboard.press('Escape')

    // Verify it's unselected.
    await clickRobust(treeSelect)
    await expect(page.getByRole('textbox', { name: /Search/i })).toBeVisible()
    await page.getByRole('textbox', { name: /Search/i }).fill('Show')
    const checkboxUnselected = await getTreeSelectCheckboxByLabel(page, 'Show')
    await expect(checkboxUnselected).not.toBeChecked()
    await page.keyboard.press('Escape')
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
