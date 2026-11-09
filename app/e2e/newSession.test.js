// New session flow: who's here → teams → Tonight.
import { test, expect } from '@playwright/test'
import { createStore, boot } from './support/app.js'
import { seedPlayers } from './support/fakeBackend.js'

function storeWithStandings() {
  const store = createStore()
  const players = seedPlayers(store, ['Ann', 'Ben', 'Cal', 'Dee', 'Eve'])
  // Season points 40/30/20/10 (Eve has none) for the snake draft.
  ;[40, 30, 20, 10].forEach((pts, i) => store.historical_player_stats.push({ player_id: players[i].id, points: String(pts), wins: '0', games_played: '0' }))
  return { store, players }
}

const teamRoster = (store) => store.teams.map((t) => ({
  name: t.name,
  players: store.team_players.filter((tp) => tp.team_id === t.id).map((tp) => store.players.find((p) => p.id === tp.player_id).name).sort(),
}))

test('snake draft balances by standings and starts the session', async ({ page }) => {
  const { store } = storeWithStandings()
  await boot(page, store, { admin: true })
  await page.goto('/admin/sessions/new')

  await expect(page.getByText('5 of 5 playing')).toBeVisible()
  await page.getByRole('checkbox', { name: /Eve/ }).click()
  await expect(page.getByText('4 of 5 playing')).toBeVisible()
  await page.getByRole('button', { name: 'Snake draft' }).click()
  await page.getByRole('button', { name: 'Make 2 teams →' }).click()

  // Picks 1,2,2,1 → Ann+Dee vs Ben+Cal
  await expect(page.getByRole('heading', { name: "Ann's Team" })).toBeVisible()
  await expect(page.getByRole('heading', { name: "Ben's Team" })).toBeVisible()
  await page.getByRole('button', { name: 'Lock teams & start' }).click()

  await expect(page).toHaveURL(/\/tonight$/)
  await expect(page.getByRole('heading', { name: 'Tonight', exact: true })).toBeVisible()
  expect(store.sessions).toHaveLength(1)
  expect(store.sessions[0]).toMatchObject({ status: 'active', session_number: '1' })
  expect(teamRoster(store)).toEqual([
    { name: "Ann's Team", players: ['Ann', 'Dee'] },
    { name: "Ben's Team", players: ['Ben', 'Cal'] },
  ])
  expect(store.week_attendees.map((a) => a.player_id)).toHaveLength(4)
})

test('random teams: move a player, reshuffle keeps everyone', async ({ page }) => {
  const { store } = storeWithStandings()
  await boot(page, store, { admin: true })
  await page.goto('/admin/sessions/new')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: 'Make 3 teams →' }).click()
  await expect(page.getByRole('heading', { name: "Tonight's teams" })).toBeVisible()

  const counts = async () => (await page.getByText(/^\d players$/).allInnerTexts()).map((t) => parseInt(t))
  expect((await counts()).reduce((a, b) => a + b)).toBe(5)
  // Teammates of a player = the other names in their team card
  const teammates = async (name) => {
    const card = page.locator('main section').filter({ has: page.locator('li > span', { hasText: new RegExp(`^${name}$`) }) })
    return (await card.locator('li > span').allInnerTexts()).filter((n) => n !== name).sort()
  }
  const moveBtn = page.getByRole('button', { name: /^Move / }).first()
  const mover = (await moveBtn.getAttribute('aria-label')).match(/^Move (\S+) to/)[1]
  const before = await teammates(mover)
  await moveBtn.click()
  expect(await teammates(mover)).not.toEqual(before)
  expect((await counts()).reduce((a, b) => a + b)).toBe(5)

  await page.getByRole('button', { name: /Reshuffle/ }).click()
  expect((await counts()).reduce((a, b) => a + b)).toBe(5)
  await page.getByRole('button', { name: 'Lock teams & start' }).click()
  await expect(page).toHaveURL(/\/tonight$/)
  expect(store.teams).toHaveLength(3)
})

test('manual teams: start is blocked until everyone is placed', async ({ page }) => {
  const { store } = storeWithStandings()
  await boot(page, store, { admin: true })
  await page.goto('/admin/sessions/new')
  await page.getByRole('button', { name: 'Clear all' }).click()
  for (const n of ['Ann', 'Ben', 'Cal']) await page.getByRole('checkbox', { name: new RegExp(n) }).click()
  await page.getByRole('button', { name: 'Manual' }).click()
  await page.getByRole('button', { name: 'Place 3 players →' }).click()

  const start = page.getByRole('button', { name: 'Lock teams & start' })
  await page.getByRole('button', { name: 'Put Ann on team 1' }).click()
  await page.getByRole('button', { name: 'Put Ben on team 2' }).click()
  await expect(page.getByText('1 to place')).toBeVisible()
  await expect(start).toBeDisabled()
  await page.getByRole('button', { name: 'Put Cal on team 1' }).click()
  await expect(page.getByText('Everyone placed')).toBeVisible()
  await start.click()

  await expect(page).toHaveURL(/\/tonight$/)
  expect(teamRoster(store)).toEqual([
    { name: "Ann's Team", players: ['Ann', 'Cal'] },
    { name: "Ben's Team", players: ['Ben'] },
  ])
})

test('back keeps step 1 choices; X cancels', async ({ page }) => {
  const { store } = storeWithStandings()
  await boot(page, store, { admin: true })
  await page.goto('/')
  await page.goto('/admin/sessions/new')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: 'Make 3 teams →' }).click()
  await page.getByRole('button', { name: "Back to who's here" }).click()
  await expect(page.getByRole('button', { name: 'Make 3 teams →' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel new session' }).click()
  await expect(page).toHaveURL(/\/$/)
  expect(store.sessions).toHaveLength(0)
})
