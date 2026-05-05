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

      // Weeks
      case 'getWeeks':
        result = await db.getWeeks()
        break
      case 'getWeek':
        result = await db.getWeek(params.id)
        break
      case 'createWeek':
        result = await db.createWeek(params.weekNumber, params.date, params.teamSize)
        break
      case 'updateWeekStatus':
        await db.updateWeekStatus(params.id, params.status)
        result = null
        break

      // Attendance
      case 'getAttendees':
        result = await db.getAttendees(params.weekId)
        break
      case 'setAttendees':
        await db.setAttendees(params.weekId, params.playerIds)
        result = null
        break

      // Teams
      case 'getTeamsForWeek':
        result = await db.getTeamsForWeek(params.weekId)
        break
      case 'saveTeams':
        await db.saveTeams(params.weekId, params.teams)
        result = null
        break

      // Games
      case 'getGamesForWeek':
        result = await db.getGamesForWeek(params.weekId)
        break
      case 'addGame':
        result = await db.addGame(params.weekId, params.teamAId, params.teamBId, params.notes)
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
        result = await db.getDepartures(params.weekId)
        break
      case 'logDeparture':
        await db.logDeparture(params.weekId, params.playerId)
        result = null
        break
      case 'removeDeparture':
        await db.removeDeparture(params.weekId, params.playerId)
        result = null
        break

      // Game player exclusions
      case 'getGamePlayerExclusions':
        result = await db.getGamePlayerExclusions(params.weekId)
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
