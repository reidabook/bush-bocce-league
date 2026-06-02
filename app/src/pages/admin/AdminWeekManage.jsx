import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getWeek, getTeamsForWeek, getGamesForWeek,
  addGame, recordGameResult, deleteGame, updateWeekStatus, updateWeekDate, deleteWeek,
  getDepartures, logDeparture, removeDeparture,
  getGamePlayerExclusions, excludePlayerFromGame, restorePlayerToGame,
} from '../../lib/db'
import Spinner from '../../components/Spinner'

export default function AdminWeekManage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [week, setWeek] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [departures, setDepartures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [gameNotes, setGameNotes] = useState('')
  const [addingGame, setAddingGame] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState([])
  const [exclusions, setExclusions] = useState({}) // gameId → Set<playerId>

  const [editingDate, setEditingDate] = useState(false)
  const [dateInput, setDateInput] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  async function reload() {
    const [w, t, g, d, excl] = await Promise.all([
      getWeek(id), getTeamsForWeek(id), getGamesForWeek(id),
      getDepartures(id), getGamePlayerExclusions(id),
    ])
    setWeek(w)
    setTeams(t)
    setGames(g)
    setDepartures(d)
    const map = {}
    excl.forEach(({ game_id, player_id }) => {
      if (!map[game_id]) map[game_id] = new Set()
      map[game_id].add(player_id)
    })
    setExclusions(map)
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  async function handleAddGame(e) {
    e.preventDefault()
    if (teams.length < 2) return
    const [aId, bId] = teams.length === 2
      ? [teams[0].id, teams[1].id]
      : selectedTeams
    if (!aId || !bId) return
    setAddingGame(true)
    setError(null)
    try {
      await addGame(id, aId, bId, gameNotes.trim() || null)
      setGameNotes('')
      setSelectedTeams([])
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingGame(false)
    }
  }

  async function handleRecordWinner(gameId, winnerTeamId) {
    try {
      await recordGameResult(gameId, winnerTeamId)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeleteGame(gameId) {
    if (!confirm('Delete this game?')) return
    try {
      await deleteGame(gameId)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleCloseWeek() {
    const pending = games.filter((g) => !g.winner_team_id).length
    if (pending > 0 && !confirm(`${pending} game(s) still have no result. Close the week anyway?`)) return
    try {
      await updateWeekStatus(id, 'completed')
      navigate('/admin')
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleLogDeparture(playerId) {
    try {
      await logDeparture(id, playerId)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRemoveDeparture(playerId) {
    try {
      await removeDeparture(id, playerId)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleToggleExclusion(gameId, playerId) {
    try {
      const excluded = exclusions[gameId]?.has(playerId)
      if (excluded) {
        await restorePlayerToGame(gameId, playerId)
      } else {
        await excludePlayerFromGame(gameId, playerId)
      }
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleReopenWeek() {
    try {
      await updateWeekStatus(id, 'active')
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleUpdateDate(e) {
    e.preventDefault()
    if (!dateInput) return
    setSavingDate(true)
    try {
      await updateWeekDate(id, dateInput)
      setEditingDate(false)
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingDate(false)
    }
  }

  async function handleDeleteWeek() {
    if (!confirm(`Delete Week ${week?.week_number}? This permanently removes all teams, games, and results for this week.`)) return
    try {
      await deleteWeek(id)
      navigate('/admin')
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return <Spinner />

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Admin</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          Week {week?.week_number}
        </h1>
        <div className="text-sm opacity-50 mt-0.5">
          {editingDate ? (
            <form onSubmit={handleUpdateDate} className="flex items-center gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                autoFocus
                className="px-2 py-1 rounded border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#e5e7eb' }}
              />
              <button
                type="submit"
                disabled={savingDate || !dateInput}
                className="text-xs font-medium disabled:opacity-40"
                style={{ color: '#1B2F5E' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingDate(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </form>
          ) : (
            <span className="flex items-center gap-2">
              <span>
                {week && new Date(week.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
                {week?.status === 'completed' && (
                  <span className="ml-2 text-xs font-bold text-green-600">· Completed</span>
                )}
              </span>
              <button
                onClick={() => { setDateInput(week?.date ?? ''); setEditingDate(true) }}
                className="text-xs text-blue-400 hover:text-blue-600"
              >
                Edit date
              </button>
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Teams */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Teams</h2>
        <div className={`grid gap-2 ${teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {teams.map((team) => {
            const departedIds = new Set(departures.map((d) => d.player_id))
            return (
              <div key={team.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#89B4D0' }}>
                  {team.name}
                </div>
                {team.players.map((p) => {
                  const hasDeparted = departedIds.has(p.id)
                  return (
                    <div key={p.id} className="flex items-center justify-between py-0.5 gap-1">
                      <span
                        className="text-xs"
                        style={{ opacity: hasDeparted ? 0.4 : 1, textDecoration: hasDeparted ? 'line-through' : 'none' }}
                      >
                        {p.name}
                      </span>
                      {week?.status !== 'completed' && (
                        hasDeparted ? (
                          <button
                            onClick={() => handleRemoveDeparture(p.id)}
                            className="text-xs opacity-30 hover:opacity-70 flex-shrink-0"
                            title="Undo departure"
                          >
                            undo
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLogDeparture(p.id)}
                            className="text-xs opacity-30 hover:opacity-70 flex-shrink-0"
                            title="Mark as left early"
                          >
                            left
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        {departures.length > 0 && (
          <p className="text-xs opacity-40 mt-1 px-1">Departed players won't earn points for games after they left.</p>
        )}
      </div>

      {/* Add game */}
      {week?.status !== 'completed' && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Add Game</h2>
          <form onSubmit={handleAddGame} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            {teams.length > 2 && (
              <div>
                <div className="text-xs opacity-50 mb-2 font-medium">Which two teams are playing?</div>
                <div className="flex flex-wrap gap-2">
                  {teams.map((team) => {
                    const isSelected = selectedTeams.includes(team.id)
                    const isFull = selectedTeams.length === 2 && !isSelected
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTeams((prev) => prev.filter((tid) => tid !== team.id))
                          } else if (!isFull) {
                            setSelectedTeams((prev) => [...prev, team.id])
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{
                          backgroundColor: isSelected ? '#1B2F5E' : '#f3f4f6',
                          color: isSelected ? 'white' : isFull ? '#d1d5db' : '#374151',
                        }}
                      >
                        {team.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <input
              type="text"
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#e5e7eb' }}
            />
            <button
              type="submit"
              disabled={addingGame || teams.length < 2 || (teams.length > 2 && selectedTeams.length !== 2)}
              className="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              {addingGame ? 'Adding…' : '+ Add Game'}
            </button>
          </form>
        </div>
      )}

      {/* Game results */}
      {games.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
            Games ({games.length})
          </h2>
          <div className="space-y-2">
            {games.map((game, i) => {
              const teamA = teamMap[game.team_a_id]
              const teamB = teamMap[game.team_b_id]
              if (!teamA || !teamB) return null

              return (
                <div key={game.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs opacity-40 font-medium">Game {i + 1}</div>
                    {week?.status !== 'completed' && (
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {game.winner_team_id ? (
                    <div className="text-sm">
                      <span className="font-bold text-green-600">✓ {teamMap[game.winner_team_id]?.name}</span>
                      <span className="opacity-40 mx-2">beat</span>
                      <span className="opacity-50">
                        {game.winner_team_id === game.team_a_id ? teamB.name : teamA.name}
                      </span>
                      {week?.status !== 'completed' && (
                        <button
                          onClick={() => handleRecordWinner(game.id, null)}
                          className="ml-2 text-xs opacity-30 hover:opacity-70"
                        >
                          (clear)
                        </button>
                      )}
                      {game.notes && <div className="text-xs mt-1 opacity-40 italic">{game.notes}</div>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs opacity-50 font-medium">Who won?</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRecordWinner(game.id, teamA.id)}
                          className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-navy-light transition-colors"
                          style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                        >
                          {teamA.name}
                        </button>
                        <button
                          onClick={() => handleRecordWinner(game.id, teamB.id)}
                          className="flex-1 py-2 rounded-lg border text-sm font-medium"
                          style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                        >
                          {teamB.name}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Per-game player exclusions */}
                  {week?.status !== 'completed' && (() => {
                    const gamePlayers = [
                      ...(teamA.players ?? []),
                      ...(teamB.players ?? []),
                    ]
                    if (gamePlayers.length === 0) return null
                    const gameExcl = exclusions[game.id] ?? new Set()
                    const hasExclusions = gameExcl.size > 0
                    return (
                      <details className="mt-2" open={hasExclusions}>
                        <summary className="text-xs opacity-40 cursor-pointer select-none hover:opacity-70">
                          Player exceptions{hasExclusions ? ` (${gameExcl.size} excluded)` : ''}
                        </summary>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {gamePlayers.map((p) => {
                            const isExcluded = gameExcl.has(p.id)
                            return (
                              <button
                                key={p.id}
                                onClick={() => handleToggleExclusion(game.id, p.id)}
                                className="px-2 py-0.5 rounded text-xs font-medium border transition-colors"
                                style={{
                                  borderColor: isExcluded ? '#fca5a5' : '#e5e7eb',
                                  backgroundColor: isExcluded ? '#fef2f2' : '#f9fafb',
                                  color: isExcluded ? '#ef4444' : '#6b7280',
                                  textDecoration: isExcluded ? 'line-through' : 'none',
                                }}
                                title={isExcluded ? 'Tap to include in this game' : 'Tap to exclude from this game'}
                              >
                                {p.name}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-xs opacity-30 mt-1">
                          Excluded players won't earn points for this game.
                        </p>
                      </details>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Close / reopen week */}
      <div className="pt-2 space-y-2">
        {week?.status === 'completed' ? (
          <button
            onClick={handleReopenWeek}
            className="w-full py-3 rounded-xl border text-sm font-medium opacity-50 hover:opacity-100"
            style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
          >
            Reopen Week
          </button>
        ) : (
          <button
            onClick={handleCloseWeek}
            disabled={games.length === 0}
            className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-30"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            Close Week & Finalize Points ✓
          </button>
        )}
        <button
          onClick={handleDeleteWeek}
          className="w-full py-3 rounded-xl border text-sm font-medium opacity-50 hover:opacity-100"
          style={{ borderColor: '#ef4444', color: '#ef4444' }}
        >
          Delete Week
        </button>
      </div>
    </div>
  )
}
