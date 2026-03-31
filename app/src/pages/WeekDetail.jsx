import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getWeek, getTeamsForWeek, getGamesForWeek, getDepartures } from '../lib/db'
import Spinner from '../components/Spinner'
import { isAdmin } from '../lib/auth'

export default function WeekDetail() {
  const { id } = useParams()
  const [week, setWeek] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const admin = isAdmin()

  const [departures, setDepartures] = useState([])

  useEffect(() => {
    Promise.all([getWeek(id), getTeamsForWeek(id), getGamesForWeek(id), getDepartures(id)])
      .then(([w, t, g, d]) => { setWeek(w); setTeams(t); setGames(g); setDepartures(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!week) return null

  // Build a quick lookup: teamId → team object
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))

  // Build departure lookup: playerId → { departed_at, leftAfterLabel }
  const departureMap = {}
  departures.forEach((d) => {
    const depMs = new Date(d.departed_at).getTime()
    const gamesBefore = games.filter((g) => new Date(g.created_at).getTime() < depMs)
    const label = gamesBefore.length === 0
      ? 'left before any games'
      : `left after Game ${gamesBefore.length}`
    departureMap[d.player_id] = label
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">
          Week {week.week_number}
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>
          {new Date(week.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
          })}
        </h1>
        {admin && week.status !== 'completed' && (
          <Link
            to={`/admin/weeks/${week.id}`}
            className="inline-block mt-2 text-sm px-3 py-1 rounded-lg text-white"
            style={{ backgroundColor: '#1B2F5E' }}
          >
            ⚙ Manage this week
          </Link>
        )}
      </div>

      {/* Teams */}
      {teams.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">Teams</h2>
          <div className="grid grid-cols-2 gap-2">
            {teams.map((team) => (
              <div key={team.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#89B4D0' }}>
                  {team.name}
                </div>
                {team.players.map((p) => {
                  const departureLabel = departureMap[p.id]
                  return (
                    <div key={p.id} className="py-0.5">
                      <span
                        className="text-sm font-medium"
                        style={{ opacity: departureLabel ? 0.45 : 1, textDecoration: departureLabel ? 'line-through' : 'none' }}
                      >
                        {p.name}
                      </span>
                      {departureLabel && (
                        <span className="ml-1 text-xs opacity-40 italic">{departureLabel}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Games */}
      {games.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">Game Results</h2>
          <div className="space-y-2">
            {games.map((game, i) => {
              const teamA = teamMap[game.team_a_id]
              const teamB = teamMap[game.team_b_id]
              if (!teamA || !teamB) return null
              const winnerA = game.winner_team_id === game.team_a_id
              const winnerB = game.winner_team_id === game.team_b_id
              const pending = !game.winner_team_id

              return (
                <div key={game.id} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                  <div className="text-xs opacity-40 mb-2 font-medium">Game {i + 1}</div>
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 text-sm font-medium ${winnerA ? 'font-bold' : 'opacity-50'}`}>
                      {winnerA && <span className="text-green-600 mr-1">✓</span>}
                      {teamA.name}
                    </div>
                    <div className="text-xs opacity-30 font-bold">vs</div>
                    <div className={`flex-1 text-sm font-medium text-right ${winnerB ? 'font-bold' : 'opacity-50'}`}>
                      {teamB.name}
                      {winnerB && <span className="text-green-600 ml-1">✓</span>}
                    </div>
                  </div>
                  {pending && (
                    <div className="text-xs text-center mt-1 opacity-30">Pending result</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {teams.length === 0 && games.length === 0 && (
        <p className="text-sm opacity-50 text-center py-8">Teams not set up yet.</p>
      )}
    </div>
  )
}
