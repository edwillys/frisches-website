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

  await page.evaluate(async () => {
    const { useAudioStore } = await import('/src/stores/audio.ts')
    const store = useAudioStore()
    store.startFromMusic('tftc:02-tojd')
  })

  const stemsToggle = page.locator('[data-testid="mini-stems"]')
  await stemsToggle.waitFor({ state: 'visible', timeout: 15000 })
  await stemsToggle.click()

  const overlay = page.locator('[data-testid="stems-overlay"]')
  await overlay.waitFor({ state: 'visible', timeout: 15000 })

  const stemsEnableToggle = page.locator('[data-testid="stems-enable-toggle"]')
  await stemsEnableToggle.waitFor({ state: 'visible', timeout: 15000 })
  if (await stemsEnableToggle.isEnabled()) {
    await stemsEnableToggle.click()
  }

  return page.locator('[data-testid="stem-guitar-expand"]')
}

async function handleCenterX(handle: Locator): Promise<number> {
  const box = await handle.boundingBox()
  if (!box) throw new Error('Handle bounding box unavailable')
  return box.x + box.width / 2
}

test.describe('Stems drawer drag', () => {
  test('group drawer handle follows the cursor while dragging open', async ({ page }) => {
    const handle = await openStemsOverlayOnTojd(page)
    await expect(handle).toBeVisible({ timeout: 15000 })

    const box = await handle.boundingBox()
    if (!box) throw new Error('Handle bounding box unavailable before drag')

    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    const targetX = startX + 36

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(targetX, startY, { steps: 10 })

    const currentHandleCenterX = await handleCenterX(handle)
    expect(Math.abs(currentHandleCenterX - targetX)).toBeLessThanOrEqual(3)

    await page.mouse.up()
  })
})
