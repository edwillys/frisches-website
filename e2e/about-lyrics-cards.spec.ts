import { expect, test } from '@playwright/test'

import { clickAndWaitForAnimations, waitForAboutSectionAnimation } from './helpers'

async function openLyricsCard(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript(() => {
    window.localStorage.setItem('frisches:show-chords', 'false')
  })

  await page.goto('/')

  await clickAndWaitForAnimations(page, '[data-testid="logo-button"]')

  const aboutCard = page.locator('[data-testid="card-about"]')
  await aboutCard.click()
  await waitForAboutSectionAnimation(page, 'about-view')

  const lyricsButton = page.getByRole('button', { name: 'Lyrics cards' })
  await expect(lyricsButton).toBeVisible({ timeout: 15000 })
  await lyricsButton.dispatchEvent('click')
  await waitForAboutSectionAnimation(page, 'lyrics-cards-view')

  const chordTrack = page.getByRole('button', { name: 'Witch Hunting' })
  await expect(chordTrack).toBeVisible({ timeout: 10000 })
  await chordTrack.click()

  const toggle = page.locator('[data-testid="lyrics-card-chords-toggle"]')
  await expect(toggle).toBeVisible({ timeout: 15000 })
}

async function getCardX(page: Parameters<typeof test>[0]['page']) {
  const card = page.locator('.lyrics-flip-card')
  await expect(card).toBeVisible()
  const box = await card.boundingBox()
  expect(box).not.toBeNull()
  return box!.x
}

async function waitForRailFlipIn(page: Parameters<typeof test>[0]['page']) {
  const railCard = page.locator('[data-testid="lyrics-chord-rail-card"]')
  await expect(railCard).toBeVisible({ timeout: 10000 })
  await expect(railCard).toHaveClass(/lyrics-chord-rail-card--flipped/, { timeout: 10000 })
  await expect(page.locator('[data-testid="lyrics-card-chords-rail"]')).toBeVisible({
    timeout: 10000,
  })
  return railCard
}

test.describe('about lyrics cards', () => {
  test('switching to a non-chord song does not keep showing the compact chord card', async ({
    page,
  }) => {
    await openLyricsCard(page)

    const toggle = page.locator('[data-testid="lyrics-card-chords-toggle"]')

    await toggle.click()
    const railCard = await waitForRailFlipIn(page)

    await page.locator('.lyrics-flip-card').dispatchEvent('keydown', { key: 'Escape' })

    const nonChordTrack = page.getByRole('button', { name: 'Misled' })
    await expect(nonChordTrack).toBeVisible({ timeout: 10000 })
    await nonChordTrack.click()

    await expect(page.locator('[data-testid="lyrics-card-chords-toggle"]')).toBeHidden({
      timeout: 10000,
    })
    await expect(railCard).toBeHidden({ timeout: 10000 })
  })

  test('desktop toggle keeps the lyrics card stationary', async ({ page }) => {
    await openLyricsCard(page)

    const toggle = page.locator('[data-testid="lyrics-card-chords-toggle"]')
    const collapse = page.locator('[data-testid="lyrics-card-chords-collapse"]')

    const initialX = await getCardX(page)

    await toggle.click()
    await waitForRailFlipIn(page)
    expect(Math.abs((await getCardX(page)) - initialX)).toBeLessThanOrEqual(1)

    await collapse.click()
    await expect(page.locator('[data-testid="lyrics-chord-rail-card"]')).toBeHidden({
      timeout: 10000,
    })
    expect(Math.abs((await getCardX(page)) - initialX)).toBeLessThanOrEqual(1)

    await collapse.click()
    await waitForRailFlipIn(page)
    expect(Math.abs((await getCardX(page)) - initialX)).toBeLessThanOrEqual(1)

    await toggle.click()
    await expect(page.locator('[data-testid="lyrics-chord-rail-card"]')).toBeHidden({
      timeout: 10000,
    })
    expect(Math.abs((await getCardX(page)) - initialX)).toBeLessThanOrEqual(1)
  })

  test('mobile keeps both cards reachable without cutting off the lyrics card', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openLyricsCard(page)

    const stage = page.locator('[data-testid="lyrics-cards-carousel"]')
    const toggle = page.locator('[data-testid="lyrics-card-chords-toggle"]')

    const initialX = await getCardX(page)

    await toggle.click()
    const railCard = await waitForRailFlipIn(page)
    expect(Math.abs((await getCardX(page)) - initialX)).toBeLessThanOrEqual(1)

    await railCard.scrollIntoViewIfNeeded()
    await expect(railCard).toBeInViewport()

    await page.locator('.lyrics-flip-card').scrollIntoViewIfNeeded()
    await expect(page.locator('.lyrics-flip-card')).toBeInViewport()

    const metrics = await stage.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))

    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)
  })
})
