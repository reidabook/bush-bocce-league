import { useEffect, useState } from 'react'
import {
  getWeeks,
  getTeamsForWeek,
  getGamesForWeek,
  getDepartures,
  getGamePlayerExclusions,
  excludePlayerFromGame,
  restorePlayerToGame,
  recordGameResult,
  clearGameResult,
} from '../lib/db'
import { isAdmin } from '../lib/auth'
import Spinner from '../components/Spinner'

const TEAM_COLORS = {
  Red: '#DC2626',
  Green: '#16A34A',
  Blue: '#2563EB',
  Yellow: '#CA8A04',
  Orange: '#EA580C',
  Purple: '#7C3AED',
  Black: '#1F2937',
}

function computeSessionStats(teams, games, departures, exclusions) {
  // player_id → departed_at timestamp
  const depMap = {}
  departures.forEach((d) => { depMap[d.player_id] = new Date(d.departed_at).getTime() })

  // Set of "game_id:player_id" excluded
  const excSet = new Set(exclusions.map((e) => `${e.game_id}:${e.player_id}`))

  // Build player id → team
  const allPlayers = {}
  teams.forEach((t) => t.players.forEach((p) => { allPlayers[p.id] = { ...p, teamId: t.id } }))

  const stats = {}
  Object.keys(allPlayers).forEach((pid) => {
    stats[pid] = { ...allPlayers[pid], points: 0, wins: 0, gamesPlayed: 0 }
  })

  games.forEach((game) => {
    if (!game.winner_team_id) return
    const teamA = teams.find((t) => t.id === game.team_a_id)
    const teamB = teams.find((t) => t.id === game.team_b_id)
    if (!teamA || !teamB) return

    const participants = [
      ...teamA.players.map((p) => p.id),
      ...teamB.players.map((p) => p.id),
    ]
    const winTeam = teams.find((t) => t.id === game.winner_team_id)
    const winners = winTeam ? winTeam.players.map((p) => p.id) : []

    const gameTime = new Date(game.created_at).getTime()

    participants.forEach((pid) => {
      if (!stats[pid]) return
      if (excSet.has(`${game.id}:${pid}`)) return
      if (depMap[pid] !== undefined && depMap[pid] < gameTime) return
      stats[pid].gamesPlayed++
      stats[pid].points += 1
    })
    winners.forEach((pid) => {
      if (!stats[pid]) return
      if (excSet.has(`${game.id}:${pid}`)) return
      if (depMap[pid] !== undefined && depMap[pid] < gameTime) return
      stats[pid].wins++
      stats[pid].points += 3
    })
  })

  return stats
}

export default function ActiveSession() {
  const [sessionData, setSessionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const admin = isAdmin()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const weeks = await getWeeks()
      const active = weeks.find((w) => w.status === 'active')
      if (!active) { setSessionData(null); return }

      const [teams, games, departures, exclusions] = await Promise.all([
        getTeamsForWeek(active.id),
        getGamesForWeek(active.id),
        getDepartures(active.id),
        getGamePlayerExclusions(active.id),
      ])
      setSessionData({ week: active, teams, games, departures, exclusions })
    } catch (e) {
      console.error('Failed to load active session:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecordResult(gameId, winnerTeamId) {
    setBusy(true)
    try {
      await recordGameResult(gameId, winnerTeamId)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleClearResult(gameId) {
    setBusy(true)
    try {
      await clearGameResult(gameId)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleExclusion(gameId, playerId) {
    if (!admin) return
    setBusy(true)
    try {
      const excSet = new Set(sessionData.exclusions.map((e) => `${e.game_id}:${e.player_id}`))
      if (excSet.has(`${gameId}:${playerId}`)) {
        await restorePlayerToGame(gameId, playerId)
      } else {
        await excludePlayerFromGame(gameId, playerId)
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  if (!sessionData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="text-5xl">🎯</div>
        <div className="text-lg font-semibold" style={{ color: '#1B2F5E' }}>No Active Session</div>
        <div className="text-sm opacity-50">Check back when the commissioner starts a new session.</div>
      </div>
    )
  }

  const { week, teams, games, departures, exclusions } = sessionData
  const stats = computeSessionStats(teams, games, departures, exclusions)
  const excSet = new Set(exclusions.map((e) => `${e.game_id}:${e.player_id}`))
  const depSet = new Set(departures.map((d) => d.player_id))

  const scoreboard = Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.name.localeCompare(b.name)
  })

  const dateStr = new Date(week.date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Live</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          Week {week.week_number} · Active Session
        </h1>
        <div className="text-sm opacity-50">{dateStr}</div>
      </div>

      {/* Teams */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Tonight's Teams</h2>
        <div className="grid grid-cols-2 gap-2">
          {teams.map((team) => {
            const color = TEAM_COLORS[team.name] ?? '#1B2F5E'
            return (
              <div
                key={team.id}
                className="rounded-xl p-3 text-white"
                style={{ backgroundColor: color }}
              >
                <div className="font-bold text-sm mb-1">{team.name}</div>
                <ul className="space-y-0.5">
                  {team.players.map((p) => (
                    <li
                      key={p.id}
                      className="text-xs"
                      style={{ opacity: depSet.has(p.id) ? 0.45 : 1 }}
                    >
                      {p.name}
                      {depSet.has(p.id) && <span className="ml-1 opacity-70">(left)</span>}
                      {stats[p.id] !== undefined && (
                        <span className="ml-1 opacity-80">
                          · {stats[p.id].points}pt
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Games */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">
          Games {games.length > 0 ? `(${games.length})` : ''}
        </h2>

        {games.length === 0 ? (
          <div className="text-sm opacity-40 py-4 text-center">No games logged yet.</div>
        ) : (
          <div className="space-y-3">
            {games.map((game, idx) => {
              const teamA = teams.find((t) => t.id === game.team_a_id)
              const teamB = teams.find((t) => t.id === game.team_b_id)
              const winner = game.winner_team_id ? teams.find((t) => t.id === game.winner_team_id) : null
              const loser = winner
                ? teams.find((t) => t.id !== game.winner_team_id && (t.id === game.team_a_id || t.id === game.team_b_id))
                : null

              return (
                <div
                  key={game.id}
                  className="rounded-xl border p-3 space-y-2"
                  style={{ borderColor: '#e5e7eb', backgroundColor: 'white' }}
                >
                  {/* Game header */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider opacity-40">
                      Game {idx + 1}
                    </div>
                    {winner && (
                      <div
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: TEAM_COLORS[winner.name] ?? '#1B2F5E' }}
                      >
                        {winner.name} won
                      </div>
                    )}
                  </div>

                  {/* Matchup */}
                  {[teamA, teamB].map((team) => {
                    if (!team) return null
                    const isWinner = winner?.id === team.id
                    const isLoser = loser?.id === team.id
                    return (
                      <div key={team.id} className="space-y-1">
                        <div
                          className="text-xs font-bold"
                          style={{ color: TEAM_COLORS[team.name] ?? '#1B2F5E' }}
                        >
                          {team.name}
                          {isWinner && <span className="ml-1">✓</span>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {team.players.map((p) => {
                            const isExcluded = excSet.has(`${game.id}:${p.id}`)
                            return (
                              <button
                                key={p.id}
                                onClick={() => admin && !busy && handleToggleExclusion(game.id, p.id)}
                                disabled={!admin || busy}
                                title={admin ? (isExcluded ? 'Restore to game' : 'Remove from game') : undefined}
                                className="px-2 py-0.5 rounded-full text-xs border transition-opacity"
                                style={{
                                  borderColor: isExcluded ? '#d1d5db' : TEAM_COLORS[team.name] ?? '#1B2F5E',
                                  color: isExcluded ? '#9ca3af' : TEAM_COLORS[team.name] ?? '#1B2F5E',
                                  textDecoration: isExcluded ? 'line-through' : 'none',
                                  cursor: admin ? 'pointer' : 'default',
                                  opacity: isExcluded ? 0.6 : 1,
                                }}
                              >
                                {p.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Admin result controls */}
                  {admin && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {!winner ? (
                        <>
                          {teamA && (
                            <button
                              onClick={() => !busy && handleRecordResult(game.id, teamA.id)}
                              disabled={busy}
                              className="px-3 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                              style={{ backgroundColor: TEAM_COLORS[teamA.name] ?? '#1B2F5E' }}
                            >
                              {teamA.name} Won
                            </button>
                          )}
                          {teamB && (
                            <button
                              onClick={() => !busy && handleRecordResult(game.id, teamB.id)}
                              disabled={busy}
                              className="px-3 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                              style={{ backgroundColor: TEAM_COLORS[teamB.name] ?? '#1B2F5E' }}
                            >
                              {teamB.name} Won
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => !busy && handleClearResult(game.id)}
                          disabled={busy}
                          className="px-3 py-1 rounded-lg text-xs font-medium border disabled:opacity-40"
                          style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                        >
                          Clear Result
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {game.notes && (
                    <div className="text-xs opacity-40 italic">{game.notes}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Session Scoreboard */}
      {scoreboard.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Tonight's Score</h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F5F3EF' }}>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide opacity-50" style={{ width: '2rem' }}>#</th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide opacity-50">Player</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide opacity-50">Pts</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide opacity-50">W</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide opacity-50">GP</th>
                </tr>
              </thead>
              <tbody>
                {scoreboard.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-t"
                    style={{
                      borderColor: '#f3f4f6',
                      opacity: depSet.has(p.id) ? 0.45 : 1,
                    }}
                  >
                    <td className="px-3 py-2 text-xs opacity-40">{i + 1}</td>
                    <td className="px-3 py-2 font-medium" style={{ color: '#1B2F5E' }}>
                      {p.name}
                      {depSet.has(p.id) && (
                        <span className="ml-1 text-xs opacity-50 font-normal">(left)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#1B2F5E' }}>{p.points}</td>
                    <td className="px-3 py-2 text-right opacity-60">{p.wins}</td>
                    <td className="px-3 py-2 text-right opacity-60">{p.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs opacity-30 mt-1 px-1">Points update as games are recorded. Season standings reflect completed sessions only.</div>
        </section>
      )}
    </div>
  )
}
