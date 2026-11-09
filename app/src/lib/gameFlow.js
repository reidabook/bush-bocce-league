// Pure helpers for the commissioner's game controls on the Session screen.

const byCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at)

// The game waiting for a result: the most recently created one without a winner.
export function pendingGame(games) {
  const open = games.filter((g) => !g.winner_team_id).sort(byCreated)
  return open.length ? open[open.length - 1] : null
}

export function pendingCount(games) {
  return games.filter((g) => !g.winner_team_id).length
}

// Teams not playing in this game (DNP).
export function sittingOut(teams, game) {
  if (!game) return []
  return teams.filter((t) => t.id !== game.team_a_id && t.id !== game.team_b_id)
}

// Confirmation text before closing a session, or null if nothing is pending.
export function closeWarning(games) {
  const n = pendingCount(games)
  if (!n) return null
  return `${n} game${n === 1 ? '' : 's'} still ${n === 1 ? 'has' : 'have'} no result. Close the session anyway?`
}

// Two teams for a new game: with exactly 2 teams it's automatic, otherwise the pick.
export function gameMatchup(teams, picked = []) {
  if (teams.length === 2) return [teams[0].id, teams[1].id]
  return picked.length === 2 ? picked : null
}

// Roster players not on any team this session (late-arrival candidates).
export function unassignedPlayers(allPlayers, teams) {
  const onTeam = new Set(teams.flatMap((t) => t.players.map((p) => p.id)))
  return allPlayers.filter((p) => !onTeam.has(p.id))
}
