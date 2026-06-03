// Pure standings computation — no I/O. Accepts plain-object arrays (already toObj'd).

export function normalizeGame(obj) {
  return { ...obj, winner_team_id: obj.winner_team_id || null, notes: obj.notes || null }
}

export function computeStandings({ players, sessions, games, teamPlayers, departures, exclusions, historicalStats }) {
  const activePlayers = players.filter((p) => p.active?.toLowerCase() === 'true')

  const completedWeekIds = new Set(
    sessions.filter((w) => w.status === 'completed').map((w) => w.id)
  )

  const completedGames = games
    .map(normalizeGame)
    .filter((g) => completedWeekIds.has(g.week_id) && g.winner_team_id)

  const completedGameIds = new Set(completedGames.map((g) => g.id))

  // team_id → [player_id]
  const teamPlayersMap = {}
  teamPlayers.forEach((tp) => {
    if (!teamPlayersMap[tp.team_id]) teamPlayersMap[tp.team_id] = []
    teamPlayersMap[tp.team_id].push(tp.player_id)
  })

  // week_id → { player_id → departed_at_ms }
  const departureMap = {}
  departures.forEach((d) => {
    if (completedWeekIds.has(d.week_id)) {
      if (!departureMap[d.week_id]) departureMap[d.week_id] = {}
      departureMap[d.week_id][d.player_id] = new Date(d.departed_at).getTime()
    }
  })

  const exclusionSet = new Set(
    exclusions
      .filter((e) => completedGameIds.has(e.game_id))
      .map((e) => `${e.game_id}:${e.player_id}`)
  )

  function departed(weekId, playerId, gameCreatedAt) {
    const t = departureMap[weekId]?.[playerId]
    return t !== undefined && t < new Date(gameCreatedAt).getTime()
  }

  const stats = {}
  activePlayers.forEach((p) => {
    stats[p.id] = { ...p, active: true, points: 0, wins: 0, gamesPlayed: 0 }
  })

  historicalStats.forEach((h) => {
    if (!stats[h.player_id]) return
    stats[h.player_id].points += parseInt(h.points) || 0
    stats[h.player_id].wins += parseInt(h.wins) || 0
    stats[h.player_id].gamesPlayed += parseInt(h.games_played) || 0
  })

  completedGames.forEach((game) => {
    const teamAPlayers = teamPlayersMap[game.team_a_id] || []
    const teamBPlayers = teamPlayersMap[game.team_b_id] || []
    const allGamePlayers = [...teamAPlayers, ...teamBPlayers]
    const winners = game.winner_team_id === game.team_a_id ? teamAPlayers : teamBPlayers

    allGamePlayers.forEach((pid) => {
      if (stats[pid] && !departed(game.week_id, pid, game.created_at) && !exclusionSet.has(`${game.id}:${pid}`)) {
        stats[pid].gamesPlayed++
        stats[pid].points += 1
      }
    })
    winners.forEach((pid) => {
      if (stats[pid] && !departed(game.week_id, pid, game.created_at) && !exclusionSet.has(`${game.id}:${pid}`)) {
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
    return a.name.localeCompare(b.name)
  })
}
