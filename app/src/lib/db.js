// Thin HTTP client — all DB calls go through /api/sheets (server-side Google Sheets layer)

async function call(action, params = {}) {
  const res = await fetch('/api/sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'API error')
  return json.result
}

// ─── Players ────────────────────────────────────────────────────────────────

export async function getPlayers() { return call('getPlayers') }
export async function addPlayer(name) { return call('addPlayer', { name }) }
export async function deactivatePlayer(id) { return call('deactivatePlayer', { id }) }

// ─── Weeks ───────────────────────────────────────────────────────────────────

export async function getWeeks() { return call('getWeeks') }
export async function getWeek(id) { return call('getWeek', { id }) }
export async function createWeek(weekNumber, date, teamSize) { return call('createWeek', { weekNumber, date, teamSize }) }
export async function updateWeekStatus(id, status) { return call('updateWeekStatus', { id, status }) }

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendees(weekId) { return call('getAttendees', { weekId }) }
export async function setAttendees(weekId, playerIds) { return call('setAttendees', { weekId, playerIds }) }

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeamsForWeek(weekId) { return call('getTeamsForWeek', { weekId }) }
export async function saveTeams(weekId, teams) { return call('saveTeams', { weekId, teams }) }

// ─── Games ────────────────────────────────────────────────────────────────────

export async function getGamesForWeek(weekId) { return call('getGamesForWeek', { weekId }) }
export async function addGame(weekId, teamAId, teamBId, notes = null) { return call('addGame', { weekId, teamAId, teamBId, notes }) }
export async function recordGameResult(gameId, winnerTeamId) { return call('recordGameResult', { gameId, winnerTeamId }) }
export async function deleteGame(gameId) { return call('deleteGame', { gameId }) }
export async function clearGameResult(gameId) { return call('clearGameResult', { gameId }) }

// ─── Departures ───────────────────────────────────────────────────────────────

export async function getDepartures(weekId) { return call('getDepartures', { weekId }) }
export async function logDeparture(weekId, playerId) { return call('logDeparture', { weekId, playerId }) }
export async function removeDeparture(weekId, playerId) { return call('removeDeparture', { weekId, playerId }) }

// ─── Game Player Exclusions ───────────────────────────────────────────────────

export async function getGamePlayerExclusions(weekId) { return call('getGamePlayerExclusions', { weekId }) }
export async function excludePlayerFromGame(gameId, playerId) { return call('excludePlayerFromGame', { gameId, playerId }) }
export async function restorePlayerToGame(gameId, playerId) { return call('restorePlayerToGame', { gameId, playerId }) }

// ─── Standings ────────────────────────────────────────────────────────────────

export async function getStandings() { return call('getStandings') }

// ─── Tournament ───────────────────────────────────────────────────────────────

export async function getTournament() { return call('getTournament') }
export async function createTournament(seededPlayerIds) { return call('createTournament', { seededPlayerIds }) }
export async function getTournamentMatches(tournamentId) { return call('getTournamentMatches', { tournamentId }) }
export async function recordMatchResult(matchId, winnerId, tournamentId, round, position) {
  return call('recordMatchResult', { matchId, winnerId, tournamentId, round, position })
}
export async function completeTournament(tournamentId) { return call('completeTournament', { tournamentId }) }
