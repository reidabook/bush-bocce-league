import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getWeek, getTeamsForWeek, getGamesForWeek,
  addGame, recordGameResult, deleteGame, updateWeekStatus
} from '../../lib/db'
import Spinner from '../../components/Spinner'

export default function AdminWeekManage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [week, setWeek] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add game form state
  const [teamAId, setTeamAId] = useState('')
  const [teamBId, setTeamBId] = useState('')
  const [gameNotes, setGameNotes] = useState('')
  const [addingGame, setAddingGame] = useState(false)

  async function reload() {
    const [w, t, g] = await Promise.all([getWeek(id), getTeamsForWeek(id), getGamesForWeek(id)])
    setWeek(w)
    setTeams(t)
    setGames(g)
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  async function handleAddGame(e) {
    e.preventDefault()
    if (!teamAId || !teamBId || teamAId === teamBId) {
      setError('Select two different teams.')
      return
    }
    setAddingGame(true)
    setError(null)
    try {
      await addGame(id, teamAId, teamBId, gameNotes.trim() || null)
      setTeamAId('')
      setTeamBId('')
      setGameNotes('')
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

  if (loading) return <Spinner />

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Admin</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          Week {week?.week_number}
        </h1>
        <div className="text-sm opacity-50">
          {week && new Date(week.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
          })}
          {week?.status === 'completed' && (
            <span className="ml-2 text-xs font-bold text-green-600">· Completed</span>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Teams */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Teams</h2>
        <div className="grid grid-cols-2 gap-2">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#89B4D0' }}>
                {team.name}
              </div>
              {team.players.map((p) => (
                <div key={p.id} className="text-xs py-0.5">{p.name}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Add game */}
      {week?.status !== 'completed' && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Add Game</h2>
          <form onSubmit={handleAddGame} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs opacity-50 mb-1 block">Team A</label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <option value="">Select…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs opacity-50 mb-1 block">Team B</label>
                <select
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <option value="">Select…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs opacity-50 mb-1 block">Notes (optional)</label>
              <input
                type="text"
                value={gameNotes}
                onChange={(e) => setGameNotes(e.target.value)}
                placeholder="e.g. close game, rained out, etc."
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>
            <button
              type="submit"
              disabled={addingGame}
              className="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              {addingGame ? 'Adding…' : 'Add Game'}
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
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Close / reopen week */}
      <div className="pt-2">
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
      </div>
    </div>
  )
}
