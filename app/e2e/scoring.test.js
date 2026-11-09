/**
 * Scoring, departures and standings, driven through the commissioner UI.
 * (Same scenario as the old test_data.xlsx suite.)
 *
 *   Session 1: Red=[P1,P2,P3]  Blue=[P4,P5,P6]
 *     G1 Red wins → P1 leaves · G2 Red wins → P2 leaves · G3 Blue wins
 *   Session 2: Red=[P2,P4,P6]  Blue=[P1,P3,P5]
 *     G1 Red wins → P2 leaves · G2 Red wins → P4 leaves · G3 Blue wins
 *
 * Expected standings (pts / wins / games):
 *   P3 15/3/6 · P6 15/3/6 · P4 14/3/5 · P2 12/3/3 · P5 12/2/6 · P1 10/2/4
 */
import { test, expect } from '@playwright/test'
import { createStore, boot, playGame, leftEarly, closeSession, readStandings } from './support/app.js'
import { seedPlayers, seedSession } from './support/fakeBackend.js'

test('two sessions with early departures produce the right standings', async ({ page }) => {
  const store = createStore()
  const [p1, p2, p3, p4, p5, p6] = seedPlayers(store, ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'])
  const s1 = seedSession(store, { number: 1, date: '2026-01-07', teams: [{ name: 'Red Team', players: [p1, p2, p3] }, { name: 'Blue Team', players: [p4, p5, p6] }] })
  const s2 = seedSession(store, { number: 2, date: '2026-01-14', teams: [{ name: 'Red Team', players: [p2, p4, p6] }, { name: 'Blue Team', players: [p1, p3, p5] }] })
  await boot(page, store, { admin: true })

  await page.goto(`/sessions/${s1.session.id}`)
  await playGame(page, 1, 'Red')
  await leftEarly(page, 'Player 1')
  await playGame(page, 2, 'Red')
  await leftEarly(page, 'Player 2')
  await playGame(page, 3, 'Blue')
  await closeSession(page)

  // Left-early labels on the finished session
  await expect(page.getByText('left after Game 1')).toBeVisible()
  await expect(page.getByText('left after Game 2')).toBeVisible()

  await page.goto(`/sessions/${s2.session.id}`)
  await playGame(page, 1, 'Red')
  await leftEarly(page, 'Player 2')
  await playGame(page, 2, 'Red')
  await leftEarly(page, 'Player 4')
  await playGame(page, 3, 'Blue')
  await closeSession(page)

  expect(await readStandings(page)).toEqual([
    { name: 'Player 3', pts: 15, w: 3, gp: 6 },
    { name: 'Player 6', pts: 15, w: 3, gp: 6 },
    { name: 'Player 4', pts: 14, w: 3, gp: 5 },
    { name: 'Player 2', pts: 12, w: 3, gp: 3 },
    { name: 'Player 5', pts: 12, w: 2, gp: 6 },
    { name: 'Player 1', pts: 10, w: 2, gp: 4 },
  ])
})

test('tonight\'s points show on the team cards before the session closes', async ({ page }) => {
  const store = createStore()
  const [a, b, c, d] = seedPlayers(store, ['Ann', 'Ben', 'Cal', 'Dee'])
  seedSession(store, { number: 1, date: '2026-01-07', teams: [{ name: "Ann's Team", players: [a, b] }, { name: "Cal's Team", players: [c, d] }] })
  await boot(page, store, { admin: true })

  await page.goto('/tonight')
  await playGame(page, 1, "Ann's")
  const card = (team) => page.locator('main div.bg-card').filter({ hasText: team }).first()
  await expect(card("Ann's")).toContainText(/Ann\s*4/)
  await expect(card("Cal's")).toContainText(/Cal\s*1/)

  // Not in the standings until the session closes
  const before = await readStandings(page)
  expect(before.every((r) => r.pts === 0)).toBe(true)
})
