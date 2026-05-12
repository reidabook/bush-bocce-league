/**
 * Migration: historical_player_stats
 *
 * 1. Creates hidden `historical_player_stats` sheet
 * 2. Populates from historical.xlsx data for weeks 1 & 2
 * 3. Marks weeks 1 & 2 as status='historical'
 * 4. Deletes game/team/team_player rows for weeks 1 & 2
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env.local') })
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

// ── Historical data from the Excel source-of-truth ────────────────────────────

// Key: player name as it appears in historical.xlsx
// Value: { points, wins, games_played } per week number
const HISTORICAL = {
  1: [
    { name: 'James',      points: 6, wins: 1, games_played: 3 },
    { name: 'Rick',       points: 6, wins: 1, games_played: 3 },
    { name: 'Fraser',     points: 5, wins: 1, games_played: 2 },
    { name: 'Nolan',      points: 6, wins: 1, games_played: 3 },
    { name: 'Brandon L',  points: 6, wins: 1, games_played: 3 },
    { name: 'Josh',       points: 6, wins: 1, games_played: 3 },
    { name: 'Reid',       points: 9, wins: 2, games_played: 3 },
    { name: 'Brandon H',  points: 5, wins: 1, games_played: 2 },
    { name: 'Ty',         points: 9, wins: 2, games_played: 3 },
    { name: 'Sawyer',     points: 9, wins: 2, games_played: 3 },
    { name: 'John',       points: 9, wins: 2, games_played: 3 },
  ],
  2: [
    { name: 'James',     points: 9, wins: 2, games_played: 3 },
    { name: 'Fraser',    points: 1, wins: 0, games_played: 1 },
    { name: 'Nolan',     points: 6, wins: 1, games_played: 3 },
    { name: 'Brandon L', points: 9, wins: 2, games_played: 3 },
    { name: 'Reid',      points: 5, wins: 1, games_played: 2 },
    { name: 'Ty',        points: 6, wins: 1, games_played: 3 },
    { name: 'Sawyer',    points: 9, wins: 2, games_played: 3 },
    { name: 'John',      points: 9, wins: 2, games_played: 3 },
    { name: 'Collin',    points: 6, wins: 1, games_played: 3 },
    { name: 'Jake',      points: 6, wins: 1, games_played: 3 },
    { name: 'Alex',      points: 9, wins: 2, games_played: 3 },
  ],
}

// ── Name matching ──────────────────────────────────────────────────────────────

function matchPlayer(histName, players) {
  const hn = histName.toLowerCase()

  // 1. Exact match
  let p = players.find((p) => p.name.toLowerCase() === hn)
  if (p) return p

  // 2. "Brandon L" / "Brandon H" — match first name + first letter of last name
  const parts = hn.split(' ')
  if (parts.length === 2 && parts[1].length === 1) {
    const [first, initial] = parts
    p = players.find((p) => {
      const words = p.name.toLowerCase().split(/\s+/)
      return words[0] === first && words[1]?.startsWith(initial)
    })
    if (p) return p
  }

  // 3. Player's first name matches exactly
  p = players.find((p) => p.name.toLowerCase().split(/\s+/)[0] === hn)
  if (p) return p

  // 4. Player name starts with histName
  p = players.find((p) => p.name.toLowerCase().startsWith(hn))
  if (p) return p

  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth)
  await doc.loadInfo()
  console.log(`Connected: ${doc.title}`)

  // ── Load players ────────────────────────────────────────────────────────────
  const playersSheet = doc.sheetsByTitle['players']
  const playerRows = await playersSheet.getRows()
  const players = playerRows.map((r) => ({
    id: r.get('id'),
    name: r.get('name'),
  }))
  console.log(`Players (${players.length}):`, players.map((p) => p.name).join(', '))

  // ── Resolve player names ────────────────────────────────────────────────────
  const nameToId = {}
  let missingNames = []
  for (const [weekNum, entries] of Object.entries(HISTORICAL)) {
    for (const entry of entries) {
      if (nameToId[entry.name]) continue
      const p = matchPlayer(entry.name, players)
      if (p) {
        nameToId[entry.name] = p.id
        console.log(`  Matched "${entry.name}" → "${p.name}" (${p.id})`)
      } else {
        missingNames.push(`Week ${weekNum}: "${entry.name}"`)
      }
    }
  }
  if (missingNames.length) {
    console.error('\nCould not match these players — fix manually or add them first:')
    missingNames.forEach((m) => console.error(' ', m))
    process.exit(1)
  }

  // ── Load weeks ──────────────────────────────────────────────────────────────
  const weeksSheet = doc.sheetsByTitle['weeks']
  const weekRows = await weeksSheet.getRows()
  const weekMap = {}
  for (const r of weekRows) {
    const num = parseInt(r.get('week_number'))
    weekMap[num] = { row: r, id: r.get('id'), status: r.get('status') }
  }
  console.log('\nWeeks found:', Object.entries(weekMap).map(([n, w]) => `${n}→${w.id} (${w.status})`).join(', '))

  if (!weekMap[1]) { console.error('Week 1 not found'); process.exit(1) }
  if (!weekMap[2]) { console.error('Week 2 not found'); process.exit(1) }

  // ── Create / verify historical_player_stats sheet ──────────────────────────
  const HIST_SHEET = 'historical_player_stats'
  const HEADERS = ['id', 'week_id', 'player_id', 'points', 'wins', 'games_played']

  let histSheet = doc.sheetsByTitle[HIST_SHEET]
  if (!histSheet) {
    console.log(`\nCreating sheet "${HIST_SHEET}"…`)
    histSheet = await doc.addSheet({ title: HIST_SHEET, headerValues: HEADERS })
  } else {
    console.log(`\nSheet "${HIST_SHEET}" exists — clearing…`)
    await histSheet.clearRows()
  }
  await histSheet.updateProperties({ hidden: true })
  console.log(`Sheet "${HIST_SHEET}" hidden: true`)

  // ── Insert historical stats ─────────────────────────────────────────────────
  const rowsToInsert = []
  for (const [weekNumStr, entries] of Object.entries(HISTORICAL)) {
    const weekNum = parseInt(weekNumStr)
    const weekId = weekMap[weekNum].id
    for (const entry of entries) {
      const playerId = nameToId[entry.name]
      rowsToInsert.push({
        id: crypto.randomUUID(),
        week_id: weekId,
        player_id: playerId,
        points: String(entry.points),
        wins: String(entry.wins),
        games_played: String(entry.games_played),
      })
    }
  }
  await histSheet.addRows(rowsToInsert)
  console.log(`Inserted ${rowsToInsert.length} rows into "${HIST_SHEET}"`)

  // ── Mark weeks 1 & 2 as 'historical' ───────────────────────────────────────
  for (const num of [1, 2]) {
    const { row, status } = weekMap[num]
    if (status === 'historical') {
      console.log(`Week ${num} already historical, skipping`)
    } else {
      row.set('status', 'historical')
      await row.save()
      console.log(`Week ${num} status → 'historical'`)
    }
  }

  // ── Delete game/team/team_player rows for weeks 1 & 2 ─────────────────────
  const targetWeekIds = new Set([weekMap[1].id, weekMap[2].id])

  const teamsSheet = doc.sheetsByTitle['teams']
  const tpSheet = doc.sheetsByTitle['team_players']
  const gamesSheet = doc.sheetsByTitle['games']

  const teamRows = await teamsSheet.getRows()
  const targetTeamRows = teamRows.filter((r) => targetWeekIds.has(r.get('week_id')))
  const targetTeamIds = new Set(targetTeamRows.map((r) => r.get('id')))

  const tpRows = await tpSheet.getRows()
  const targetTpRows = tpRows.filter((r) => targetTeamIds.has(r.get('team_id')))
  await Promise.all(targetTpRows.map((r) => r.delete()))
  console.log(`Deleted ${targetTpRows.length} team_players rows`)

  await Promise.all(targetTeamRows.map((r) => r.delete()))
  console.log(`Deleted ${targetTeamRows.length} teams rows`)

  const gameRows = await gamesSheet.getRows()
  const targetGameRows = gameRows.filter((r) => targetWeekIds.has(r.get('week_id')))
  await Promise.all(targetGameRows.map((r) => r.delete()))
  console.log(`Deleted ${targetGameRows.length} games rows`)

  console.log('\nDone.')
}

main().catch((err) => { console.error(err); process.exit(1) })
