import { test, expect } from '@playwright/test';

// See here how to get started:
// https://playwright.dev/docs/intro
test('visits the app root url', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load')
  // Verify the app loaded by checking for the card dealer component
  await expect(page.locator('[data-testid="card-dealer"]')).toBeVisible({ timeout: 10000 });
  // Verify page title
  await expect(page).toHaveTitle(/Frisches/);
})
