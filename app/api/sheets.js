import * as db from './_db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, ...params } = req.body

  try {
    let result
    switch (action) {
      // Players
      case 'getPlayers':
        result = await db.getPlayers()
        break
      case 'addPlayer':
        result = await db.addPlayer(params.name)
        break
      case 'deactivatePlayer':
        await db.deactivatePlayer(params.id)
        result = null
        break
      case 'renamePlayer':
        await db.renamePlayer(params.id, params.name)
        result = null
        break
      case 'addPlayerToTeam':
        await db.addPlayerToTeam(params.sessionId, params.teamId, params.playerId)
        result = null
        break

      // Sessions
      case 'getSessions':
        result = await db.getSessions()
        break
      case 'getSession':
        result = await db.getSession(params.id)
        break
      case 'createSession':
        result = await db.createSession(params.sessionNumber, params.date, params.teamSize)
        break
      case 'updateSessionStatus':
        await db.updateSessionStatus(params.id, params.status)
        result = null
        break
      case 'updateSessionDate':
        await db.updateSessionDate(params.id, params.date)
        result = null
        break
      case 'deleteSession':
        await db.deleteSession(params.id)
        result = null
        break

      case 'getSessionManageData':
        result = await db.getSessionManageData(params.id)
        break

      // Attendance
      case 'getAttendees':
        result = await db.getAttendees(params.sessionId)
        break
      case 'setAttendees':
        await db.setAttendees(params.sessionId, params.playerIds)
        result = null
        break

      // Teams
      case 'getTeamsForSession':
        result = await db.getTeamsForSession(params.sessionId)
        break
      case 'saveTeams':
        await db.saveTeams(params.sessionId, params.teams)
        result = null
        break

      // Games
      case 'getGamesForSession':
        result = await db.getGamesForSession(params.sessionId)
        break
      case 'addGame':
        result = await db.addGame(params.sessionId, params.teamAId, params.teamBId, params.notes)
        break
      case 'recordGameResult':
        await db.recordGameResult(params.gameId, params.winnerTeamId)
        result = null
        break
      case 'deleteGame':
        await db.deleteGame(params.gameId)
        result = null
        break
      case 'clearGameResult':
        await db.clearGameResult(params.gameId)
        result = null
        break

      // Departures
      case 'getDepartures':
        result = await db.getDepartures(params.sessionId)
        break
      case 'logDeparture':
        await db.logDeparture(params.sessionId, params.playerId)
        result = null
        break
      case 'removeDeparture':
        await db.removeDeparture(params.sessionId, params.playerId)
        result = null
        break

      // Game player exclusions
      case 'getGamePlayerExclusions':
        result = await db.getGamePlayerExclusions(params.sessionId)
        break
      case 'excludePlayerFromGame':
        await db.excludePlayerFromGame(params.gameId, params.playerId)
        result = null
        break
      case 'restorePlayerToGame':
        await db.restorePlayerToGame(params.gameId, params.playerId)
        result = null
        break

      // Standings
      case 'getStandings':
        result = await db.getStandings()
        break

      // Tournament
      case 'getTournament':
        result = await db.getTournament()
        break
      case 'createTournament':
        result = await db.createTournament(params.seededPlayerIds)
        break
      case 'getTournamentMatches':
        result = await db.getTournamentMatches(params.tournamentId)
        break
      case 'recordMatchResult':
        await db.recordMatchResult(
          params.matchId,
          params.winnerId,
          params.tournamentId,
          params.round,
          params.position
        )
        result = null
        break
      case 'completeTournament':
        await db.completeTournament(params.tournamentId)
        result = null
        break

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    return res.json({ result: result ?? null })
  } catch (err) {
    console.error(`DB action "${action}" failed:`, err)
    return res.status(500).json({ error: err.message })
  }
}
