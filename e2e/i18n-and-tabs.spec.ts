import { expect, test } from '@playwright/test'

import { clickAndWaitForAnimations, waitForAnimations } from './helpers.js'

test.describe('Locale persistence and Tabs link', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/')
    await page.waitForLoadState('load')
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await page.waitForLoadState('load')
    await page.locator('[data-testid="card-dealer"]').waitFor({ state: 'attached', timeout: 10000 })
    await waitForAnimations(page)
  })

  test('persists the selected locale across refreshes', async ({ page }) => {
    await expect(page.getByTestId('language-switcher')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('language-current').click()
    await page.getByTestId('language-option-de').click()

    await page.waitForFunction(() => {
      return (
        document.cookie.includes('frisches_locale=de') &&
        window.localStorage.getItem('frisches:locale') === 'de'
      )
    })

    await page.reload()
    await page.waitForLoadState('load')
    await waitForAnimations(page)

    await page.getByTestId('language-current').click()
    await expect(page.getByTestId('language-option-de')).toHaveAttribute('aria-pressed', 'true')

    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')
    await expect(page.locator('.menu-card__title:has-text("Musik")')).toBeVisible({
      timeout: 10000,
    })
  })

  test('opens the Tabs button in a new Songsterr tab', async ({ page }) => {
    await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')

    await page.getByTestId('card-about').click()
    await waitForAnimations(page)

    const tabsButton = page.getByRole('button', { name: /^Tabs link$/i }).first()
    await expect(tabsButton).toBeVisible({ timeout: 10000 })

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      tabsButton.dispatchEvent('click'),
    ])

    await expect.poll(() => popup.url()).toContain('songsterr.com')
    await popup.close()
  })
})
