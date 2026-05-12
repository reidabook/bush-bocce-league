/**
 * Verify that historical_player_stats data is correct
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env.local') })

import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

function toObj(row) {
  const obj = {}
  for (const key of row._worksheet.headerValues) {
    obj[key] = row.get(key) ?? ''
  }
  return obj
}

async function main() {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth)
  await doc.loadInfo()

  const playersSheet = doc.sheetsByTitle['players']
  const playerRows = await playersSheet.getRows()
  const playerMap = Object.fromEntries(
    playerRows.map(toObj).map((p) => [p.id, p.name])
  )

  const weeksSheet = doc.sheetsByTitle['weeks']
  const weekRows = await weeksSheet.getRows()
  const weekMap = Object.fromEntries(
    weekRows.map(toObj).map((w) => [w.id, `Week ${w.week_number} (${w.status})`])
  )
  console.log('Weeks:', Object.values(weekMap).join(', '))

  const histSheet = doc.sheetsByTitle['historical_player_stats']
  if (!histSheet) { console.error('historical_player_stats sheet NOT FOUND'); process.exit(1) }
  const histRows = await histSheet.getRows()
  const histObjs = histRows.map(toObj)

  // Aggregate by player
  const stats = {}
  for (const h of histObjs) {
    const name = playerMap[h.player_id] ?? `UNKNOWN(${h.player_id})`
    if (!stats[name]) stats[name] = { pts: 0, wins: 0, gp: 0 }
    stats[name].pts += parseInt(h.points) || 0
    stats[name].wins += parseInt(h.wins) || 0
    stats[name].gp += parseInt(h.games_played) || 0
    console.log(`  ${weekMap[h.week_id]} → ${name}: ${h.points}pts, ${h.wins}W, ${h.games_played}GP`)
  }

  console.log('\n── Historical totals ──')
  Object.entries(stats)
    .sort((a, b) => b[1].pts - a[1].pts)
    .forEach(([name, s]) => console.log(`  ${name}: ${s.pts}pts  ${s.wins}W  ${s.gp}GP`))
}

main().catch((err) => { console.error(err.message); process.exit(1) })
