// Read-only checks against production (playwright.prod.config.js).
// Never logs in and never clicks anything that writes.
import { test, expect } from '@playwright/test'

test('standings load', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible()
  await expect(page.locator('main ol > li').first()).toBeVisible({ timeout: 20_000 })
})

test('every tab loads without errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const [path, text] of [['/tonight', /Tonight|No session tonight/], ['/sessions', 'Sessions'], ['/rules', 'Every game you win']]) {
    await page.goto(path)
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 })
  }
  expect(errors).toEqual([])
})
