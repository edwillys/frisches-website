import type { Page } from '@playwright/test'

/**
 * Waits for all GSAP animations to complete by monitoring the data-animating attribute
 * on the card-dealer component.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when animations are complete
 */
export async function waitForAnimations(page: Page, timeout = 10000): Promise<void> {
  const cardDealer = page.locator('[data-testid="card-dealer"]')
  
  // Wait for the element to exist first
  await cardDealer.waitFor({ state: 'attached', timeout })

  // Try to wait for data-animating to be false with polling
  // IMPORTANT: waitForFunction signature is (fn, arg?, options?)
  // If we pass options as the 2nd argument, Playwright treats it as `arg` and
  // the timeout/polling are ignored (leading to CI-only 30s test timeouts).
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-testid="card-dealer"]')
      if (!element) return false
      const isAnimating = element.getAttribute('data-animating')
      return isAnimating === 'false' || isAnimating === null
    },
    null,
    { timeout, polling: 100 } // Poll every 100ms
  )
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
  
  await locator.click()
  await waitForAnimations(page, timeout)
}
