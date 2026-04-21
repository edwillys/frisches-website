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
    try {
      // eslint-disable-next-line playwright/no-force-option -- intentional fallback after normal click fails
      await locator.click({ timeout, force: true })
    } catch {
      await locator.evaluate((el) => (el as HTMLElement).click())
    }
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
  const node =
    (await exactNode.count()) > 0
      ? exactNode.first()
      : page.getByRole('treeitem', { name: new RegExp(label, 'i') }).first()

  const checkbox = node.getByRole('checkbox').first()
  await expect(checkbox).toBeVisible({ timeout: 15000 })
  return checkbox
}

async function toggleTreeSelectCheckboxByLabel(page: Page, label: string) {
  const checkbox = await getTreeSelectCheckboxByLabel(page, label)
  await clickRobust(checkbox, 15000)
}

async function openTreeSelect(page: Page, treeSelect: Locator): Promise<Locator> {
  const search = page.getByRole('textbox', { name: /Search/i })

  if (!(await search.isVisible().catch(() => false))) {
    await clickRobust(treeSelect)
  }

  await expect(search).toBeVisible({ timeout: 10000 })
  return search
}

async function closeTreeSelect(page: Page) {
  const search = page.getByRole('textbox', { name: /Search/i })
  if (!(await search.isVisible().catch(() => false))) return

  await page.keyboard.press('Escape')
  await expect(search).toBeHidden({ timeout: 10000 })
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
    test.setTimeout(60000)

    const treeSelect = page.locator('.filters-bar .p-treeselect').first()

    // PrimeVue TreeSelect panel is teleported; wait for its search input.
    const search = await openTreeSelect(page, treeSelect)
    await search.fill('Show')

    await toggleTreeSelectCheckboxByLabel(page, 'Show')
    await closeTreeSelect(page)

    // Verify it's selected by re-opening and checking aria-checked.
    await (await openTreeSelect(page, treeSelect)).fill('Show')
    const checkboxSelected = await getTreeSelectCheckboxByLabel(page, 'Show')
    await expect(checkboxSelected).toBeChecked()
    await closeTreeSelect(page)

    // Remove by unchecking inside the TreeSelect panel
    await (await openTreeSelect(page, treeSelect)).fill('Show')
    await toggleTreeSelectCheckboxByLabel(page, 'Show')
    await closeTreeSelect(page)

    // Verify it's unselected.
    await (await openTreeSelect(page, treeSelect)).fill('Show')
    const checkboxUnselected = await getTreeSelectCheckboxByLabel(page, 'Show')
    await expect(checkboxUnselected).not.toBeChecked()
    await closeTreeSelect(page)
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
