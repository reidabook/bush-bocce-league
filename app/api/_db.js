import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

// ─── Connection ────────────────────────────────────────────────────────────────

let _doc = null

async function getDoc() {
  if (_doc) return _doc
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth)
  await doc.loadInfo()
  _doc = doc
  return doc
}

async function sheet(name) {
  const doc = await getDoc()
  const s = doc.sheetsByTitle[name]
  if (!s) throw new Error(`Sheet "${name}" not found. Run GET /api/init-sheets to set up the spreadsheet.`)
  return s
}

// ─── Row cache (30s TTL, per warm Lambda instance) ────────────────────────────

const _cache = {}
const CACHE_TTL = 30_000

async function getRows(sheetName) {
  const now = Date.now()
  const hit = _cache[sheetName]
  if (hit && now - hit.ts < CACHE_TTL) return hit.rows
  const s = await sheet(sheetName)
  const rows = await s.getRows()
  _cache[sheetName] = { rows, ts: now }
  return rows
}

function invalidate(...names) {
  for (const n of names) delete _cache[n]
}

function toObj(row) {
  const obj = {}
  for (const key of row._worksheet.headerValues) {
    obj[key] = row.get(key) ?? ''
  }
  return obj
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function getPlayers() {
  const r = await getRows('players')
  return r
    .map(toObj)
    .filter((p) => p.active?.toLowerCase() === 'true')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function addPlayer(name) {
  const s = await sheet('players')
  const id = crypto.randomUUID()
  const created_at = new Date().toISOString()
  await s.addRow({ id, name: name.trim(), active: 'true', created_at })
  invalidate('players')
  return { id, name: name.trim(), active: true, created_at }
}

export async function deactivatePlayer(id) {
  const r = await getRows('players')
  const row = r.find((row) => row.get('id') === id)
  if (!row) throw new Error(`Player not found: ${id}`)
  row.set('active', 'false')
  await row.save()
  invalidate('players')
}

export async function addPlayerToTeam(weekId, teamId, playerId) {
  const [attendeeRows, tpRows] = await Promise.all([
    getRows('week_attendees'),
    getRows('team_players'),
  ])
  const alreadyAttending = attendeeRows.find(
    (r) => r.get('week_id') === weekId && r.get('player_id') === playerId
  )
  if (!alreadyAttending) {
    const s = await sheet('week_attendees')
    await s.addRow({ week_id: weekId, player_id: playerId })
  }
  const alreadyOnTeam = tpRows.find(
    (r) => r.get('team_id') === teamId && r.get('player_id') === playerId
  )
  if (!alreadyOnTeam) {
    const s = await sheet('team_players')
    await s.addRow({ team_id: teamId, player_id: playerId })
  }
  invalidate('week_attendees', 'team_players')
}

export async function renamePlayer(id, name) {
  const r = await getRows('players')
  const row = r.find((row) => row.get('id') === id)
  if (!row) throw new Error(`Player not found: ${id}`)
  row.set('name', name.trim())
  await row.save()
  invalidate('players')
}

// ─── Weeks ────────────────────────────────────────────────────────────────────

function parseWeek(obj) {
  return {
    ...obj,
    week_number: parseInt(obj.week_number) || 0,
    team_size: parseInt(obj.team_size) || 3,
  }
}

export async function getWeeks() {
  const r = await getRows('weeks')
  return r.map(toObj).map(parseWeek).sort((a, b) => a.week_number - b.week_number)
}

export async function getWeek(id) {
  const r = await getRows('weeks')
  const row = r.find((row) => row.get('id') === id)
  if (!row) throw new Error(`Week not found: ${id}`)
  return parseWeek(toObj(row))
}

export async function createWeek(weekNumber, date, teamSize) {
  const s = await sheet('weeks')
  const id = crypto.randomUUID()
  const created_at = new Date().toISOString()
  await s.addRow({
    id,
    week_number: String(weekNumber),
    date,
    team_size: String(teamSize),
    status: 'setup',
    created_at,
  })
  invalidate('weeks')
  return { id, week_number: weekNumber, date, team_size: teamSize, status: 'setup', created_at }
}

export async function updateWeekStatus(id, status) {
  const r = await getRows('weeks')
  const row = r.find((row) => row.get('id') === id)
  if (!row) throw new Error(`Week not found: ${id}`)
  row.set('status', status)
  await row.save()
  invalidate('weeks')
}

export async function updateWeekDate(id, date) {
  const r = await getRows('weeks')
  const row = r.find((row) => row.get('id') === id)
  if (!row) throw new Error(`Week not found: ${id}`)
  row.set('date', date)
  await row.save()
  invalidate('weeks')
}

export async function deleteWeek(id) {
  const [weekRows, attendeeRows, teamRows, tpRows, gameRows, depRows, exclRows] = await Promise.all([
    getRows('weeks'), getRows('week_attendees'), getRows('teams'), getRows('team_players'),
    getRows('games'), getRows('player_departures'), getRows('game_player_exclusions'),
  ])
  const weekGameIds = new Set(gameRows.filter((r) => r.get('week_id') === id).map((r) => r.get('id')))
  const weekTeamIds = new Set(teamRows.filter((r) => r.get('week_id') === id).map((r) => r.get('id')))
  await Promise.all(exclRows.filter((r) => weekGameIds.has(r.get('game_id'))).map((r) => r.delete()))
  await Promise.all(gameRows.filter((r) => r.get('week_id') === id).map((r) => r.delete()))
  await Promise.all(depRows.filter((r) => r.get('week_id') === id).map((r) => r.delete()))
  await Promise.all(tpRows.filter((r) => weekTeamIds.has(r.get('team_id'))).map((r) => r.delete()))
  await Promise.all(teamRows.filter((r) => r.get('week_id') === id).map((r) => r.delete()))
  await Promise.all(attendeeRows.filter((r) => r.get('week_id') === id).map((r) => r.delete()))
  const weekRow = weekRows.find((r) => r.get('id') === id)
  if (!weekRow) throw new Error(`Week not found: ${id}`)
  await weekRow.delete()
  invalidate('weeks', 'week_attendees', 'teams', 'team_players', 'games', 'player_departures', 'game_player_exclusions')
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendees(weekId) {
  const [attendeeRows, playerRows] = await Promise.all([getRows('week_attendees'), getRows('players')])
  const playerMap = Object.fromEntries(playerRows.map(toObj).map((p) => [p.id, p]))
  return attendeeRows
    .map(toObj)
    .filter((a) => a.week_id === weekId)
    .map((a) => playerMap[a.player_id])
    .filter(Boolean)
}

export async function setAttendees(weekId, playerIds) {
  const existing = await getRows('week_attendees')
  const toDelete = existing.filter((row) => row.get('week_id') === weekId)
  await Promise.all(toDelete.map((row) => row.delete()))
  if (playerIds.length > 0) {
    const s = await sheet('week_attendees')
    await s.addRows(playerIds.map((pid) => ({ week_id: weekId, player_id: pid })))
  }
  invalidate('week_attendees')
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeamsForWeek(weekId) {
  const [teamRows, tpRows, playerRows] = await Promise.all([
    getRows('teams'),
    getRows('team_players'),
    getRows('players'),
  ])
  const playerMap = Object.fromEntries(playerRows.map(toObj).map((p) => [p.id, p]))
  const tpObjs = tpRows.map(toObj)
  return teamRows
    .map(toObj)
    .filter((t) => t.week_id === weekId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({
      ...t,
      players: tpObjs
        .filter((tp) => tp.team_id === t.id)
        .map((tp) => playerMap[tp.player_id])
        .filter(Boolean),
    }))
}

export async function saveTeams(weekId, teams) {
  const [teamRows, tpRows] = await Promise.all([getRows('teams'), getRows('team_players')])
  const existingTeamRows = teamRows.filter((row) => row.get('week_id') === weekId)
  const existingTeamIds = new Set(existingTeamRows.map((row) => row.get('id')))
  const existingTpRows = tpRows.filter((row) => existingTeamIds.has(row.get('team_id')))

  // Delete team_players first (no orphans), then teams
  await Promise.all(existingTpRows.map((row) => row.delete()))
  await Promise.all(existingTeamRows.map((row) => row.delete()))

  const teamsSheet = await sheet('teams')
  const tpSheet = await sheet('team_players')

  for (let i = 0; i < teams.length; i++) {
    const teamId = crypto.randomUUID()
    await teamsSheet.addRow({ id: teamId, week_id: weekId, name: teams[i].name || `Team ${i + 1}` })
    if (teams[i].players.length > 0) {
      await tpSheet.addRows(teams[i].players.map((p) => ({ team_id: teamId, player_id: p.id })))
    }
  }
  invalidate('teams', 'team_players')
}

// ─── Games ────────────────────────────────────────────────────────────────────

function normalizeGame(obj) {
  return { ...obj, winner_team_id: obj.winner_team_id || null, notes: obj.notes || null }
}

export async function getGamesForWeek(weekId) {
  const r = await getRows('games')
  return r
    .map(toObj)
    .filter((g) => g.week_id === weekId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(normalizeGame)
}

export async function addGame(weekId, teamAId, teamBId, notes = null) {
  const s = await sheet('games')
  const id = crypto.randomUUID()
  const created_at = new Date().toISOString()
  await s.addRow({
    id,
    week_id: weekId,
    team_a_id: teamAId,
    team_b_id: teamBId,
    winner_team_id: '',
    notes: notes ?? '',
    created_at,
  })
  invalidate('games')
  return { id, week_id: weekId, team_a_id: teamAId, team_b_id: teamBId, winner_team_id: null, notes, created_at }
}

export async function recordGameResult(gameId, winnerTeamId) {
  const r = await getRows('games')
  const row = r.find((row) => row.get('id') === gameId)
  if (!row) throw new Error(`Game not found: ${gameId}`)
  row.set('winner_team_id', winnerTeamId)
  await row.save()
  invalidate('games')
}

export async function deleteGame(gameId) {
  const r = await getRows('games')
  const row = r.find((row) => row.get('id') === gameId)
  if (!row) throw new Error(`Game not found: ${gameId}`)
  await row.delete()
  invalidate('games')
}

export async function clearGameResult(gameId) {
  const r = await getRows('games')
  const row = r.find((row) => row.get('id') === gameId)
  if (!row) throw new Error(`Game not found: ${gameId}`)
  row.set('winner_team_id', '')
  await row.save()
  invalidate('games')
}

// ─── Departures ───────────────────────────────────────────────────────────────

export async function getDepartures(weekId) {
  const [depRows, playerRows] = await Promise.all([getRows('player_departures'), getRows('players')])
  const playerMap = Object.fromEntries(playerRows.map(toObj).map((p) => [p.id, p]))
  return depRows
    .map(toObj)
    .filter((d) => d.week_id === weekId)
    .sort((a, b) => new Date(a.departed_at) - new Date(b.departed_at))
    .map((d) => ({
      id: d.id,
      player_id: d.player_id,
      name: playerMap[d.player_id]?.name ?? '?',
      departed_at: d.departed_at,
    }))
}

export async function logDeparture(weekId, playerId) {
  const r = await getRows('player_departures')
  const existing = r.find(
    (row) => row.get('week_id') === weekId && row.get('player_id') === playerId
  )
  if (existing) {
    existing.set('departed_at', new Date().toISOString())
    await existing.save()
  } else {
    const s = await sheet('player_departures')
    await s.addRow({
      id: crypto.randomUUID(),
      week_id: weekId,
      player_id: playerId,
      departed_at: new Date().toISOString(),
    })
  }
  invalidate('player_departures')
}

export async function removeDeparture(weekId, playerId) {
  const r = await getRows('player_departures')
  const row = r.find(
    (row) => row.get('week_id') === weekId && row.get('player_id') === playerId
  )
  if (row) await row.delete()
  invalidate('player_departures')
}

// ─── Game Player Exclusions ───────────────────────────────────────────────────

export async function getGamePlayerExclusions(weekId) {
  const [gameRows, exclRows] = await Promise.all([
    getRows('games'),
    getRows('game_player_exclusions'),
  ])
  const gameIds = new Set(
    gameRows.map(toObj).filter((g) => g.week_id === weekId).map((g) => g.id)
  )
  return exclRows.map(toObj).filter((e) => gameIds.has(e.game_id))
}

export async function excludePlayerFromGame(gameId, playerId) {
  const r = await getRows('game_player_exclusions')
  const existing = r.find(
    (row) => row.get('game_id') === gameId && row.get('player_id') === playerId
  )
  if (!existing) {
    const s = await sheet('game_player_exclusions')
    await s.addRow({ id: crypto.randomUUID(), game_id: gameId, player_id: playerId })
  }
  invalidate('game_player_exclusions')
}

export async function restorePlayerToGame(gameId, playerId) {
  const r = await getRows('game_player_exclusions')
  const row = r.find(
    (row) => row.get('game_id') === gameId && row.get('player_id') === playerId
  )
  if (row) await row.delete()
  invalidate('game_player_exclusions')
}

// ─── Week manage snapshot (all data in one serverless call) ──────────────────

export async function getWeekManageData(weekId) {
  const [weekRows, teamRows, tpRows, playerRows, gameRows, depRows, exclRows] = await Promise.all([
    getRows('weeks'),
    getRows('teams'),
    getRows('team_players'),
    getRows('players'),
    getRows('games'),
    getRows('player_departures'),
    getRows('game_player_exclusions'),
  ])

  const weekRow = weekRows.find((r) => r.get('id') === weekId)
  if (!weekRow) throw new Error(`Week not found: ${weekId}`)
  const week = parseWeek(toObj(weekRow))

  const playerMap = Object.fromEntries(playerRows.map(toObj).map((p) => [p.id, p]))
  const allPlayers = playerRows.map(toObj)
    .filter((p) => p.active?.toLowerCase() === 'true')
    .sort((a, b) => a.name.localeCompare(b.name))

  const tpObjs = tpRows.map(toObj)
  const teams = teamRows
    .map(toObj)
    .filter((t) => t.week_id === weekId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({
      ...t,
      players: tpObjs
        .filter((tp) => tp.team_id === t.id)
        .map((tp) => playerMap[tp.player_id])
        .filter(Boolean),
    }))

  const games = gameRows
    .map(toObj)
    .filter((g) => g.week_id === weekId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(normalizeGame)

  const gameIds = new Set(games.map((g) => g.id))

  const departures = depRows
    .map(toObj)
    .filter((d) => d.week_id === weekId)
    .sort((a, b) => new Date(a.departed_at) - new Date(b.departed_at))
    .map((d) => ({
      id: d.id,
      player_id: d.player_id,
      name: playerMap[d.player_id]?.name ?? '?',
      departed_at: d.departed_at,
    }))

  const exclusions = exclRows.map(toObj).filter((e) => gameIds.has(e.game_id))

  return { week, teams, games, departures, exclusions, allPlayers }
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function getStandings() {
  const [playerRows, weekRows, gameRows, tpRows, depRows, exclRows, attendeeRows, histRows] =
    await Promise.all([
      getRows('players'),
      getRows('weeks'),
      getRows('games'),
      getRows('team_players'),
      getRows('player_departures'),
      getRows('game_player_exclusions'),
      getRows('week_attendees'),
      getRows('historical_player_stats'),
    ])

  const players = playerRows.map(toObj).filter((p) => p.active?.toLowerCase() === 'true')

  const allWeeks = weekRows.map(toObj)
  const completedWeekIds = new Set(
    allWeeks.filter((w) => w.status === 'completed').map((w) => w.id)
  )
  const historicalWeekIds = new Set(
    allWeeks.filter((w) => w.status === 'historical').map((w) => w.id)
  )

  const completedGames = gameRows
    .map(toObj)
    .map(normalizeGame)
    .filter((g) => completedWeekIds.has(g.week_id) && g.winner_team_id)

  const completedGameIds = new Set(completedGames.map((g) => g.id))

  // team_id → [player_id]
  const teamPlayers = {}
  tpRows.map(toObj).forEach((tp) => {
    if (!teamPlayers[tp.team_id]) teamPlayers[tp.team_id] = []
    teamPlayers[tp.team_id].push(tp.player_id)
  })

  // departure map: week_id → { player_id → departed_at_ms }
  const departureMap = {}
  depRows.map(toObj).forEach((d) => {
    if (completedWeekIds.has(d.week_id)) {
      if (!departureMap[d.week_id]) departureMap[d.week_id] = {}
      departureMap[d.week_id][d.player_id] = new Date(d.departed_at).getTime()
    }
  })

  const exclusionSet = new Set(
    exclRows
      .map(toObj)
      .filter((e) => completedGameIds.has(e.game_id))
      .map((e) => `${e.game_id}:${e.player_id}`)
  )

  // Build week_id → date map so we can deduplicate by calendar date.
  // Two week entries on the same date (e.g. a session that split then merged teams)
  // should count as ONE session attended, not two.
  const weekDateMap = {}
  allWeeks.forEach((w) => { weekDateMap[w.id] = w.date })

  const sessionCount = {}
  const sessionDates = {} // player_id → Set<date>
  attendeeRows.map(toObj).forEach((a) => {
    if (completedWeekIds.has(a.week_id) || historicalWeekIds.has(a.week_id)) {
      if (!sessionDates[a.player_id]) sessionDates[a.player_id] = new Set()
      sessionDates[a.player_id].add(weekDateMap[a.week_id] ?? a.week_id)
    }
  })
  Object.entries(sessionDates).forEach(([pid, dates]) => {
    sessionCount[pid] = dates.size
  })

  function departed(weekId, playerId, gameCreatedAt) {
    const t = departureMap[weekId]?.[playerId]
    return t !== undefined && t < new Date(gameCreatedAt).getTime()
  }

  const stats = {}
  players.forEach((p) => {
    stats[p.id] = {
      ...p,
      active: true,
      points: 0,
      wins: 0,
      gamesPlayed: 0,
      sessions: sessionCount[p.id] || 0,
    }
  })

  // Merge pre-computed stats for historical weeks
  histRows.map(toObj).forEach((h) => {
    if (!stats[h.player_id]) return
    stats[h.player_id].points += parseInt(h.points) || 0
    stats[h.player_id].wins += parseInt(h.wins) || 0
    stats[h.player_id].gamesPlayed += parseInt(h.games_played) || 0
  })

  completedGames.forEach((game) => {
    const teamAPlayers = teamPlayers[game.team_a_id] || []
    const teamBPlayers = teamPlayers[game.team_b_id] || []
    const allPlayers = [...teamAPlayers, ...teamBPlayers]
    const winners = game.winner_team_id === game.team_a_id ? teamAPlayers : teamBPlayers

    allPlayers.forEach((pid) => {
      if (
        stats[pid] &&
        !departed(game.week_id, pid, game.created_at) &&
        !exclusionSet.has(`${game.id}:${pid}`)
      ) {
        stats[pid].gamesPlayed++
        stats[pid].points += 1
      }
    })
    winners.forEach((pid) => {
      if (
        stats[pid] &&
        !departed(game.week_id, pid, game.created_at) &&
        !exclusionSet.has(`${game.id}:${pid}`)
      ) {
        stats[pid].wins++
        stats[pid].points += 3
      }
    })
  })

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const aRate = a.gamesPlayed ? a.wins / a.gamesPlayed : 0
    const bRate = b.gamesPlayed ? b.wins / b.gamesPlayed : 0
    if (bRate !== aRate) return bRate - aRate
    if (b.sessions !== a.sessions) return b.sessions - a.sessions
    return a.name.localeCompare(b.name)
  })
}

// ─── Tournament ───────────────────────────────────────────────────────────────

export async function getTournament() {
  const r = await getRows('tournament')
  const objs = r.map(toObj).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return objs[0] ?? null
}

export async function createTournament(seededPlayerIds) {
  const tSheet = await sheet('tournament')
  const mSheet = await sheet('tournament_matches')
  const tournamentId = crypto.randomUUID()
  await tSheet.addRow({
    id: tournamentId,
    status: 'active',
    format: 'single_elimination',
    created_at: new Date().toISOString(),
  })

  const matches = []
  const n = seededPlayerIds.length
  for (let i = 0; i < Math.floor(n / 2); i++) {
    matches.push({
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round: '1',
      position: String(i + 1),
      player_a_id: seededPlayerIds[i],
      player_b_id: seededPlayerIds[n - 1 - i],
      winner_id: '',
      is_bye: 'false',
    })
  }
  if (n % 2 === 1) {
    const byePlayer = seededPlayerIds[Math.floor(n / 2)]
    matches.push({
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round: '1',
      position: String(Math.floor(n / 2) + 1),
      player_a_id: byePlayer,
      player_b_id: '',
      winner_id: byePlayer,
      is_bye: 'true',
    })
  }
  if (matches.length > 0) await mSheet.addRows(matches)
  invalidate('tournament', 'tournament_matches')
  return { id: tournamentId, status: 'active', format: 'single_elimination' }
}

export async function getTournamentMatches(tournamentId) {
  const [matchRows, playerRows] = await Promise.all([
    getRows('tournament_matches'),
    getRows('players'),
  ])
  const playerMap = Object.fromEntries(playerRows.map(toObj).map((p) => [p.id, p]))
  return matchRows
    .map(toObj)
    .filter((m) => m.tournament_id === tournamentId)
    .sort((a, b) => {
      const rd = parseInt(a.round) - parseInt(b.round)
      return rd !== 0 ? rd : parseInt(a.position) - parseInt(b.position)
    })
    .map((m) => ({
      ...m,
      round: parseInt(m.round),
      position: parseInt(m.position),
      is_bye: m.is_bye === 'true',
      winner_id: m.winner_id || null,
      player_a_id: m.player_a_id || null,
      player_b_id: m.player_b_id || null,
      player_a: m.player_a_id ? (playerMap[m.player_a_id] ?? null) : null,
      player_b: m.player_b_id ? (playerMap[m.player_b_id] ?? null) : null,
      winner: m.winner_id ? (playerMap[m.winner_id] ?? null) : null,
    }))
}

export async function recordMatchResult(matchId, winnerId, tournamentId, round, position) {
  const r = await getRows('tournament_matches')
  const row = r.find((row) => row.get('id') === matchId)
  if (!row) throw new Error(`Match not found: ${matchId}`)
  row.set('winner_id', winnerId)
  await row.save()

  // Advance winner to next round
  const nextRound = round + 1
  const nextPosition = Math.ceil(position / 2)

  const existing = r.find(
    (row) =>
      row.get('tournament_id') === tournamentId &&
      row.get('round') === String(nextRound) &&
      row.get('position') === String(nextPosition)
  )

  if (existing) {
    const slot = existing.get('player_a_id') ? 'player_b_id' : 'player_a_id'
    existing.set(slot, winnerId)
    await existing.save()
  } else {
    const s = await sheet('tournament_matches')
    await s.addRow({
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round: String(nextRound),
      position: String(nextPosition),
      player_a_id: winnerId,
      player_b_id: '',
      winner_id: '',
      is_bye: 'false',
    })
  }
  invalidate('tournament_matches')
}

export async function completeTournament(tournamentId) {
  const r = await getRows('tournament')
  const row = r.find((row) => row.get('id') === tournamentId)
  if (!row) throw new Error(`Tournament not found: ${tournamentId}`)
  row.set('status', 'complete')
  await row.save()
  invalidate('tournament')
}
