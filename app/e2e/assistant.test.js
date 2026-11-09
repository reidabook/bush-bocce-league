// AI assistant docked on Tonight. Gemini is replaced by a tiny scripted
// responder that understands "<team> beat <team>" and acts on the fake sheet,
// the way api/chat.js would.
import { test, expect } from '@playwright/test'
import { createStore, boot, addGame } from './support/app.js'
import { seedPlayers, seedSession, handle } from './support/fakeBackend.js'

async function fakeGemini(page, store, seen) {
  await page.route('**/api/chat', async (route) => {
    const { messages, weekContext } = JSON.parse(route.request().postData())
    seen.push(weekContext)
    const text = messages[messages.length - 1].content
    const m = text.match(/^(.+?)\s+beat\s+(.+)$/i)
    const find = (n) => weekContext.teams.find((t) => t.name.toLowerCase().startsWith(n.trim().toLowerCase()))
    const winner = m && find(m[1])
    const game = weekContext.games.filter((g) => !g.winner_team_id).pop()
    if (!winner || !game) return route.fulfill({ json: { reply: "I couldn't tell who won.", actionsRan: 0 } })
    handle(store, { action: 'recordGameResult', gameId: game.id, winnerTeamId: winner.id })
    await route.fulfill({ json: { reply: `Recorded: ${winner.name} won.`, actionsRan: 1 } })
  })
}

test('telling the assistant who won records the game and refreshes Tonight', async ({ page }) => {
  const store = createStore()
  const [a, b] = seedPlayers(store, ['Ann', 'Ben'])
  const { session } = seedSession(store, { number: 4, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a] }, { name: "Ben's Team", players: [b] }] })
  const seen = []
  await boot(page, store, { admin: true })
  await fakeGemini(page, store, seen)
  await page.goto('/tonight')
  await addGame(page, 1)

  const box = page.getByLabel('Tell the assistant what happened').first()
  await box.fill("Ben's beat Ann's")
  await box.press('Enter')

  const chat = page.getByRole('dialog', { name: 'Assistant' })
  await expect(chat.getByText("Ben's beat Ann's")).toBeVisible()
  await expect(chat.getByText("Recorded: Ben's Team won.")).toBeVisible()
  expect(seen[0].week.id).toBe(session.id)
  expect(seen[0].teams).toHaveLength(2)

  await chat.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('Game 1 · Who won?')).toHaveCount(0)
  await expect(page.locator('main ol li').first()).toContainText(/Ben's\s*beat\s*Ann's/)
  // The conversation stays one tap away
  await expect(page.getByRole('button', { name: 'Open assistant conversation' })).toBeVisible()
})

test('assistant errors show in the conversation', async ({ page }) => {
  const store = createStore()
  const [a, b] = seedPlayers(store, ['Ann', 'Ben'])
  seedSession(store, { number: 1, date: '2026-06-02', teams: [{ name: "Ann's Team", players: [a] }, { name: "Ben's Team", players: [b] }] })
  await boot(page, store, { admin: true })
  await page.route('**/api/chat', (r) => r.fulfill({ status: 500, body: 'boom' }))
  await page.goto('/tonight')
  const box = page.getByLabel('Tell the assistant what happened').first()
  await box.fill('hello')
  await box.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Assistant' }).getByText("Couldn't reach the assistant. Try again.")).toBeVisible()
})
