// Thin HTTP client — all DB calls go through /api/sheets (server-side Google Sheets layer)

async function call(action, params = {}) {
  let res
  try {
    res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    })
  } catch (networkErr) {
    throw new Error(`Network error calling ${action}: ${networkErr.message}. Check /api/debug for connection status.`)
  }
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`Server returned non-JSON response (status ${res.status}) for action "${action}". The API function may have timed out or crashed.`)
  }
  if (!res.ok) throw new Error(json.error ?? `API error (status ${res.status}) for action "${action}"`)
  return json.result
}

// ─── Players ────────────────────────────────────────────────────────────────

export async function getPlayers() { return call('getPlayers') }
export async function addPlayer(name) { return call('addPlayer', { name }) }
export async function deactivatePlayer(id) { return call('deactivatePlayer', { id }) }
export async function renamePlayer(id, name) { return call('renamePlayer', { id, name }) }
export async function addPlayerToTeam(sessionId, teamId, playerId) { return call('addPlayerToTeam', { sessionId, teamId, playerId }) }

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions() { return call('getSessions') }
export async function getSession(id) { return call('getSession', { id }) }
export async function createSession(sessionNumber, date, teamSize) { return call('createSession', { sessionNumber, date, teamSize }) }
export async function updateSessionStatus(id, status) { return call('updateSessionStatus', { id, status }) }
export async function updateSessionDate(id, date) { return call('updateSessionDate', { id, date }) }
export async function deleteSession(id) { return call('deleteSession', { id }) }
export async function getSessionManageData(id) { return call('getSessionManageData', { id }) }

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendees(sessionId) { return call('getAttendees', { sessionId }) }
export async function setAttendees(sessionId, playerIds) { return call('setAttendees', { sessionId, playerIds }) }

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeamsForSession(sessionId) { return call('getTeamsForSession', { sessionId }) }
export async function saveTeams(sessionId, teams) { return call('saveTeams', { sessionId, teams }) }

// ─── Games ────────────────────────────────────────────────────────────────────

export async function getGamesForSession(sessionId) { return call('getGamesForSession', { sessionId }) }
export async function addGame(sessionId, teamAId, teamBId, notes = null) { return call('addGame', { sessionId, teamAId, teamBId, notes }) }
export async function recordGameResult(gameId, winnerTeamId) { return call('recordGameResult', { gameId, winnerTeamId }) }
export async function deleteGame(gameId) { return call('deleteGame', { gameId }) }
export async function clearGameResult(gameId) { return call('clearGameResult', { gameId }) }

// ─── Departures ───────────────────────────────────────────────────────────────

export async function getDepartures(sessionId) { return call('getDepartures', { sessionId }) }
export async function logDeparture(sessionId, playerId) { return call('logDeparture', { sessionId, playerId }) }
export async function removeDeparture(sessionId, playerId) { return call('removeDeparture', { sessionId, playerId }) }

// ─── Game Player Exclusions ───────────────────────────────────────────────────

export async function getGamePlayerExclusions(sessionId) { return call('getGamePlayerExclusions', { sessionId }) }
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
