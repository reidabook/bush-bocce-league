// Per-session points, computed client-side from raw session data.
// Same rules as the season standings: +1 played, +3 won; nothing if the
// player left before the game started or sat that game out.

export function computeSessionStats(teams, games, departures, exclusions) {
  const depMap = {}
  departures.forEach((d) => { depMap[d.player_id] = new Date(d.departed_at).getTime() })
  const excSet = new Set(exclusions.map((e) => `${e.game_id}:${e.player_id}`))

  const stats = {}
  teams.forEach((t) => t.players.forEach((p) => {
    stats[p.id] = { ...p, teamId: t.id, points: 0, wins: 0, gamesPlayed: 0 }
  }))

  const counts = (game, pid) =>
    stats[pid] &&
    !excSet.has(`${game.id}:${pid}`) &&
    !(depMap[pid] !== undefined && depMap[pid] < new Date(game.created_at).getTime())

  games.forEach((game) => {
    if (!game.winner_team_id) return
    const a = teams.find((t) => t.id === game.team_a_id)
    const b = teams.find((t) => t.id === game.team_b_id)
    if (!a || !b) return
    for (const t of [a, b]) {
      const won = t.id === game.winner_team_id
      t.players.forEach((p) => {
        if (!counts(game, p.id)) return
        stats[p.id].gamesPlayed++
        stats[p.id].points += won ? 4 : 1
        if (won) stats[p.id].wins++
      })
    }
  })
  return stats
}

// "left after Game 2" / "left before any games", using game creation order.
export function departureLabel(departedAt, games) {
  const t = new Date(departedAt).getTime()
  const before = games.filter((g) => new Date(g.created_at).getTime() < t).length
  return before === 0 ? 'left before any games' : `left after Game ${before}`
}
