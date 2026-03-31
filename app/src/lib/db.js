import { supabase } from './supabase'

// ─── Players ────────────────────────────────────────────────────────────────

export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function addPlayer(name) {
  const { data, error } = await supabase
    .from('players')
    .insert({ name: name.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivatePlayer(id) {
  const { error } = await supabase
    .from('players')
    .update({ active: false })
    .eq('id', id)
  if (error) throw error
}

// ─── Weeks ───────────────────────────────────────────────────────────────────

export async function getWeeks() {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('week_number', { ascending: true })
  if (error) throw error
  return data
}

export async function getWeek(id) {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createWeek(weekNumber, date, teamSize) {
  const { data, error } = await supabase
    .from('weeks')
    .insert({ week_number: weekNumber, date, team_size: teamSize, status: 'setup' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWeekStatus(id, status) {
  const { error } = await supabase
    .from('weeks')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendees(weekId) {
  const { data, error } = await supabase
    .from('week_attendees')
    .select('player_id, players(id, name)')
    .eq('week_id', weekId)
  if (error) throw error
  return data.map((r) => r.players)
}

export async function setAttendees(weekId, playerIds) {
  // Replace all attendees for this week
  await supabase.from('week_attendees').delete().eq('week_id', weekId)
  if (playerIds.length === 0) return
  const rows = playerIds.map((pid) => ({ week_id: weekId, player_id: pid }))
  const { error } = await supabase.from('week_attendees').insert(rows)
  if (error) throw error
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeamsForWeek(weekId) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, team_players(player_id, players(id, name))')
    .eq('week_id', weekId)
    .order('name')
  if (error) throw error
  return data.map((t) => ({
    ...t,
    players: t.team_players.map((tp) => tp.players),
  }))
}

export async function saveTeams(weekId, teams) {
  // Delete existing teams and rebuild
  await supabase.from('teams').delete().eq('week_id', weekId)

  for (let i = 0; i < teams.length; i++) {
    const { data: team, error: te } = await supabase
      .from('teams')
      .insert({ week_id: weekId, name: teams[i].name || `Team ${i + 1}` })
      .select()
      .single()
    if (te) throw te

    const members = teams[i].players.map((p) => ({
      team_id: team.id,
      player_id: p.id,
    }))
    if (members.length > 0) {
      const { error: me } = await supabase.from('team_players').insert(members)
      if (me) throw me
    }
  }
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function getGamesForWeek(weekId) {
  const { data, error } = await supabase
    .from('games')
    .select('id, week_id, team_a_id, team_b_id, winner_team_id, notes, created_at')
    .eq('week_id', weekId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function addGame(weekId, teamAId, teamBId, notes = null) {
  const { data, error } = await supabase
    .from('games')
    .insert({ week_id: weekId, team_a_id: teamAId, team_b_id: teamBId, notes })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recordGameResult(gameId, winnerTeamId) {
  const { error } = await supabase
    .from('games')
    .update({ winner_team_id: winnerTeamId })
    .eq('id', gameId)
  if (error) throw error
}

export async function deleteGame(gameId) {
  const { error } = await supabase.from('games').delete().eq('id', gameId)
  if (error) throw error
}

export async function clearGameResult(gameId) {
  const { error } = await supabase
    .from('games')
    .update({ winner_team_id: null })
    .eq('id', gameId)
  if (error) throw error
}

// ─── Departures ───────────────────────────────────────────────────────────────

export async function getDepartures(weekId) {
  const { data, error } = await supabase
    .from('player_departures')
    .select('id, player_id, departed_at, players(id, name)')
    .eq('week_id', weekId)
    .order('departed_at')
  if (error) throw error
  return data.map((d) => ({ id: d.id, player_id: d.player_id, name: d.players.name, departed_at: d.departed_at }))
}

// ─── Game Player Exclusions ───────────────────────────────────────────────────

export async function getGamePlayerExclusions(weekId) {
  const { data: gameRows, error: ge } = await supabase
    .from('games')
    .select('id')
    .eq('week_id', weekId)
  if (ge) throw ge
  if (!gameRows.length) return []

  const ids = gameRows.map((g) => g.id)
  const { data, error } = await supabase
    .from('game_player_exclusions')
    .select('id, game_id, player_id')
    .in('game_id', ids)
  if (error) throw error
  return data
}

export async function excludePlayerFromGame(gameId, playerId) {
  const { error } = await supabase
    .from('game_player_exclusions')
    .upsert({ game_id: gameId, player_id: playerId })
  if (error) throw error
}

export async function restorePlayerToGame(gameId, playerId) {
  const { error } = await supabase
    .from('game_player_exclusions')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)
  if (error) throw error
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function getStandings() {
  // Returns all active players with computed stats
  const players = await getPlayers()

  // Fetch all completed game results with team memberships
  const { data: games, error: ge } = await supabase
    .from('games')
    .select(`
      id, week_id, created_at, winner_team_id,
      weeks!inner(status),
      team_a:teams!games_team_a_id_fkey(id, team_players(player_id)),
      team_b:teams!games_team_b_id_fkey(id, team_players(player_id))
    `)
    .eq('weeks.status', 'completed')
    .not('winner_team_id', 'is', null)
  if (ge) throw ge

  // Fetch departures for completed weeks — used to exclude early leavers from later games
  const { data: departures, error: de } = await supabase
    .from('player_departures')
    .select('player_id, week_id, departed_at, weeks!inner(status)')
    .eq('weeks.status', 'completed')
  if (de) throw de

  // Build departure lookup: { week_id: { player_id: departed_at_ms } }
  const departureMap = {}
  departures.forEach(({ week_id, player_id, departed_at }) => {
    if (!departureMap[week_id]) departureMap[week_id] = {}
    departureMap[week_id][player_id] = new Date(departed_at).getTime()
  })

  function departed(weekId, playerId, gameCreatedAt) {
    const t = departureMap[weekId]?.[playerId]
    return t !== undefined && t < new Date(gameCreatedAt).getTime()
  }

  // Fetch per-game exclusions for completed weeks
  const completedGameIds = games.map((g) => g.id)
  let exclusionSet = new Set()
  if (completedGameIds.length > 0) {
    const { data: excl, error: ee } = await supabase
      .from('game_player_exclusions')
      .select('game_id, player_id')
      .in('game_id', completedGameIds)
    if (ee) throw ee
    exclusionSet = new Set(excl.map((e) => `${e.game_id}:${e.player_id}`))
  }

  // Fetch attendance counts per player
  const { data: attendance, error: ae } = await supabase
    .from('week_attendees')
    .select('player_id, weeks!inner(status)')
    .eq('weeks.status', 'completed')
  if (ae) throw ae

  const sessionCount = {}
  attendance.forEach(({ player_id }) => {
    sessionCount[player_id] = (sessionCount[player_id] || 0) + 1
  })

  const stats = {}
  players.forEach((p) => {
    stats[p.id] = { ...p, points: 0, wins: 0, gamesPlayed: 0, sessions: sessionCount[p.id] || 0 }
  })

  games.forEach((game) => {
    const allPlayers = [
      ...game.team_a.team_players.map((tp) => tp.player_id),
      ...game.team_b.team_players.map((tp) => tp.player_id),
    ]
    const winners = game.winner_team_id === game.team_a.id
      ? game.team_a.team_players.map((tp) => tp.player_id)
      : game.team_b.team_players.map((tp) => tp.player_id)

    allPlayers.forEach((pid) => {
      if (
        stats[pid] &&
        !departed(game.week_id, pid, game.created_at) &&
        !exclusionSet.has(`${game.id}:${pid}`)
      ) {
        stats[pid].gamesPlayed++
        stats[pid].points += 1  // 1pt for playing
      }
    })
    winners.forEach((pid) => {
      if (
        stats[pid] &&
        !departed(game.week_id, pid, game.created_at) &&
        !exclusionSet.has(`${game.id}:${pid}`)
      ) {
        stats[pid].wins++
        stats[pid].points += 3  // 3pts for winning (total: 4 for a win, 1 for a loss)
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
  const { data, error } = await supabase
    .from('tournament')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createTournament(seededPlayerIds) {
  const { data: t, error: te } = await supabase
    .from('tournament')
    .insert({ status: 'active', format: 'single_elimination' })
    .select()
    .single()
  if (te) throw te

  // Build first-round matches from seeded list
  const matches = []
  const n = seededPlayerIds.length
  // Pair 1v8, 2v7, etc. (highest seed vs lowest)
  for (let i = 0; i < Math.floor(n / 2); i++) {
    matches.push({
      tournament_id: t.id,
      round: 1,
      position: i + 1,
      player_a_id: seededPlayerIds[i],
      player_b_id: seededPlayerIds[n - 1 - i],
      is_bye: false,
    })
  }
  // Odd player gets a bye in round 1
  if (n % 2 === 1) {
    const byePlayer = seededPlayerIds[Math.floor(n / 2)]
    matches.push({
      tournament_id: t.id,
      round: 1,
      position: Math.floor(n / 2) + 1,
      player_a_id: byePlayer,
      player_b_id: null,
      winner_id: byePlayer,
      is_bye: true,
    })
  }

  const { error: me } = await supabase.from('tournament_matches').insert(matches)
  if (me) throw me
  return t
}

export async function getTournamentMatches(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select('*, player_a:players!tournament_matches_player_a_id_fkey(id,name), player_b:players!tournament_matches_player_b_id_fkey(id,name), winner:players!tournament_matches_winner_id_fkey(id,name)')
    .eq('tournament_id', tournamentId)
    .order('round')
    .order('position')
  if (error) throw error
  return data
}

export async function recordMatchResult(matchId, winnerId, tournamentId, round, position) {
  const { error } = await supabase
    .from('tournament_matches')
    .update({ winner_id: winnerId })
    .eq('id', matchId)
  if (error) throw error

  // Advance winner to next round
  // Find the next-round match slot for this position
  const nextRound = round + 1
  const nextPosition = Math.ceil(position / 2)

  const { data: existing } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', nextRound)
    .eq('position', nextPosition)
    .maybeSingle()

  if (existing) {
    // Fill in the open slot
    const update = existing.player_a_id ? { player_b_id: winnerId } : { player_a_id: winnerId }
    await supabase.from('tournament_matches').update(update).eq('id', existing.id)
  } else {
    // Create the next-round match
    await supabase.from('tournament_matches').insert({
      tournament_id: tournamentId,
      round: nextRound,
      position: nextPosition,
      player_a_id: winnerId,
      player_b_id: null,
      is_bye: false,
    })
  }
}

export async function completeTournament(tournamentId) {
  const { error } = await supabase
    .from('tournament')
    .update({ status: 'complete' })
    .eq('id', tournamentId)
  if (error) throw error
}
