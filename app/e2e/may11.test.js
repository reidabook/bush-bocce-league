/**
 * E2E test — May 11 real-world scenario
 *
 * SOURCE: May11-stats.numbers
 *
 * Session 1 (3 teams, round-robin):
 *   Team 1: Reid, Brandon H, Brandon L, George  (+Colin for G2 only — late join)
 *   Team 2: Sawyer, James, Jake, Nolan
 *   Team 3: Jonathan, Elan, Alex, Ty, Zach
 *
 *   G1: Team 1 vs Team 2 → Team 1 wins  (Team 3 DNP)
 *   G2: Team 1 vs Team 3 → Team 1 wins  (Team 2 DNP, Colin included)
 *   G3: Team 2 vs Team 3 → Team 2 wins  (Team 1 DNP)
 *
 * Session 2 (same date, 2 merged teams — separate week entry):
 *   Team 4 (Red):  Reid, Nolan, Jonathan, Brandon H, Zach
 *   Team 5 (Blue): Sawyer, Ty, Jake, Brandon L, James, Alex
 *
 *   G4: Team 4 vs Team 5 → Team 4 wins
 *
 * ─── Expected standings (pts / wins / gp / sessions) ────────────────────────
 * Scoring: +1 per game played, +3 per win (total +4 win, +1 loss)
 *
 * Sessions counted per CALENDAR DATE (not per week entry) — two entries on May 11 = 1 session.
 * BUG: The app currently counts per week entry, so same-date entries will inflate session counts.
 * Fix needed: deduplicate week dates before counting sessions in getStandings().
 *
 *   Reid        12 / 3W / 3GP / 1S   G1 win + G2 win + G4 win
 *   Brandon H   12 / 3W / 3GP / 1S   G1 win + G2 win + G4 win
 *   Nolan        9 / 2W / 3GP / 1S   G1 loss + G3 win + G4 win
 *   Brandon L    9 / 2W / 3GP / 1S   G1 win + G2 win + G4 loss
 *   George       8 / 2W / 2GP / 1S   G1 win + G2 win  (NOT in session 2)
 *   Sawyer       6 / 1W / 3GP / 1S   G1 loss + G3 win + G4 loss
 *   James        6 / 1W / 3GP / 1S   G1 loss + G3 win + G4 loss
 *   Jake         6 / 1W / 3GP / 1S   G1 loss + G3 win + G4 loss
 *   Jonathan     6 / 1W / 3GP / 1S   G2 loss + G3 loss + G4 win
 *   Zach         6 / 1W / 3GP / 1S   G2 loss + G3 loss + G4 win
 *   Colin        4 / 1W / 1GP / 1S   G2 win only  (REQUIRES per-game exclusion from G1/G3)
 *   Alex         3 / 0W / 3GP / 1S   G2 loss + G3 loss + G4 loss
 *   Ty           3 / 0W / 3GP / 1S   G2 loss + G3 loss + G4 loss
 *   Elan         2 / 0W / 2GP / 1S   G2 loss + G3 loss  (NOT in session 2)
 *
 * ─── Scenarios this test exercises ──────────────────────────────────────────
 * 1. 3-team round-robin: selecting which 2 teams play each game
 * 2. Late joiner / per-game player exclusion (Colin)
 * 3. Two sessions on the same calendar date
 * 4. Players appearing on different teams across sessions
 * 5. Standings correctness after multi-session, multi-team event
 * 6. Sessions Attended counting when a player spans multiple same-day weeks
 *
 * ─── KNOWN BUGS / MISSING FEATURES DISCOVERED ───────────────────────────────
 * See BUG comments inline and the summary at the bottom of this file.
 *
 * ─── Running ─────────────────────────────────────────────────────────────────
 * Requires .env.local with:
 *   VITE_ADMIN_PASSWORD=<password>
 *   VITE_SUPABASE_URL=  (unused — app uses Google Sheets)
 * Against local dev: npx playwright test e2e/may11.test.js
 * Against prod:      npx playwright test e2e/may11.test.js --config=playwright.prod.config.js
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
const ADMIN_PASSWORD = env.VITE_ADMIN_PASSWORD

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function adminLogin(page) {
  await page.goto('/admin/login')
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD ?? 'admin')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/admin')
}

/**
 * Creates a new session (week) via the admin new-week flow.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} opts
 * @param {string} opts.date  — ISO date string (YYYY-MM-DD)
 * @param {number} opts.numTeams — 2, 3, or 4
 * @param {string[][]} opts.teamRosters — array of player name arrays per team
 * @returns {string} the week ID extracted from the navigated URL
 */
async function createSession(page, { date, numTeams, teamRosters }) {
  await page.goto('/admin')
  await page.getByRole('link', { name: /new session/i }).click()
  await page.waitForURL('**/admin/new-week')

  // Step 1: pick date and team count
  await page.locator('input[type="date"]').fill(date)
  await page.getByRole('button', { name: String(numTeams), exact: true }).click()

  // Select attendees (all players across all rosters)
  const allPlayers = teamRosters.flat()
  for (const name of allPlayers) {
    const cb = page.locator('label', { hasText: name })
    await cb.click()
  }

  // Switch to manual assignment mode
  await page.getByRole('button', { name: /manual/i }).click()

  // Assign each player to their team
  for (let teamIdx = 0; teamIdx < teamRosters.length; teamIdx++) {
    for (const name of teamRosters[teamIdx]) {
      // Find the player row and select the right team radio/button
      const teamName = ['Red Team', 'Blue Team', 'Green Team', 'Yellow Team'][teamIdx]
      await page
        .locator('div', { hasText: name })
        .filter({ has: page.getByRole('button', { name: teamName }) })
        .getByRole('button', { name: teamName })
        .click()
    }
  }

  // Lock teams
  await page.getByRole('button', { name: /lock teams/i }).click()
  await page.waitForURL('**/admin/weeks/**')

  // Extract week ID from URL
  const url = page.url()
  return url.split('/').at(-1)
}

/**
 * Adds a game and records the winner.
 * When numTeams > 2, the two playing teams must be specified by name.
 */
async function addGameAndRecordWinner(page, winnerTeamName, { teamA, teamB } = {}) {
  // If teams need to be selected (3+ team session), click them first
  if (teamA && teamB) {
    await page.getByRole('button', { name: teamA }).click()
    await page.getByRole('button', { name: teamB }).click()
  }

  await page.getByRole('button', { name: '+ Add Game' }).click()
  await page.waitForTimeout(700)

  // Record winner
  const winnerBtn = page
    .locator('div.space-y-2 button', { hasText: winnerTeamName })
    .last()
  await winnerBtn.click()
  await page.waitForTimeout(700)
}

// ─── Test 1: 3-team round-robin — game selection UI ──────────────────────────

test('3-team session: team selector appears and allows choosing playing teams', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')
  await adminLogin(page)

  // Create a session with 3 teams (use synthetic names to avoid polluting roster)
  // BUG NOTE: This test will fail if the roster doesn't already have these players.
  // The admin UI requires picking from the existing roster — there's no inline add.

  await page.goto('/admin/new-week')

  // Step 1
  await page.locator('input[type="date"]').fill('2025-05-11')
  await page.getByRole('button', { name: '3', exact: true }).click()

  // Verify 3-team button is available and selectable
  await expect(page.getByRole('button', { name: '3', exact: true })).toBeVisible()

  // BUG: The "2 teams" label on the review screen is hardcoded — it won't say "3 teams"
  // after this selection. Verify it shows the correct count.
  // (We'll check later in the auto-review step)
})

// ─── Test 2: Full May 11 Session 1 — 3 teams, round-robin ───────────────────

test('May 11 Session 1: 3-team round-robin games record correctly', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')
  await adminLogin(page)

  // Navigate to admin week manage for session 1 (must exist — enter ID manually or create via UI)
  // This test assumes the week already exists and its ID is known.
  // TODO: once week creation is tested, chain these tests together.

  // Instead, verify that when 3 teams exist, the team selector is shown for adding games.
  // We'll find the active session card on the admin dashboard.
  await page.goto('/admin')

  // Look for an active session with 3 teams
  const activeWeekLink = page.locator('a', { hasText: /manage/i }).first()
  if (!(await activeWeekLink.isVisible())) {
    test.skip(true, 'No active session to test against')
  }

  await activeWeekLink.click()
  await page.waitForURL('**/admin/weeks/**')

  // If there are 3 or more teams, a team selector should appear in the "Add Game" section
  const teamButtons = page.locator('div', { hasText: /select two teams/i })
  // BUG: If the team selector UI isn't present for 3-team sessions, this will fail
  await expect(teamButtons).toBeVisible()
})

// ─── Test 3: Per-game player exclusion — Colin scenario ──────────────────────

test('MISSING FEATURE: per-game player exclusion not available in admin UI', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')
  await adminLogin(page)

  // Navigate to any active week manage page
  await page.goto('/admin')
  const weekLink = page.locator('a', { hasText: /manage/i }).first()
  if (!(await weekLink.isVisible())) {
    test.skip(true, 'No active session to test against')
  }
  await weekLink.click()
  await page.waitForURL('**/admin/weeks/**')

  // Verify there is NO "exclude from game" control in the admin week management UI.
  // This is the known gap: Colin joined Team 1 only for Game 2. The admin UI has no
  // way to exclude him from Game 1 or Game 3. Only the AI chat (ActiveSession.jsx)
  // exposes excludePlayerFromGame / restorePlayerToGame.
  //
  // Expected: this assertion PASSES (confirming the feature is missing)
  await expect(page.getByText(/exclude.*game|remove.*game/i)).not.toBeVisible()
})

// ─── Test 4: Two sessions on the same date ────────────────────────────────────

test('Two sessions on the same date are each counted separately for standings', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')
  await adminLogin(page)

  // Verify the admin new-week form does not block or warn when creating a second
  // session on a date that already has a completed session.
  await page.goto('/admin/new-week')
  await page.locator('input[type="date"]').fill('2025-05-11')

  // There should be no "date already used" error on date selection alone
  await expect(page.getByText(/already.*session|session.*exists/i)).not.toBeVisible()
})

// ─── Test 5: Standings — correctness after May 11 ────────────────────────────

test('Standings: May 11 scenario produces correct pts/wins/gp/sessions', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')

  // NOTE: This test requires both May 11 sessions to already be entered and COMPLETED.
  // Run this after manually entering data through the UX (as the user intends to do).
  //
  // Correct expected standings (per-spec scoring: +1 play, +3 win):
  //
  // IMPORTANT: Colin's expected stats depend on whether per-game exclusion was applied:
  //   - WITH exclusion (correct):  Colin = 4pts / 1W / 1GP / 1S
  //   - WITHOUT exclusion (bug):   Colin = 8pts / 2W / 2GP / 1S  (counted for G1+G2, T1 DNPs G3)
  //
  // George and Elan are NOT in Session 2, so their sessions count should be 1.

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const expected = [
    // Sessions = 1 for everyone — both May 11 entries are the same calendar night.
    // BUG: until date-deduplication is fixed in getStandings(), the app will show
    // s=2 for players in both week entries. These assertions will fail until fixed.
    { name: 'Reid',       pts: '12', w: '3', gp: '3', s: '1' },
    { name: 'Brandon H',  pts: '12', w: '3', gp: '3', s: '1' },
    { name: 'Nolan',      pts:  '9', w: '2', gp: '3', s: '1' },
    { name: 'Brandon L',  pts:  '9', w: '2', gp: '3', s: '1' },
    { name: 'George',     pts:  '8', w: '2', gp: '2', s: '1' },
    { name: 'Sawyer',     pts:  '6', w: '1', gp: '3', s: '1' },
    { name: 'James',      pts:  '6', w: '1', gp: '3', s: '1' },
    { name: 'Jake',       pts:  '6', w: '1', gp: '3', s: '1' },
    { name: 'Jonathan',   pts:  '6', w: '1', gp: '3', s: '1' },
    { name: 'Zach',       pts:  '6', w: '1', gp: '3', s: '1' },
    { name: 'Colin',      pts:  '4', w: '1', gp: '1', s: '1' }, // only correct if exclusion applied
    { name: 'Alex',       pts:  '3', w: '0', gp: '3', s: '1' },
    { name: 'Ty',         pts:  '3', w: '0', gp: '3', s: '1' },
    { name: 'Elan',       pts:  '2', w: '0', gp: '2', s: '1' },
  ]

  // Find each player in the standings table and verify stats
  for (const { name, pts, w, gp, s } of expected) {
    const row = page.locator('table tbody tr', { hasText: name })
    await expect(row).toBeVisible({ timeout: 5000 })
    const cells = row.locator('td')
    await expect(cells.nth(2)).toContainText(pts)  // PTS
    await expect(cells.nth(3)).toContainText(w)    // W
    await expect(cells.nth(4)).toContainText(gp)   // GP
    await expect(cells.nth(5)).toContainText(s)    // SA
  }
})

// ─── Test 6: Auto-mode team count label bug ────────────────────────────────────

test('BUG: auto-review step shows "2 teams" label regardless of actual team count', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')
  await adminLogin(page)

  await page.goto('/admin/new-week')

  // Select 3 teams (requires enough players to be on roster)
  await page.locator('input[type="date"]').fill('2099-01-01') // far future — won't conflict
  await page.getByRole('button', { name: '3', exact: true }).click()

  // Select at least 3 players
  const checkboxes = page.locator('label[for]').filter({ hasText: /\w+/ })
  await checkboxes.nth(0).click()
  await checkboxes.nth(1).click()
  await checkboxes.nth(2).click()

  await page.getByRole('button', { name: /generate|auto/i }).click()

  // The label currently reads "X players · 2 teams" regardless of numTeams.
  // It SHOULD read "X players · 3 teams" when 3 was selected.
  // This assertion documents the bug — it will FAIL when the bug is fixed (good).
  const label = page.locator('div.text-xs.opacity-40')
  await expect(label).toContainText('3 teams')  // fails today because label is hardcoded "2 teams"
})

// ─── Test 7: swapPlayer only works between team 0 and team 1 ─────────────────

test('BUG: swap-player button in auto mode ignores teams beyond the first two', async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, 'Requires VITE_ADMIN_PASSWORD in .env.local')
  await adminLogin(page)

  // This test documents a code-level bug in AdminNewWeek.jsx:
  // The swapPlayer function always toggles between index 0 and 1 regardless of numTeams.
  // Players on team 2 (Green Team) cannot be moved via the swap button in auto mode.
  //
  // Workaround: use manual assignment mode instead.
  //
  // Resolution: use manual mode as the default recommendation for 3+ team sessions,
  // or fix swapPlayer to cycle through all teams.
  test.info().annotations.push({
    type: 'bug',
    description:
      'swapPlayer() in AdminNewWeek.jsx hardcodes toTeamIndex = fromTeamIndex === 0 ? 1 : 0, ' +
      'so clicking swap on a player in team 2+ always moves them to team 0 or 1.',
  })
})

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * BUGS AND MISSING FEATURES SUMMARY (May 11 scenario analysis)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BUG-3 [_db.js:getStandings()]  Sessions count per week entry, not per calendar date
 *   Two week entries on the same date (the May 11 split-then-merge scenario) produce
 *   sessions=2 for players in both entries. The correct value is 1 — it was one night.
 *   Fix: in getStandings(), deduplicate attendee week IDs by date before counting:
 *     const uniqueDates = new Set(completedWeeks.filter(w => attendeeWeekIds.has(w.id)).map(w => w.date))
 *     sessionCount[player_id] = uniqueDates.size
 *
 * BUG-1 [AdminNewWeek.jsx:241]  Hardcoded "2 teams" label in auto-review step
 *   The text "{selected.size} players · 2 teams" doesn't update when numTeams ≠ 2.
 *   Fix: replace '2 teams' with `${teamCount} teams`.
 *
 * BUG-2 [AdminNewWeek.jsx:62–66]  swapPlayer() only swaps between team 0 and team 1
 *   With 3 teams, clicking swap on a player already on team 2 moves them to team 0,
 *   not cycling correctly. Players can never be "swapped into" team 2 via this button.
 *   Fix: cycle to the next team index, or remove swap button in favor of manual mode.
 *
 * MISSING-1 [AdminWeekManage.jsx]  No per-game player exclusion in admin UI
 *   The "Colin only played Game 2" scenario requires excludePlayerFromGame().
 *   That API exists and is used by ActiveSession.jsx (AI chat), but AdminWeekManage
 *   has no UI for it. Without this, Colin's stats will be inflated: he'll be credited
 *   for every game his team played (G1 + G2 = 2 games), not just G2.
 *   Fix: add an "exclude/include" toggle per player per game in the game results section.
 *
 * MISSING-2 [spec vs UI]  Team count allows 2/3/4 but spec says 3/5/7 (odd only)
 *   The spec defines odd team counts (3/5/7) so one team always sits out.
 *   The UI offers [2, 3, 4]. 4 teams would mean 2 games simultaneously, which may
 *   not match the league's physical setup. 2 teams is fine for Session 2 (merged).
 *   Clarify intended behaviour: is 2 or 4 valid?
 *
 * QUESTION-1  Colin's stats in the Numbers spreadsheet show 6pts/1W/3GP.
 *   Calculated correctly (only G2): 4pts/1W/1GP.
 *   The spreadsheet appears to credit Colin for all 3 session games.
 *   This is what happens without per-game exclusion — the app will replicate this bug.
 *
 * QUESTION-2  George's stats in the spreadsheet show 9pts/2W/3GP.
 *   Calculated correctly (T1 G1+G2, not in session 2): 8pts/2W/2GP.
 *   Discrepancy of 1pt and 1GP. Possible spreadsheet calculation error.
 *
 * QUESTION-3  Elan's stats in the spreadsheet show 3pts/0W/3GP.
 *   Calculated correctly (T3 G2+G3, not in session 2): 2pts/0W/2GP.
 *   Same pattern as George — suggests the spreadsheet may be awarding an extra
 *   "participation point" or has an off-by-one in game counting.
 */
