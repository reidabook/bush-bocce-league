// What everyone (not logged in) sees.
import { test, expect } from '@playwright/test'
import { createStore, boot, readStandings } from './support/app.js'
import { seedPlayers, seedSession } from './support/fakeBackend.js'

function league() {
  const store = createStore()
  const players = seedPlayers(store, ['Ann', 'Ben', 'Cal', 'Dee'])
  const stats = [[30, 6, 12], [30, 7, 9], [12, 2, 6], [0, 0, 0]] // pts, wins, games
  players.forEach((p, i) => store.historical_player_stats.push({ player_id: p.id, points: String(stats[i][0]), wins: String(stats[i][1]), games_played: String(stats[i][2]) }))
  return { store, players }
}

test('standings: tiebreak by win rate, sortable, leader marked', async ({ page }) => {
  const { store } = league()
  await boot(page, store)
  const rows = await readStandings(page)
  expect(rows.map((r) => r.name)).toEqual(['Ben', 'Ann', 'Cal', 'Dee']) // Ben's .778 beats Ann's .500
  await expect(page.getByRole('img', { name: /Leader/ })).toHaveCount(1)

  await page.getByRole('button', { name: 'Games' }).click()
  await expect(page.locator('main ol > li').first()).toContainText('Ann')
  await page.getByRole('button', { name: 'Games' }).click() // flips to ascending
  await expect(page.locator('main ol > li').first()).toContainText('Dee')
  await expect(page.getByRole('button', { name: 'Games ↑' })).toHaveAttribute('aria-pressed', 'true')
})

test('live session: card on home, red dot, read-only Tonight', async ({ page }) => {
  const { store, players: [a, b, c, d] } = league()
  seedSession(store, { number: 9, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a, b] }, { name: "Cal's Team", players: [c, d] }] })
  await boot(page, store)
  await page.goto('/')
  await expect(page.getByLabel('Session live')).toBeVisible()
  await page.getByRole('link', { name: /Tonight · Session 9/ }).click()
  await expect(page).toHaveURL(/\/tonight$/)
  await expect(page.getByRole('heading', { name: 'Tonight', exact: true })).toBeVisible()
  await expect(page.getByText("Tonight's points join the standings")).toBeVisible()
  // No commissioner controls
  await expect(page.getByRole('button', { name: 'Game', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Session options' })).toHaveCount(0)
  await expect(page.getByLabel('Tell the assistant what happened')).toHaveCount(0)
})

test('no live session: Tonight says so', async ({ page }) => {
  const { store } = league()
  await boot(page, store)
  await page.goto('/tonight')
  await expect(page.getByText('No session tonight')).toBeVisible()
  await expect(page.getByLabel('Session live')).toHaveCount(0)
})

test('tabs navigate; rules show scoring', async ({ page }) => {
  const { store } = league()
  await boot(page, store)
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'Sessions' }).click()
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
  await nav.getByRole('link', { name: 'Rules' }).click()
  await expect(page.getByText('Every game you win')).toBeVisible()
  await nav.getByRole('link', { name: 'Standings' }).click()
  await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible()
})

test('load errors offer a retry', async ({ page }) => {
  await page.route('**/api/sheets', (r) => r.fulfill({ status: 500, json: { error: 'Sheet "players" not found' } }))
  await page.goto('/')
  await expect(page.getByText("Couldn't load the league")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set up sheet tabs' })).toBeVisible()
})
