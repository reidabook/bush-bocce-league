// Commissioner access, menu, roster and session options.
import { test, expect } from '@playwright/test'
import { createStore, boot, playGame } from './support/app.js'
import { seedPlayers, seedSession } from './support/fakeBackend.js'
import { E2E_PASSWORD } from '../playwright.config.js'

test('login: wrong password is rejected, right one opens the commissioner menu; log out', async ({ page }) => {
  const store = createStore()
  await boot(page, store)
  await page.goto('/')
  await page.getByRole('link', { name: 'Commissioner login' }).click()
  await page.getByPlaceholder('Password').fill('nope')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText("That password didn't work.")).toBeVisible()

  await page.getByPlaceholder('Password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  const menu = page.getByRole('dialog', { name: 'Commissioner' })
  await expect(menu.getByRole('link', { name: /Start a session/ })).toBeVisible()
  await expect(menu.getByRole('link', { name: /Roster/ })).toBeVisible()
  await expect(menu.getByRole('link', { name: /Tournament/ })).toBeVisible()

  await menu.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('link', { name: 'Commissioner login' })).toBeVisible()
})

test('admin pages need login; old admin URLs redirect', async ({ page }) => {
  const store = createStore()
  const [a, b] = seedPlayers(store, ['Ann', 'Ben'])
  const { session } = seedSession(store, { number: 1, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a] }, { name: "Ben's Team", players: [b] }] })
  await boot(page, store)
  await page.goto('/admin/roster')
  await expect(page).toHaveURL(/\/admin\/login$/)

  await page.goto('/active')
  await expect(page).toHaveURL(/\/tonight$/)
  await page.goto(`/admin/sessions/${session.id}`)
  await expect(page).toHaveURL(new RegExp(`/sessions/${session.id}$`))
})

test('menu shows "Go to tonight" while a session is live', async ({ page }) => {
  const store = createStore()
  const [a, b] = seedPlayers(store, ['Ann', 'Ben'])
  seedSession(store, { number: 7, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a] }, { name: "Ben's Team", players: [b] }] })
  await boot(page, store, { admin: true })
  await page.goto('/admin')
  const menu = page.getByRole('dialog', { name: 'Commissioner' })
  await menu.getByRole('link', { name: /Go to tonight/ }).click()
  await expect(page).toHaveURL(/\/tonight$/)
  await expect(page.getByText('Session 7', { exact: false }).first()).toBeVisible()
})

test('roster: add, rename, remove', async ({ page }) => {
  const store = createStore()
  seedPlayers(store, ['Ann'])
  await boot(page, store, { admin: true })
  await page.goto('/admin/roster')

  await page.getByPlaceholder("New player's name").fill('Zed')
  await page.getByRole('button', { name: 'Add player' }).click()
  await expect(page.getByRole('button', { name: /^Zed/ })).toBeVisible()

  await page.getByRole('button', { name: /^Zed/ }).click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Zed Z')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('button', { name: /^Zed Z/ })).toBeVisible()

  await page.getByRole('button', { name: /^Ann/ }).click()
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByRole('button', { name: /^Ann/ })).toHaveCount(0)
  expect(store.players.find((p) => p.name === 'Ann').active).toBe('false')
})

test('game controls: undo, change winner, clear, delete', async ({ page }) => {
  const store = createStore()
  const [a, b] = seedPlayers(store, ['Ann', 'Ben'])
  seedSession(store, { number: 1, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a] }, { name: "Ben's Team", players: [b] }] })
  await boot(page, store, { admin: true })
  await page.goto('/tonight')

  await playGame(page, 1, "Ann's")
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Game 1 · Who won?')).toBeVisible()
  expect(store.games[0].winner_team_id).toBe('')

  await page.getByRole('button', { name: "Ben's", exact: true }).click()
  await page.getByRole('button', { name: 'Edit game 1' }).click()
  const sheet = page.getByRole('dialog', { name: 'Game 1' })
  await sheet.getByRole('button', { name: "Ann's", exact: true }).click()
  await expect(sheet.getByRole('button', { name: "Ann's", exact: true })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('button', { name: 'Clear result' }).click()
  await expect(sheet.getByRole('button', { name: 'Clear result' })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Delete game' }).click()
  await expect(sheet).toBeHidden()
  expect(store.games).toHaveLength(0)
})

test('session options: change date, close, reopen, delete', async ({ page }) => {
  const store = createStore()
  const [a, b] = seedPlayers(store, ['Ann', 'Ben'])
  const { session } = seedSession(store, { number: 3, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a] }, { name: "Ben's Team", players: [b] }] })
  await boot(page, store, { admin: true })
  await page.goto(`/sessions/${session.id}`)

  await page.getByRole('button', { name: 'Session options' }).click()
  const opts = page.getByRole('dialog', { name: 'Session 3' })
  await opts.getByLabel('Date').fill('2026-06-09')
  await opts.getByRole('button', { name: 'Save date' }).click()
  await expect(opts).toBeHidden()
  await expect(page.getByText('Tue, Jun 9')).toBeVisible()

  await page.getByRole('button', { name: 'Session options' }).click()
  await page.getByRole('button', { name: 'Close session' }).click()
  await expect(page.getByRole('heading', { name: /Tuesday, Jun 9/ })).toBeVisible()
  expect(store.sessions[0].status).toBe('completed')

  await page.getByRole('button', { name: 'Session options' }).click()
  await page.getByRole('button', { name: 'Reopen session' }).click()
  await expect(page.getByRole('heading', { name: 'Tonight', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Session options' }).click()
  await page.getByRole('button', { name: 'Delete session' }).click()
  await expect(page).toHaveURL(/\/sessions$/)
  expect(store.sessions).toHaveLength(0)
})
