import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

const SHEETS = [
  { title: 'players',               headers: ['id', 'name', 'active', 'created_at'] },
  { title: 'weeks',                 headers: ['id', 'week_number', 'date', 'team_size', 'status', 'created_at'] },
  { title: 'week_attendees',        headers: ['week_id', 'player_id'] },
  { title: 'teams',                 headers: ['id', 'week_id', 'name'] },
  { title: 'team_players',          headers: ['team_id', 'player_id'] },
  { title: 'games',                 headers: ['id', 'week_id', 'team_a_id', 'team_b_id', 'winner_team_id', 'notes', 'created_at'] },
  { title: 'player_departures',     headers: ['id', 'week_id', 'player_id', 'departed_at'] },
  { title: 'game_player_exclusions',headers: ['id', 'game_id', 'player_id'] },
  { title: 'tournament',              headers: ['id', 'status', 'format', 'created_at'] },
  { title: 'tournament_matches',      headers: ['id', 'tournament_id', 'round', 'position', 'player_a_id', 'player_b_id', 'winner_id', 'is_bye'] },
  { title: 'historical_player_stats', headers: ['id', 'week_id', 'player_id', 'points', 'wins', 'games_played'] },
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth)
    await doc.loadInfo()

    const results = []

    for (const { title, headers } of SHEETS) {
      let s = doc.sheetsByTitle[title]
      if (!s) {
        s = await doc.addSheet({ title, headerValues: headers })
        results.push({ title, action: 'created' })
      } else {
        results.push({ title, action: 'already exists' })
      }
      await s.updateProperties({ hidden: true })
    }

    return res.json({ ok: true, sheets: results })
  } catch (err) {
    console.error('init-sheets error:', err)
    return res.status(500).json({ error: err.message })
  }
}
