// In-memory stand-in for /api/sheets, used by the e2e suite.
//
// Rows are stored the way the Google Sheet stores them (string values,
// tab names from ARCHITECTURE.md) and every action returns the same shape as
// api/_db.js. Standings use the real scoring code (api/_standingsLogic.js),
// so the suite checks real points without touching the league's spreadsheet.

import { computeStandings, normalizeGame } from '../../api/_standingsLogic.js'
import { buildBracket, nextSlot, isFinal } from '../../api/_bracketLogic.js'

let lastTs = 0
// Strictly increasing timestamps so "left before game N" ordering is exact.
function nowIso() {
  lastTs = Math.max(Date.now(), lastTs + 1)
  return new Date(lastTs).toISOString()
}

let seq = 0
const uid = (prefix) => `${prefix}-${++seq}`

const parseSession = (s) => ({ ...s, session_number: parseInt(s.session_number) || 0, team_size: parseInt(s.team_size) || 3 })

export function createStore() {
  return {
    players: [],
    sessions: [],
    week_attendees: [],
    teams: [],
    team_players: [],
    games: [],
    player_departures: [],
    game_player_exclusions: [],
    historical_player_stats: [],
    tournament: [],
    tournament_matches: [],
  }
}

// ─── Seeding helpers (tests set up state directly, like the old Supabase seeds) ──

export function seedPlayers(store, names) {
  return names.map((name) => {
    const p = { id: uid('p'), name, active: 'true', created_at: nowIso() }
    store.players.push(p)
    return p
  })
}

// teams: [{ name, players: [player, ...] }]
export function seedSession(store, { number, date, status = 'active', teams = [] }) {
  const s = { id: uid('s'), session_number: String(number), date, status, team_size: String(teams.length || 2), created_at: nowIso() }
  store.sessions.push(s)
  const made = teams.map((t) => {
    const team = { id: uid('t'), week_id: s.id, name: t.name }
    store.teams.push(team)
    t.players.forEach((p) => {
      store.team_players.push({ team_id: team.id, player_id: p.id })
      if (!store.week_attendees.some((a) => a.week_id === s.id && a.player_id === p.id)) {
        store.week_attendees.push({ week_id: s.id, player_id: p.id })
      }
    })
    return team
  })
  return { session: s, teams: made }
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

function playerMap(store) {
  return Object.fromEntries(store.players.map((p) => [p.id, p]))
}

function teamsFor(store, weekId) {
  const pm = playerMap(store)
  return store.teams
    .filter((t) => t.week_id === weekId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({
      ...t,
      players: store.team_players.filter((tp) => tp.team_id === t.id).map((tp) => pm[tp.player_id]).filter(Boolean),
    }))
}

function gamesFor(store, weekId) {
  return store.games
    .filter((g) => g.week_id === weekId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(normalizeGame)
}

function departuresFor(store, weekId) {
  const pm = playerMap(store)
  return store.player_departures
    .filter((d) => d.week_id === weekId)
    .sort((a, b) => new Date(a.departed_at) - new Date(b.departed_at))
    .map((d) => ({ id: d.id, player_id: d.player_id, name: pm[d.player_id]?.name ?? '?', departed_at: d.departed_at }))
}

function exclusionsFor(store, weekId) {
  const ids = new Set(store.games.filter((g) => g.week_id === weekId).map((g) => g.id))
  return store.game_player_exclusions.filter((e) => ids.has(e.game_id))
}

function mustFind(rows, pred, what) {
  const row = rows.find(pred)
  if (!row) throw new Error(`${what} not found`)
  return row
}

// ─── Action router (mirrors api/sheets.js → api/_db.js) ─────────────────────

export function handle(store, { action, ...p }) {
  switch (action) {
    case 'getPlayers':
      return store.players.filter((x) => x.active === 'true').sort((a, b) => a.name.localeCompare(b.name))
    case 'addPlayer': {
      const x = { id: uid('p'), name: p.name.trim(), active: 'true', created_at: nowIso() }
      store.players.push(x)
      return { ...x, active: true }
    }
    case 'deactivatePlayer':
      mustFind(store.players, (x) => x.id === p.id, 'Player').active = 'false'
      return null
    case 'renamePlayer':
      mustFind(store.players, (x) => x.id === p.id, 'Player').name = p.name.trim()
      return null
    case 'addPlayerToTeam':
      if (!store.week_attendees.some((a) => a.week_id === p.sessionId && a.player_id === p.playerId)) {
        store.week_attendees.push({ week_id: p.sessionId, player_id: p.playerId })
      }
      if (!store.team_players.some((tp) => tp.team_id === p.teamId && tp.player_id === p.playerId)) {
        store.team_players.push({ team_id: p.teamId, player_id: p.playerId })
      }
      return null

    case 'getSessions':
      return store.sessions.map(parseSession).sort((a, b) => a.session_number - b.session_number)
    case 'getSession':
      return parseSession(mustFind(store.sessions, (s) => s.id === p.id, `Session ${p.id}`))
    case 'createSession': {
      const s = { id: uid('s'), session_number: String(p.sessionNumber), date: p.date, team_size: String(p.teamSize), status: 'setup', created_at: nowIso() }
      store.sessions.push(s)
      return parseSession(s)
    }
    case 'updateSessionStatus':
      mustFind(store.sessions, (s) => s.id === p.id, 'Session').status = p.status
      return null
    case 'updateSessionDate':
      mustFind(store.sessions, (s) => s.id === p.id, 'Session').date = p.date
      return null
    case 'deleteSession': {
      mustFind(store.sessions, (s) => s.id === p.id, 'Session')
      const gameIds = new Set(store.games.filter((g) => g.week_id === p.id).map((g) => g.id))
      const teamIds = new Set(store.teams.filter((t) => t.week_id === p.id).map((t) => t.id))
      store.game_player_exclusions = store.game_player_exclusions.filter((e) => !gameIds.has(e.game_id))
      store.games = store.games.filter((g) => g.week_id !== p.id)
      store.player_departures = store.player_departures.filter((d) => d.week_id !== p.id)
      store.team_players = store.team_players.filter((tp) => !teamIds.has(tp.team_id))
      store.teams = store.teams.filter((t) => t.week_id !== p.id)
      store.week_attendees = store.week_attendees.filter((a) => a.week_id !== p.id)
      store.sessions = store.sessions.filter((s) => s.id !== p.id)
      return null
    }
    case 'getSessionManageData': {
      const session = parseSession(mustFind(store.sessions, (s) => s.id === p.id, `Session ${p.id}`))
      return {
        session,
        teams: teamsFor(store, p.id),
        games: gamesFor(store, p.id),
        departures: departuresFor(store, p.id),
        exclusions: exclusionsFor(store, p.id),
        allPlayers: store.players.filter((x) => x.active === 'true').sort((a, b) => a.name.localeCompare(b.name)),
      }
    }

    case 'getAttendees': {
      const pm = playerMap(store)
      return store.week_attendees.filter((a) => a.week_id === p.sessionId).map((a) => pm[a.player_id]).filter(Boolean)
    }
    case 'setAttendees':
      store.week_attendees = store.week_attendees.filter((a) => a.week_id !== p.sessionId)
      p.playerIds.forEach((id) => store.week_attendees.push({ week_id: p.sessionId, player_id: id }))
      return null

    case 'getTeamsForSession':
      return teamsFor(store, p.sessionId)
    case 'saveTeams': {
      const old = new Set(store.teams.filter((t) => t.week_id === p.sessionId).map((t) => t.id))
      store.team_players = store.team_players.filter((tp) => !old.has(tp.team_id))
      store.teams = store.teams.filter((t) => t.week_id !== p.sessionId)
      p.teams.forEach((t, i) => {
        const team = { id: uid('t'), week_id: p.sessionId, name: t.name || `Team ${i + 1}` }
        store.teams.push(team)
        t.players.forEach((pl) => store.team_players.push({ team_id: team.id, player_id: pl.id }))
      })
      return null
    }

    case 'getGamesForSession':
      return gamesFor(store, p.sessionId)
    case 'addGame': {
      const g = { id: uid('g'), week_id: p.sessionId, team_a_id: p.teamAId, team_b_id: p.teamBId, winner_team_id: '', notes: p.notes ?? '', created_at: nowIso() }
      store.games.push(g)
      return normalizeGame(g)
    }
    case 'recordGameResult':
      mustFind(store.games, (g) => g.id === p.gameId, 'Game').winner_team_id = p.winnerTeamId ?? ''
      return null
    case 'clearGameResult':
      mustFind(store.games, (g) => g.id === p.gameId, 'Game').winner_team_id = ''
      return null
    case 'deleteGame':
      mustFind(store.games, (g) => g.id === p.gameId, 'Game')
      store.games = store.games.filter((g) => g.id !== p.gameId)
      return null

    case 'getDepartures':
      return departuresFor(store, p.sessionId)
    case 'logDeparture': {
      const existing = store.player_departures.find((d) => d.week_id === p.sessionId && d.player_id === p.playerId)
      if (existing) existing.departed_at = nowIso()
      else store.player_departures.push({ id: uid('d'), week_id: p.sessionId, player_id: p.playerId, departed_at: nowIso() })
      return null
    }
    case 'removeDeparture':
      store.player_departures = store.player_departures.filter((d) => !(d.week_id === p.sessionId && d.player_id === p.playerId))
      return null

    case 'getGamePlayerExclusions':
      return exclusionsFor(store, p.sessionId)
    case 'excludePlayerFromGame':
      if (!store.game_player_exclusions.some((e) => e.game_id === p.gameId && e.player_id === p.playerId)) {
        store.game_player_exclusions.push({ id: uid('e'), game_id: p.gameId, player_id: p.playerId })
      }
      return null
    case 'restorePlayerToGame':
      store.game_player_exclusions = store.game_player_exclusions.filter((e) => !(e.game_id === p.gameId && e.player_id === p.playerId))
      return null

    case 'getStandings':
      return computeStandings({
        players: store.players,
        sessions: store.sessions,
        games: store.games,
        teamPlayers: store.team_players,
        departures: store.player_departures,
        exclusions: store.game_player_exclusions,
        historicalStats: store.historical_player_stats,
      })

    case 'getTournament':
      return [...store.tournament].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null
    case 'createTournament': {
      const rows = buildBracket(p.seededPlayerIds)
      const t = { id: uid('tour'), status: 'active', format: 'single_elimination', created_at: nowIso() }
      store.tournament.push(t)
      rows.forEach((m) => store.tournament_matches.push({ id: uid('m'), tournament_id: t.id, ...m }))
      return { id: t.id, status: t.status, format: t.format }
    }
    case 'getTournamentMatches': {
      const pm = playerMap(store)
      return store.tournament_matches
        .filter((m) => m.tournament_id === p.tournamentId)
        .sort((a, b) => (parseInt(a.round) - parseInt(b.round)) || (parseInt(a.position) - parseInt(b.position)))
        .map((m) => ({
          ...m,
          round: parseInt(m.round),
          position: parseInt(m.position),
          is_bye: m.is_bye === 'true',
          winner_id: m.winner_id || null,
          player_a_id: m.player_a_id || null,
          player_b_id: m.player_b_id || null,
          player_a: m.player_a_id ? (pm[m.player_a_id] ?? null) : null,
          player_b: m.player_b_id ? (pm[m.player_b_id] ?? null) : null,
          winner: m.winner_id ? (pm[m.winner_id] ?? null) : null,
        }))
    }
    case 'recordMatchResult': {
      const m = mustFind(store.tournament_matches, (x) => x.id === p.matchId, 'Match')
      const previous = m.winner_id || ''
      m.winner_id = p.winnerId ?? ''
      const mine = store.tournament_matches.filter((x) => x.tournament_id === p.tournamentId)
      if (!isFinal(mine, p.round)) {
        const next = nextSlot(p.round, p.position)
        const target = mine.find((x) => x.round === String(next.round) && x.position === String(next.position))
        if (target && (p.winnerId || target[next.slot] === previous)) target[next.slot] = p.winnerId ?? ''
      }
      return null
    }
    case 'completeTournament':
      mustFind(store.tournament, (t) => t.id === p.tournamentId, 'Tournament').status = 'complete'
      return null

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// Route /api/sheets for a Playwright page/context to this store.
// Errors come back as { error } with status 500, like api/sheets.js.
export async function installFakeBackend(target, store) {
  await target.route('**/api/sheets', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    try {
      const result = handle(store, body)
      await route.fulfill({ json: { result: result ?? null } })
    } catch (e) {
      await route.fulfill({ status: 500, json: { error: e.message } })
    }
  })
}
