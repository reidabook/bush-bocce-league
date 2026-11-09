/**
 * May 11 — a real night, logged through the commissioner UI.
 *
 * Session 1 (3 teams, round robin):
 *   Team 1: Reid, Brandon H, Brandon L, George   (+ Colin arrives late, plays G2 only)
 *   Team 2: Sawyer, James, Jake, Nolan
 *   Team 3: Jonathan, Elan, Alex, Ty, Zach
 *   G1 Team 1 beats Team 2 (Team 3 sits out)
 *   G2 Team 1 beats Team 3 (Team 2 sits out)
 *   G3 Team 2 beats Team 3 (Team 1 sits out)
 * Session 2 (same date, teams re-formed):
 *   Team 4: Reid, Nolan, Jonathan, Brandon H, Zach
 *   Team 5: Sawyer, Ty, Jake, Brandon L, James, Alex
 *   G4 Team 4 beats Team 5
 */
import { test, expect } from '@playwright/test'
import { createStore, boot, playGame, addLateArrival, sitOut, closeSession, readStandings } from './support/app.js'
import { seedPlayers, seedSession } from './support/fakeBackend.js'

const NAMES = ['Reid', 'Brandon H', 'Brandon L', 'George', 'Colin', 'Sawyer', 'James', 'Jake', 'Nolan', 'Jonathan', 'Elan', 'Alex', 'Ty', 'Zach']

test('3-team round robin, late arrival and a same-date second session', async ({ page }) => {
  const store = createStore()
  const P = Object.fromEntries(seedPlayers(store, NAMES).map((p) => [p.name, p]))
  const pick = (...n) => n.map((x) => P[x])
  const s1 = seedSession(store, {
    number: 10, date: '2026-05-11', teams: [
      { name: 'Team 1', players: pick('Reid', 'Brandon H', 'Brandon L', 'George') },
      { name: 'Team 2', players: pick('Sawyer', 'James', 'Jake', 'Nolan') },
      { name: 'Team 3', players: pick('Jonathan', 'Elan', 'Alex', 'Ty', 'Zach') },
    ],
  })
  const s2 = seedSession(store, {
    number: 11, date: '2026-05-11', teams: [
      { name: 'Team 4', players: pick('Reid', 'Nolan', 'Jonathan', 'Brandon H', 'Zach') },
      { name: 'Team 5', players: pick('Sawyer', 'Ty', 'Jake', 'Brandon L', 'James', 'Alex') },
    ],
  })
  await boot(page, store, { admin: true })

  await page.goto(`/sessions/${s1.session.id}`)
  // With 3 teams, "+ Game" asks which two play; the third sits out.
  await playGame(page, 1, 'Team 1', ['Team 1', 'Team 2'])
  await addLateArrival(page, 'Team 1', 'Colin')
  await sitOut(page, 1, 'Colin') // Colin wasn't there for game 1
  await playGame(page, 2, 'Team 1', ['Team 1', 'Team 3'])
  await playGame(page, 3, 'Team 2', ['Team 2', 'Team 3'])
  await closeSession(page)

  await page.goto(`/sessions/${s2.session.id}`)
  await playGame(page, 1, 'Team 4')
  await closeSession(page)

  const rows = Object.fromEntries((await readStandings(page)).map((r) => [r.name, [r.pts, r.w, r.gp]]))
  expect(rows).toEqual({
    'Reid': [12, 3, 3],
    'Brandon H': [12, 3, 3],
    'Nolan': [9, 2, 3],
    'Brandon L': [9, 2, 3],
    'George': [8, 2, 2],
    'Sawyer': [6, 1, 3],
    'James': [6, 1, 3],
    'Jake': [6, 1, 3],
    'Jonathan': [6, 1, 3],
    'Zach': [6, 1, 3],
    'Colin': [4, 1, 1],
    'Alex': [3, 0, 3],
    'Ty': [3, 0, 3],
    'Elan': [2, 0, 2],
  })

  // Both same-date sessions are listed separately
  await page.goto('/sessions')
  await expect(page.getByRole('link', { name: /Session 10/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Session 11/ })).toBeVisible()
})

test('pending-game card names the team sitting out', async ({ page }) => {
  const store = createStore()
  const [a, b, c] = seedPlayers(store, ['Ann', 'Ben', 'Cal'])
  seedSession(store, { number: 1, date: '2026-05-11', teams: [{ name: 'Team 1', players: [a] }, { name: 'Team 2', players: [b] }, { name: 'Team 3', players: [c] }] })
  await boot(page, store, { admin: true })
  await page.goto('/tonight')
  await page.getByRole('button', { name: 'Game', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New game' })
  await expect(dialog.getByRole('button', { name: 'Add game' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Team 2', exact: true }).click()
  await dialog.getByRole('button', { name: 'Team 3', exact: true }).click()
  await dialog.getByRole('button', { name: 'Add game' }).click()
  await expect(page.getByText('Team 1 sits out')).toBeVisible()
})
