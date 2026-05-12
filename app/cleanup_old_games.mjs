/**
 * Cleanup: delete game/team/team_player rows for historical weeks (1 & 2)
 * Sequential deletes to avoid 503s from Google API
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env.local') })

import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

async function del(row) {
  try {
    await row.delete()
    return true
  } catch (e) {
    if (e?.response?.status === 503) {
      await new Promise((r) => setTimeout(r, 2000))
      await row.delete()
      return true
    }
    throw e
  }
}

async function main() {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth)
  await doc.loadInfo()

  const weeksSheet = doc.sheetsByTitle['weeks']
  const weekRows = await weeksSheet.getRows()
  const historicalWeekIds = new Set(
    weekRows.filter((r) => r.get('status') === 'historical').map((r) => r.get('id'))
  )
  console.log(`Historical week IDs: ${[...historicalWeekIds].join(', ')}`)

  const teamsSheet = doc.sheetsByTitle['teams']
  const tpSheet = doc.sheetsByTitle['team_players']
  const gamesSheet = doc.sheetsByTitle['games']

  const teamRows = await teamsSheet.getRows()
  const targetTeamRows = teamRows.filter((r) => historicalWeekIds.has(r.get('week_id')))
  const targetTeamIds = new Set(targetTeamRows.map((r) => r.get('id')))
  console.log(`Teams to delete: ${targetTeamRows.length}`)

  const tpRows = await tpSheet.getRows()
  const targetTpRows = tpRows.filter((r) => targetTeamIds.has(r.get('team_id')))
  console.log(`team_players to delete: ${targetTpRows.length}`)

  for (const row of targetTpRows) {
    await del(row)
    process.stdout.write('.')
  }
  console.log(`\nDeleted ${targetTpRows.length} team_players`)

  for (const row of targetTeamRows) {
    await del(row)
    process.stdout.write('.')
  }
  console.log(`\nDeleted ${targetTeamRows.length} teams`)

  const gameRows = await gamesSheet.getRows()
  const targetGameRows = gameRows.filter((r) => historicalWeekIds.has(r.get('week_id')))
  console.log(`Games to delete: ${targetGameRows.length}`)
  for (const row of targetGameRows) {
    await del(row)
    process.stdout.write('.')
  }
  console.log(`\nDeleted ${targetGameRows.length} games`)

  console.log('\nCleanup done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
