/**
 * E2E test — validates scoring, departures, and standings against test_data.xlsx
 *
 * Scenario (2 weeks, 6 players, 3 games each):
 *   Week 1: Red=[P1,P2,P3]  Blue=[P4,P5,P6]
 *     G1: Red wins  → P1 departs
 *     G2: Red wins  → P2 departs
 *     G3: Blue wins
 *
 *   Week 2: Red=[P2,P4,P6]  Blue=[P1,P3,P5]
 *     G1: Red wins  → P2 departs
 *     G2: Red wins  → P4 departs
 *     G3: Blue wins
 *
 * Expected standings (pts / wins / gp / sessions):
 *   1. Player 3 — 15 / 3 / 6 / 2
 *   2. Player 6 — 15 / 3 / 6 / 2
 *   3. Player 4 — 14 / 3 / 5 / 2
 *   4. Player 2 — 12 / 3 / 3 / 2
 *   5. Player 5 — 12 / 2 / 6 / 2
 *   6. Player 1 — 10 / 2 / 4 / 2
 */

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Load env ────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8')
    const env = {}
    raw.split('\n').forEach((line) => {
      const eq = line.indexOf('=')
      if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    })
    return env
  } catch {
    return {}
  }
}

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY

// ─── Supabase REST helper ─────────────────────────────────────────────────────

async function sb(method, table, body, extra = {}) {
  const { query = '', prefer = 'return=representation' } = extra
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase ${method} ${table}${query} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

// ─── Test state ───────────────────────────────────────────────────────────────

let players = []   // [{id, name}, ...] in order P1-P6
let week1Id = null
let week2Id = null

// ─── beforeAll: seed database ─────────────────────────────────────────────────

test.beforeAll(async () => {
  // Create players P1–P6
  for (let i = 1; i <= 6; i++) {
    const [p] = await sb('POST', 'players', { name: `Player ${i}`, active: true })
    players.push(p)
  }
  const [p1, p2, p3, p4, p5, p6] = players

  // ── Week 1 ─────────────────────────────────────────────────────────────────
  const [w1] = await sb('POST', 'weeks', {
    week_number: 1, date: '2026-01-07', team_size: 2, status: 'active',
  })
  week1Id = w1.id

  // Attendees
  await sb('POST', 'week_attendees',
    players.map((p) => ({ week_id: week1Id, player_id: p.id }))
  )

  // Red Team = [P1, P2, P3]
  const [redW1] = await sb('POST', 'teams', { week_id: week1Id, name: 'Red Team' })
  await sb('POST', 'team_players', [p1, p2, p3].map((p) => ({ team_id: redW1.id, player_id: p.id })))

  // Blue Team = [P4, P5, P6]
  const [blueW1] = await sb('POST', 'teams', { week_id: week1Id, name: 'Blue Team' })
  await sb('POST', 'team_players', [p4, p5, p6].map((p) => ({ team_id: blueW1.id, player_id: p.id })))

  // ── Week 2 ─────────────────────────────────────────────────────────────────
  const [w2] = await sb('POST', 'weeks', {
    week_number: 2, date: '2026-01-14', team_size: 2, status: 'active',
  })
  week2Id = w2.id

  // Attendees
  await sb('POST', 'week_attendees',
    players.map((p) => ({ week_id: week2Id, player_id: p.id }))
  )

  // Red Team = [P2, P4, P6]
  const [redW2] = await sb('POST', 'teams', { week_id: week2Id, name: 'Red Team' })
  await sb('POST', 'team_players', [p2, p4, p6].map((p) => ({ team_id: redW2.id, player_id: p.id })))

  // Blue Team = [P1, P3, P5]
  const [blueW2] = await sb('POST', 'teams', { week_id: week2Id, name: 'Blue Team' })
  await sb('POST', 'team_players', [p1, p3, p5].map((p) => ({ team_id: blueW2.id, player_id: p.id })))
})

// ─── afterAll: clean up ───────────────────────────────────────────────────────

test.afterAll(async () => {
  if (week1Id) await sb('DELETE', `weeks?id=eq.${week1Id}`, undefined, { prefer: '' })
  if (week2Id) await sb('DELETE', `weeks?id=eq.${week2Id}`, undefined, { prefer: '' })
  for (const p of players) {
    await sb('DELETE', `players?id=eq.${p.id}`, undefined, { prefer: '' })
  }
})

// ─── Helper: authenticate ─────────────────────────────────────────────────────

async function adminLogin(page) {
  await page.goto('/admin/login')
  await page.locator('input[type="password"]').fill('admin')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/admin')
}

// ─── Helper: add game and record winner ──────────────────────────────────────

async function addGameAndPickWinner(page, winnerName) {
  // Click "+ Add Game"
  await page.getByRole('button', { name: '+ Add Game' }).click()
  await page.waitForTimeout(600) // wait for DB write + reload

  // Click the winner button in "Who won?" section
  // The buttons appear as the team names
  const winnerBtn = page.locator('div.space-y-2 button', { hasText: winnerName }).last()
  await winnerBtn.click()
  await page.waitForTimeout(600)
}

// ─── Helper: mark player departure ────────────────────────────────────────────

async function markDeparted(page, playerName) {
  // Find the "left" button next to the player
  const playerRow = page.locator('div', { hasText: playerName }).filter({ has: page.getByText('left', { exact: true }) }).last()
  await playerRow.getByText('left', { exact: true }).click()
  await page.waitForTimeout(500)
}

// ─── Main test ────────────────────────────────────────────────────────────────

test('test_data.xlsx scenario: scoring, departures, and standings', async ({ page }) => {
  await adminLogin(page)

  // ═══════════════════════════════════════════════════════════════════
  // WEEK 1
  // ═══════════════════════════════════════════════════════════════════
  await page.goto(`/admin/weeks/${week1Id}`)
  await expect(page.getByText('Week 1')).toBeVisible()

  // Game 1 — Red wins
  await addGameAndPickWinner(page, 'Red Team')

  // Player 1 departs after Game 1
  await markDeparted(page, 'Player 1')

  // Game 2 — Red wins
  await addGameAndPickWinner(page, 'Red Team')

  // Player 2 departs after Game 2
  await markDeparted(page, 'Player 2')

  // Game 3 — Blue wins
  await addGameAndPickWinner(page, 'Blue Team')

  // Close Week 1
  await page.getByRole('button', { name: /Close Week/i }).click()
  await page.waitForURL('**/admin')

  // ═══════════════════════════════════════════════════════════════════
  // WEEK 2
  // ═══════════════════════════════════════════════════════════════════
  await page.goto(`/admin/weeks/${week2Id}`)
  await expect(page.getByText('Week 2')).toBeVisible()

  // Game 1 — Red wins
  await addGameAndPickWinner(page, 'Red Team')

  // Player 2 departs after Game 1
  await markDeparted(page, 'Player 2')

  // Game 2 — Red wins
  await addGameAndPickWinner(page, 'Red Team')

  // Player 4 departs after Game 2
  await markDeparted(page, 'Player 4')

  // Game 3 — Blue wins
  await addGameAndPickWinner(page, 'Blue Team')

  // Close Week 2
  await page.getByRole('button', { name: /Close Week/i }).click()
  await page.waitForURL('**/admin')

  // ═══════════════════════════════════════════════════════════════════
  // VERIFY STANDINGS
  // ═══════════════════════════════════════════════════════════════════
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Check each expected row in the standings table
  const expected = [
    { rank: 1, name: 'Player 3', pts: '15', w: '3', gp: '6', sa: '2' },
    { rank: 2, name: 'Player 6', pts: '15', w: '3', gp: '6', sa: '2' },
    { rank: 3, name: 'Player 4', pts: '14', w: '3', gp: '5', sa: '2' },
    { rank: 4, name: 'Player 2', pts: '12', w: '3', gp: '3', sa: '2' },
    { rank: 5, name: 'Player 5', pts: '12', w: '2', gp: '6', sa: '2' },
    { rank: 6, name: 'Player 1', pts: '10', w: '2', gp: '4', sa: '2' },
  ]

  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(expected.length)

  for (let i = 0; i < expected.length; i++) {
    const row = rows.nth(i)
    const cells = row.locator('td')
    await expect(cells.nth(0)).toContainText(String(expected[i].rank))  // #
    await expect(cells.nth(1)).toContainText(expected[i].name)           // Player
    await expect(cells.nth(2)).toContainText(expected[i].pts)            // PTS
    await expect(cells.nth(3)).toContainText(expected[i].w)              // W
    await expect(cells.nth(4)).toContainText(expected[i].gp)             // GP
    await expect(cells.nth(5)).toContainText(expected[i].sa)             // SA
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERIFY WEEK DETAIL — departure labels
  // ═══════════════════════════════════════════════════════════════════

  // Week 1 detail
  await page.goto(`/weeks/${week1Id}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('left after Game 1')).toBeVisible()  // Player 1
  await expect(page.getByText('left after Game 2')).toBeVisible()  // Player 2

  // Week 2 detail
  await page.goto(`/weeks/${week2Id}`)
  await page.waitForLoadState('networkidle')
  // Player 2 and Player 4 should show departure labels
  const departureCells = page.locator('text=/left after Game \\d+/')
  await expect(departureCells).toHaveCount(2)
})
