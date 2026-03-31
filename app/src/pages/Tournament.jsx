import { useEffect, useState } from 'react'
import { getTournament, getTournamentMatches } from '../lib/db'
import Spinner from '../components/Spinner'
import { isAdmin } from '../lib/auth'
import { Link } from 'react-router-dom'

export default function Tournament() {
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const admin = isAdmin()

  useEffect(() => {
    getTournament()
      .then(async (t) => {
        setTournament(t)
        if (t) {
          const m = await getTournamentMatches(t.id)
          setMatches(m)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  if (!tournament) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-5xl">🏆</div>
        <h2 className="text-xl font-bold" style={{ color: '#1B2F5E' }}>Tournament</h2>
        <p className="text-sm opacity-50">
          The tournament hasn't started yet. It will be seeded from final standings once the regular season ends.
        </p>
        {admin && (
          <Link
            to="/admin/tournament"
            className="inline-block mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            Set Up Tournament
          </Link>
        )}
      </div>
    )
  }

  // Group matches by round
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

  // Find champion
  const finalMatch = rounds[maxRound]?.[0]
  const champion = finalMatch?.winner

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">
            {tournament.status === 'complete' ? 'Season Complete' : 'In Progress'}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>Tournament</h1>
        </div>
        {admin && (
          <Link
            to="/admin/tournament"
            className="text-sm px-3 py-1 rounded-lg text-white"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            ⚙ Manage
          </Link>
        )}
      </div>

      {champion && (
        <div
          className="rounded-xl p-4 text-center text-white shadow"
          style={{ backgroundColor: '#1B2F5E' }}
        >
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-xs mb-1" style={{ color: '#89B4D0' }}>LEAGUE CHAMPION</div>
          <div className="text-xl font-bold">{champion.name}</div>
        </div>
      )}

      {roundNums.map((r) => (
        <div key={r}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">
            {roundLabel(r)}
          </h2>
          <div className="space-y-2">
            {rounds[r].map((match) => {
              const aWon = match.winner_id === match.player_a_id
              const bWon = match.winner_id === match.player_b_id

              return (
                <div key={match.id} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                  {match.is_bye ? (
                    <div className="text-sm">
                      <span className="font-bold">{match.player_a?.name}</span>
                      <span className="opacity-40 ml-2">— bye</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 text-sm ${aWon ? 'font-bold' : match.winner_id ? 'opacity-40' : ''}`}>
                        {aWon && <span className="text-green-600 mr-1">✓</span>}
                        {match.player_a?.name || <span className="opacity-30">TBD</span>}
                      </div>
                      <div className="text-xs opacity-30 font-bold">vs</div>
                      <div className={`flex-1 text-sm text-right ${bWon ? 'font-bold' : match.winner_id ? 'opacity-40' : ''}`}>
                        {match.player_b?.name || <span className="opacity-30">TBD</span>}
                        {bWon && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
