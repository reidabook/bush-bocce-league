import { useEffect, useState } from 'react'
import {
  getStandings, getTournament, getTournamentMatches,
  createTournament, recordMatchResult, completeTournament
} from '../../lib/db'
import Spinner from '../../components/Spinner'

export default function AdminTournament() {
  const [standings, setStandings] = useState([])
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seeding, setSeeding] = useState(false)

  async function reload() {
    const [s, t] = await Promise.all([getStandings(), getTournament()])
    setStandings(s)
    setTournament(t)
    if (t) {
      const m = await getTournamentMatches(t.id)
      setMatches(m)
    }
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  async function handleSeed() {
    if (!confirm('Seed the tournament from current standings? This cannot be undone.')) return
    setSeeding(true)
    setError(null)
    try {
      const playerIds = standings.map((p) => p.id)
      await createTournament(playerIds)
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  async function handleWinner(match, winnerId) {
    if (!confirm(`Record winner?`)) return
    try {
      await recordMatchResult(match.id, winnerId, tournament.id, match.round, match.position)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleComplete() {
    if (!confirm('Mark tournament as complete?')) return
    try {
      await completeTournament(tournament.id)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Admin</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>Tournament</h1>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!tournament ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
              Seeding Order (from standings)
            </h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {standings.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-bold opacity-30 w-4">{i + 1}</span>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <span className="opacity-50">{p.points} pts</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding || standings.length < 2}
            className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            {seeding ? 'Seeding…' : '🏆 Seed & Start Tournament'}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-xs font-medium px-2 py-1 rounded-full inline-block"
            style={{
              color: tournament.status === 'complete' ? '#16a34a' : '#1B2F5E',
              backgroundColor: tournament.status === 'complete' ? '#dcfce7' : '#89B4D020',
            }}>
            {tournament.status === 'complete' ? '✓ Complete' : 'In Progress'}
          </div>

          {/* Matches grouped by round */}
          {(() => {
            const rounds = matches.reduce((acc, m) => {
              acc[m.round] = acc[m.round] || []
              acc[m.round].push(m)
              return acc
            }, {})
            const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b)
            const maxRound = Math.max(...roundNums)
            const roundLabel = (r) => {
              if (r === maxRound && maxRound > 1) return 'Final'
              if (r === maxRound - 1 && maxRound > 2) return 'Semifinal'
              return `Round ${r}`
            }

            return roundNums.map((r) => (
              <div key={r}>
                <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
                  {roundLabel(r)}
                </h2>
                <div className="space-y-2">
                  {rounds[r].map((match) => (
                    <div key={match.id} className="bg-white rounded-xl p-3 shadow-sm space-y-2">
                      {match.is_bye ? (
                        <div className="text-sm">
                          <span className="font-bold">{match.player_a?.name}</span>
                          <span className="opacity-40 ml-2">— bye (advances automatically)</span>
                        </div>
                      ) : match.winner_id ? (
                        <div className="text-sm">
                          <span className="font-bold text-green-600">✓ {match.winner?.name}</span>
                          <span className="opacity-40 mx-2">advances</span>
                          <button
                            onClick={() => handleWinner({ ...match }, null)}
                            className="text-xs opacity-30 hover:opacity-60"
                          >
                            (clear)
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs opacity-50 font-medium">Who won?</div>
                          <div className="flex gap-2">
                            {match.player_a && (
                              <button
                                onClick={() => handleWinner(match, match.player_a_id)}
                                className="flex-1 py-2 rounded-lg border text-sm font-medium"
                                style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                              >
                                {match.player_a.name}
                              </button>
                            )}
                            {match.player_b && (
                              <button
                                onClick={() => handleWinner(match, match.player_b_id)}
                                className="flex-1 py-2 rounded-lg border text-sm font-medium"
                                style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                              >
                                {match.player_b.name}
                              </button>
                            )}
                            {!match.player_b && (
                              <div className="flex-1 text-sm opacity-30 text-center py-2">TBD</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}

          {tournament.status !== 'complete' && (
            <button
              onClick={handleComplete}
              className="w-full py-3 rounded-xl text-white text-sm font-bold"
              style={{ backgroundColor: '#1B2F5E' }}
            >
              Mark Tournament Complete 🏆
            </button>
          )}
        </div>
      )}
    </div>
  )
}
