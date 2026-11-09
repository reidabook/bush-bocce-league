// End-of-season bracket: seed from standings, play it out, crown a champion.
import { test, expect } from '@playwright/test'
import { createStore, boot } from './support/app.js'
import { seedPlayers } from './support/fakeBackend.js'

function seasonOf(names) {
  const store = createStore()
  const players = seedPlayers(store, names)
  players.forEach((p, i) => store.historical_player_stats.push({ player_id: p.id, points: String(100 - i * 10), wins: '0', games_played: '0' }))
  return store
}

async function pickWinner(page, name) {
  await page.getByRole('button', { name, exact: true }).click()
  await expect(page.getByText(`${name} advances`).or(page.getByText('League champion'))).toBeVisible()
}

test('4 players: seeds 1v4 and 2v3, winner of the final is champion', async ({ page }) => {
  const store = seasonOf(['Ann', 'Ben', 'Cal', 'Dee'])
  await boot(page, store, { admin: true })
  await page.goto('/admin/tournament')
  await expect(page.getByText('4 players')).toBeVisible()
  await page.getByRole('button', { name: 'Seed & start tournament' }).click()

  await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible()
  await expect(page.getByText(/TBD vs TBD — waiting on earlier games/)).toBeVisible()
  await pickWinner(page, 'Ann')
  await pickWinner(page, 'Cal')
  await pickWinner(page, 'Cal')
  await expect(page.getByText('League champion')).toBeVisible()
  expect(store.tournament_matches.filter((m) => m.round === '3')).toHaveLength(0) // no phantom round

  await page.getByRole('button', { name: 'Mark tournament complete' }).click()
  await expect(page.getByText('Complete', { exact: true })).toBeVisible()

  // Public view (no commissioner)
  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/tournament')
  await expect(page.getByText('Season complete')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Final' })).toBeVisible()
  await expect(page.locator('main').getByText('Cal').first()).toBeVisible()
  await expect(page.getByText('League champion')).toBeVisible()
})

test('5 players: top seeds get byes and the bracket can finish', async ({ page }) => {
  const store = seasonOf(['Ann', 'Ben', 'Cal', 'Dee', 'Eve'])
  await boot(page, store, { admin: true })
  await page.goto('/admin/tournament')
  await page.getByRole('button', { name: 'Seed & start tournament' }).click()

  await expect(page.getByText('— bye, advances')).toHaveCount(3)
  await pickWinner(page, 'Dee')   // 4 v 5
  await pickWinner(page, 'Ann')   // 1 v 4
  await pickWinner(page, 'Ben')   // 2 v 3
  await pickWinner(page, 'Ann')   // final
  await expect(page.getByText('League champion')).toBeVisible()
})

test('no tournament yet: public page explains, commissioner gets a set-up link', async ({ page }) => {
  const store = seasonOf(['Ann', 'Ben'])
  await boot(page, store, { admin: true })
  await page.goto('/tournament')
  await expect(page.getByText('Starts after the regular season')).toBeVisible()
  await page.getByRole('link', { name: 'Set up tournament' }).click()
  await expect(page).toHaveURL(/\/admin\/tournament$/)
})
