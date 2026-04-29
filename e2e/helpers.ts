import type { Page } from '@playwright/test'

/**
 * Waits for all GSAP animations to complete by monitoring the data-animating attribute
 * on the card-dealer component.
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when animations are complete (or the wait times out).
 */
export async function waitForAnimations(page: Page, timeout = 10000): Promise<void> {
  const cardDealer = page.locator('[data-testid="card-dealer"]')

  // Wait for the element to exist first
  await cardDealer.waitFor({ state: 'attached', timeout })

  const startTime = Date.now()

  try {
    while (Date.now() - startTime < timeout) {
      if (page.isClosed()) return

      const isSettled = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="card-dealer"]')
        if (!element) return false
        const isAnimating = element.getAttribute('data-animating')
        return isAnimating === 'false' || isAnimating === null
      })

      if (isSettled) return
      await page.waitForTimeout(100)
    }

    throw new Error(`Timed out after ${timeout}ms waiting for card-dealer animations`)
  } catch (error) {
    // In some browsers/environments, the attribute can occasionally get stuck even though
    // the UI is usable. Treat this as a best-effort wait and continue, but log state to
    // make genuine deadlocks diagnosable.
    console.warn('waitForAnimations timed out; continuing.', error)

    if (page.isClosed()) return
    try {
      const state = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="card-dealer"]')
        return {
          exists: Boolean(el),
          dataAnimating: el?.getAttribute('data-animating'),
          classAnimating: el?.classList.contains('is-animating') ?? false,
        }
      })
      console.warn(
        `waitForAnimations state: exists=${state.exists}, data-animating=${String(
          state.dataAnimating
        )}, class.is-animating=${state.classAnimating}`
      )
    } catch {
      // ignore
    }

    // Small settle time helps with actionability right after animations.
    await page.waitForTimeout(250)
  }
}

/**
 * Clicks an element and waits for animations to complete.
 * Useful for interactions that trigger GSAP animations.
 *
 * @param page - Playwright page object
 * @param selector - CSS selector or data-testid for the element to click
 * @param timeout - Maximum time to wait for animations (default: 10000)
 */
export async function clickAndWaitForAnimations(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  const locator = selector.startsWith('[data-testid')
    ? page.locator(selector)
    : page.locator(`[data-testid="${selector}"]`)

  try {
    await locator.click({ timeout: 5000 })
  } catch {
    await locator.evaluate((el) => (el as HTMLElement).click())
  }
  await waitForAnimations(page, timeout)
}

/**
 * Waits until mini-player wobble visual is initialized and active state is known.
 */
export async function waitForMiniPlayerWobbleState(page: Page, timeout = 5000): Promise<void> {
  const visual = page.locator('[data-testid="mini-progress-visual"]')
  await visual.waitFor({ state: 'attached', timeout })

  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="mini-progress-visual"]')
      if (!el) return false
      const active = el.getAttribute('data-wobble-active')
      const ready = el.getAttribute('data-wobble-ready')
      return (active === 'false' && ready === 'true') || (active === 'true' && ready === 'true')
    },
    null,
    { timeout, polling: 100 }
  )
}
