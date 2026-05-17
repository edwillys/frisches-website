import { test, expect, type Locator, type Page } from '@playwright/test'
import { clickAndWaitForAnimations, waitForAnimations } from './helpers.js'

async function openStemsOverlayOnTojd(page: Page): Promise<Locator> {
  await page.goto('/')
  await page.waitForLoadState('load')
  await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
  await waitForAnimations(page)

  await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
  await page.locator('[data-testid="card-music"]').click()
  await waitForAnimations(page)

  await page.locator('[data-testid="album-carousel"]').waitFor({ state: 'visible', timeout: 15000 })

  await page.evaluate(() => {
    const probe = (
      window as Window & {
        __FRISCHES_E2E_AUDIO__?: {
          startFromMusic: (trackId: string) => void
        }
      }
    ).__FRISCHES_E2E_AUDIO__

    if (!probe || typeof probe.startFromMusic !== 'function') {
      throw new Error('Missing __FRISCHES_E2E_AUDIO__ startFromMusic probe')
    }

    probe.startFromMusic('tftc:02-tojd')
  })

  const stemsToggle = page.locator('[data-testid="mini-stems"]')
  await stemsToggle.waitFor({ state: 'visible', timeout: 15000 })
  await stemsToggle.click()

  const overlay = page.locator('[data-testid="stems-overlay"]')
  await overlay.waitFor({ state: 'visible', timeout: 15000 })

  const stemsEnableToggle = page.locator('[data-testid="stems-enable-toggle"]')
  await stemsEnableToggle.waitFor({ state: 'visible', timeout: 15000 })
  await expect(stemsEnableToggle).toBeEnabled()
  await stemsEnableToggle.click()

  return page.locator('[data-testid="stem-guitar-expand"]')
}

async function handleCenterX(handle: Locator): Promise<number> {
  const box = await handle.boundingBox()
  if (!box) throw new Error('Handle bounding box unavailable')
  return box.x + box.width / 2
}

test.describe('Stems drawer drag', () => {
  test('group drawer drag stays anchored while left-expanding UI still exposes close state', async ({
    page,
  }) => {
    const handle = await openStemsOverlayOnTojd(page)
    const drawerLabels = page.locator('[data-testid="stem-guitar-labels"]')
    await expect(handle).toBeVisible({ timeout: 15000 })
    await expect(handle).toHaveAttribute('aria-expanded', 'false')

    const box = await handle.boundingBox()
    expect(box, 'Handle bounding box unavailable before drag').not.toBeNull()

    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2
    const targetX = startX + 120

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(targetX, startY, { steps: 10 })
    await page.mouse.up()

    const currentHandleCenterX = await handleCenterX(handle)
    expect(Math.abs(currentHandleCenterX - startX)).toBeLessThanOrEqual(3)

    // Drag can intentionally suppress the next click, so retry once if needed.
    await handle.click()
    if ((await handle.getAttribute('aria-expanded')) !== 'true') {
      await handle.click()
    }

    await expect(handle).toHaveAttribute('aria-expanded', 'true')
    await expect(handle).toHaveAttribute('aria-label', 'Close stem group')
    await expect(drawerLabels).toBeVisible()

    const labelsBox = await drawerLabels.boundingBox()
    expect(labelsBox, 'Expanded group labels should have a bounding box').not.toBeNull()
    expect(labelsBox!.width).toBeGreaterThan(20)
  })
})
