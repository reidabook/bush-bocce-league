// Page helpers for the e2e suite. They drive the UI the way a person would:
// accessible names, visible text, no CSS selectors for actions.
import { expect } from '@playwright/test'
import { createStore, installFakeBackend } from './fakeBackend.js'

export { createStore }

export async function boot(page, store, { admin = false } = {}) {
  await installFakeBackend(page, store)
  if (admin) await page.addInitScript(() => sessionStorage.setItem('blb_admin', 'true'))
  page.on('dialog', (d) => d.accept()) // confirm() prompts: always "OK"
}

// On a Session screen with 2 teams: "+ Game" adds immediately.
// With 3+ teams pass the two short team names to pick in the sheet.
export async function addGame(page, number, pick) {
  await page.getByRole('button', { name: 'Game', exact: true }).click()
  if (pick) {
    const dialog = page.getByRole('dialog', { name: 'New game' })
    for (const t of pick) await dialog.getByRole('button', { name: t, exact: true }).click()
    await dialog.getByRole('button', { name: 'Add game' }).click()
    await expect(dialog).toBeHidden()
  }
  await expect(page.getByText(`Game ${number} · Who won?`)).toBeVisible()
}

// Tap the winning team on the pending-game card.
export async function recordWinner(page, team, number) {
  await page.getByRole('button', { name: team, exact: true }).click()
  await expect(page.getByText(`${team} won game ${number}.`)).toBeVisible()
}

export async function playGame(page, number, winner, pick) {
  await addGame(page, number, pick)
  await recordWinner(page, winner, number)
}

async function teamsSheet(page) {
  await page.getByRole('button', { name: /Teams & who left early/ }).click()
  return page.getByRole('dialog', { name: 'Teams & who left' })
}

export async function leftEarly(page, name) {
  const dialog = await teamsSheet(page)
  const row = dialog.locator('li').filter({ hasText: new RegExp(`^${name}`) })
  await row.getByRole('button', { name: 'Left early' }).click()
  await expect(row.getByRole('button', { name: 'Undo' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
}

export async function addLateArrival(page, teamName, name) {
  const dialog = await teamsSheet(page)
  const card = dialog.locator('div.bg-card').filter({ hasText: teamName })
  await card.getByRole('button', { name: 'Add late arrival' }).click()
  await card.getByRole('button', { name, exact: true }).click()
  await expect(card.locator('li').filter({ hasText: new RegExp(`^${name}`) })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
}

// Mark a player as sat-out for an already-decided game via its edit sheet.
export async function sitOut(page, gameNumber, name) {
  await page.getByRole('button', { name: `Edit game ${gameNumber}` }).click()
  const dialog = page.getByRole('dialog', { name: `Game ${gameNumber}` })
  await dialog.getByRole('button', { name, exact: true }).click()
  await expect(dialog.getByRole('button', { name: `${name} — sat out, tap to restore` })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
}

export async function closeSession(page) {
  await page.getByRole('button', { name: 'Session options' }).click()
  await page.getByRole('button', { name: 'Close session' }).click()
  await expect(page.getByRole('button', { name: 'Game', exact: true })).toHaveCount(0)
}

// Standings rows as shown on the home page (default sort: points).
export async function readStandings(page) {
  await page.goto('/')
  const rows = page.locator('main ol > li')
  await expect(rows.first()).toBeVisible()
  const out = []
  for (const row of await rows.all()) {
    const name = (await row.locator('span.truncate').innerText()).trim()
    const pts = parseInt(await row.locator('span.font-display').last().innerText())
    const sub = await row.locator('div.text-muted').innerText()
    const [, w, gp] = sub.match(/(\d+)W · (\d+) games/)
    out.push({ name, pts, w: +w, gp: +gp })
  }
  return out
}
