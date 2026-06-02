import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getWeekManageData,
  addGame, recordGameResult, deleteGame, updateWeekStatus, updateWeekDate, deleteWeek,
  logDeparture, removeDeparture, addPlayerToTeam,
  excludePlayerFromGame, restorePlayerToGame,
} from '../../lib/db'
import Spinner from '../../components/Spinner'

export default function AdminWeekManage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [week, setWeek] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [departures, setDepartures] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [gameNotes, setGameNotes] = useState('')
  const [addingGame, setAddingGame] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState([])
  const [exclusions, setExclusions] = useState({})

  const [editingDate, setEditingDate] = useState(false)
  const [dateInput, setDateInput] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  const [addingToTeam, setAddingToTeam] = useState(null)
  const [addingPlayer, setAddingPlayer] = useState(false)

  // Single API call: fetches week, teams, games, departures, exclusions, allPlayers
  async function reload() {
    const data = await getWeekManageData(id)
    setWeek(data.week)
    setTeams(data.teams)
    setGames(data.games)
    setDepartures(data.departures)
    setAllPlayers(data.allPlayers)
    const map = {}
    data.exclusions.forEach(({ game_id, player_id }) => {
      if (!map[game_id]) map[game_id] = new Set()
      map[game_id].add(player_id)
    })
    setExclusions(map)
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  const isActive = week?.status === 'active'
  const assignedIds = new Set(teams.flatMap((t) => t.players.map((p) => p.id)))
  const unassigned = allPlayers.filter((p) => !assignedIds.has(p.id))

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

  async function handleReopenWeek() {
    try {
      await updateWeekStatus(id, 'active')
      await reload()
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

  async function handleAddLateArrival(teamId, playerId) {
    setAddingPlayer(true)
    try {
      await addPlayerToTeam(id, teamId, playerId)
      setAddingToTeam(null)
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingPlayer(false)
    }
  }

  if (loading) return <Spinner />

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const departedIds = new Set(departures.map((d) => d.player_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Admin</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          Week {week?.week_number}
        </h1>
        <div className="text-sm opacity-50 mt-1">
          {editingDate ? (
            <form onSubmit={handleUpdateDate} className="flex items-center gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                autoFocus
                className="px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#e5e7eb' }}
              />
              <button
                type="submit"
                disabled={savingDate || !dateInput}
                className="text-sm font-medium disabled:opacity-40 px-3 py-2"
                style={{ color: '#1B2F5E' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingDate(false)}
                className="text-sm text-gray-400 px-2 py-2"
              >
                Cancel
              </button>
            </form>
          ) : (
            <span className="flex items-center gap-3 flex-wrap">
              <span>
                {week && new Date(week.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
                {!isActive && (
                  <span className="ml-2 text-xs font-bold text-green-600">· Completed</span>
                )}
              </span>
              <button
                onClick={() => { setDateInput(week?.date ?? ''); setEditingDate(true) }}
                className="text-xs text-blue-400 hover:text-blue-600 py-1"
              >
                Edit date
              </button>
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Read-only notice for non-active weeks */}
      {!isActive && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#f0f4ff', color: '#1B2F5E' }}>
          This week is closed. Tap <strong>Reopen Week</strong> below to make changes.
        </div>
      )}

      {/* Teams */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">Teams</h2>
        <div className={`grid gap-3 ${teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#89B4D0' }}>
                {team.name}
              </div>

              <div className="space-y-1">
                {team.players.map((p) => {
                  const hasDeparted = departedIds.has(p.id)
                  return (
                    <div key={p.id} className="flex items-center gap-2 min-h-[52px] py-1">
                      <span
                        className="text-sm flex-1 leading-tight"
                        style={{
                          opacity: hasDeparted ? 0.4 : 1,
                          textDecoration: hasDeparted ? 'line-through' : 'none',
                        }}
                      >
                        {p.name}
                      </span>
                      {isActive && (
                        hasDeparted ? (
                          <button
                            onClick={() => handleRemoveDeparture(p.id)}
                            className="flex-shrink-0 px-3 py-3 rounded-xl text-xs font-semibold min-h-[44px] flex items-center"
                            style={{ backgroundColor: '#f0f4ff', color: '#1B2F5E' }}
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLogDeparture(p.id)}
                            className="flex-shrink-0 px-3 py-3 rounded-xl text-xs font-semibold min-h-[44px] flex items-center"
                            style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                          >
                            Left early
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Late arrival */}
              {isActive && unassigned.length > 0 && (
                addingToTeam === team.id ? (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <div className="text-xs font-medium opacity-50 mb-2">Add to this team:</div>
                    <div className="flex flex-col gap-1.5">
                      {unassigned.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleAddLateArrival(team.id, p.id)}
                          disabled={addingPlayer}
                          className="w-full text-left px-3 py-3 rounded-xl text-sm font-medium disabled:opacity-40"
                          style={{ backgroundColor: '#f0f4ff', color: '#1B2F5E' }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setAddingToTeam(null)}
                      className="mt-2 text-xs opacity-40 hover:opacity-70 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToTeam(team.id)}
                    className="mt-3 w-full py-2.5 rounded-xl border text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
                    style={{ borderColor: '#1B2F5E', color: '#1B2F5E', borderStyle: 'dashed' }}
                  >
                    + Add late arrival
                  </button>
                )
              )}
            </div>
          ))}
        </div>
        {departures.length > 0 && (
          <p className="text-xs opacity-40 mt-2 px-1">Departed players won't earn points for games after they left.</p>
        )}
      </div>

      {/* Add game */}
      {isActive && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">Add Game</h2>
          <form onSubmit={handleAddGame} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            {teams.length > 2 && (
              <div>
                <div className="text-sm font-medium opacity-60 mb-3">Which two teams are playing?</div>
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
                        className="flex-1 px-3 py-3 rounded-xl text-sm font-medium min-h-[44px]"
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
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
              style={{ borderColor: '#e5e7eb' }}
            />
            <button
              type="submit"
              disabled={addingGame || teams.length < 2 || (teams.length > 2 && selectedTeams.length !== 2)}
              className="w-full py-4 rounded-xl text-white text-base font-semibold disabled:opacity-40"
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
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
            Games ({games.length})
          </h2>
          <div className="space-y-3">
            {games.map((game, i) => {
              const teamA = teamMap[game.team_a_id]
              const teamB = teamMap[game.team_b_id]
              if (!teamA || !teamB) return null

              return (
                <div key={game.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold opacity-40">Game {i + 1}</div>
                    {isActive && (
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {game.winner_team_id ? (
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base font-bold text-green-600">
                          ✓ {teamMap[game.winner_team_id]?.name}
                        </span>
                        <span className="text-sm opacity-40">beat</span>
                        <span className="text-sm opacity-50">
                          {game.winner_team_id === game.team_a_id ? teamB.name : teamA.name}
                        </span>
                        {isActive && (
                          <button
                            onClick={() => handleRecordWinner(game.id, null)}
                            className="text-xs opacity-40 hover:opacity-70 underline"
                          >
                            clear
                          </button>
                        )}
                      </div>
                      {game.notes && <div className="text-sm mt-1 opacity-40 italic">{game.notes}</div>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm font-medium opacity-50">
                        {isActive ? 'Who won?' : 'Pending result'}
                      </div>
                      {isActive && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRecordWinner(game.id, teamA.id)}
                            className="flex-1 py-4 rounded-xl border text-sm font-semibold"
                            style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                          >
                            {teamA.name}
                          </button>
                          <button
                            onClick={() => handleRecordWinner(game.id, teamB.id)}
                            className="flex-1 py-4 rounded-xl border text-sm font-semibold"
                            style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                          >
                            {teamB.name}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-game player exclusions */}
                  {isActive && (() => {
                    const gamePlayers = [...(teamA.players ?? []), ...(teamB.players ?? [])]
                    if (gamePlayers.length === 0) return null
                    const gameExcl = exclusions[game.id] ?? new Set()
                    const hasExclusions = gameExcl.size > 0
                    return (
                      <details className="mt-3" open={hasExclusions}>
                        <summary className="text-sm opacity-40 cursor-pointer select-none hover:opacity-70 py-1">
                          Player exceptions{hasExclusions ? ` (${gameExcl.size} excluded)` : ''}
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {gamePlayers.map((p) => {
                            const isExcluded = gameExcl.has(p.id)
                            return (
                              <button
                                key={p.id}
                                onClick={() => handleToggleExclusion(game.id, p.id)}
                                className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[44px]"
                                style={{
                                  borderColor: isExcluded ? '#fca5a5' : '#e5e7eb',
                                  backgroundColor: isExcluded ? '#fef2f2' : '#f9fafb',
                                  color: isExcluded ? '#ef4444' : '#6b7280',
                                  textDecoration: isExcluded ? 'line-through' : 'none',
                                }}
                              >
                                {p.name}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-xs opacity-30 mt-2">
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

      {/* Close / reopen / delete */}
      <div className="pt-2 space-y-3">
        {isActive ? (
          <button
            onClick={handleCloseWeek}
            disabled={games.length === 0}
            className="w-full py-4 rounded-xl text-white text-base font-bold disabled:opacity-30"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            Close Week & Finalize Points ✓
          </button>
        ) : (
          <button
            onClick={handleReopenWeek}
            className="w-full py-4 rounded-xl border text-sm font-medium opacity-50 hover:opacity-100"
            style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
          >
            Reopen Week
          </button>
        )}
        <button
          onClick={handleDeleteWeek}
          className="w-full py-4 rounded-xl border text-sm font-medium opacity-50 hover:opacity-100"
          style={{ borderColor: '#ef4444', color: '#ef4444' }}
        >
          Delete Week
        </button>
      </div>
    </div>
  )
}
