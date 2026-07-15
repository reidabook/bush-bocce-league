import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStandings, getSessions } from '../lib/db'
import Spinner from '../components/Spinner'

export function fmtWinPct(wins, gamesPlayed) {
  if (gamesPlayed === 0) return '—'
  return (wins / gamesPlayed).toFixed(3).replace(/^0/, '')
}

export default function Home() {
  const [standings, setStandings] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [initializing, setInitializing] = useState(false)
  const [initResult, setInitResult] = useState(null)
  const [sortCol, setSortCol] = useState('pts')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    Promise.all([getStandings(), getSessions()])
      .then(([s, sessions]) => {
        setStandings(s)
        setActiveSession(sessions.find((s) => s.status === 'active') || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleInit() {
    setInitializing(true)
    setInitResult(null)
    try {
      const res = await fetch('/api/init-sheets')
      const data = await res.json()
      const created = data.sheets?.filter((s) => s.action === 'created').length ?? 0
      setInitResult({ ok: true, message: `Done! Created ${created} sheet(s). Reloading…` })
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setInitResult({ ok: false, message: err.message })
      setInitializing(false)
    }
  }

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sorted = [...standings].sort((a, b) => {
    let diff
    if (sortCol === 'pts') diff = b.points - a.points
    else if (sortCol === 'w') diff = b.wins - a.wins
    else if (sortCol === 'gp') diff = b.gamesPlayed - a.gamesPlayed
    else if (sortCol === 'pct') {
      const aP = a.gamesPlayed ? a.wins / a.gamesPlayed : 0
      const bP = b.gamesPlayed ? b.wins / b.gamesPlayed : 0
      diff = bP - aP
    }
    return sortDir === 'desc' ? diff : -diff
  })

  if (loading) return <Spinner />
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
      <p className="font-semibold text-red-700 text-sm">Failed to load data</p>
      <p className="text-red-600 text-xs font-mono break-all">{error}</p>
      {error.includes('not found') && (
        <div className="pt-1 space-y-1">
          <button
            onClick={handleInit}
            disabled={initializing}
            className="text-xs bg-red-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {initializing ? 'Initializing…' : 'Initialize database'}
          </button>
          {initResult && (
            <p className={`text-xs ${initResult.ok ? 'text-green-700' : 'text-red-600'}`}>
              {initResult.message}
            </p>
          )}
        </div>
      )}
      <p className="text-red-500 text-xs">Visit <a href="/api/debug" className="underline" target="_blank">/api/debug</a> for connection details.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Active session banner */}
      {activeSession && (
        <Link
          to={`/sessions/${activeSession.id}`}
          className="block rounded-xl p-4 text-white shadow"
          style={{ backgroundColor: '#1B2F5E' }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: '#89B4D0' }}>
            SESSION {activeSession.session_number} · IN PROGRESS
          </div>
          <div className="font-bold text-lg">
            {new Date(activeSession.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </div>
          <div className="text-sm mt-1 opacity-70">Tap to see tonight's teams →</div>
        </Link>
      )}

      {/* Standings */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">
          Season Standings
        </h2>
        {standings.length === 0 ? (
          <p className="text-sm opacity-50 text-center py-8">
            No games recorded yet. Check back after the first session!
          </p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide border-b">
                  <th className="text-left px-4 py-2 font-medium opacity-40">#</th>
                  <th className="text-left px-4 py-2 font-medium opacity-40">Player</th>
                  {[
                    { col: 'pts', label: 'PTS' },
                    { col: 'w', label: 'W' },
                    { col: 'gp', label: 'GP' },
                    { col: 'pct', label: 'W%' },
                  ].map(({ col, label }) => (
                    <th
                      key={col}
                      className="text-right px-4 py-2 font-medium cursor-pointer select-none"
                      style={{ color: sortCol === col ? '#1B2F5E' : undefined, opacity: sortCol === col ? 1 : 0.4 }}
                      onClick={() => handleSort(col)}
                    >
                      {label}{sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((player, i) => (
                  <tr
                    key={player.id}
                    className="border-b last:border-0"
                    style={{ backgroundColor: i === 0 ? '#F5F3EF' : 'white' }}
                  >
                    <td className="px-4 py-3 font-bold opacity-30 w-8">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{player.name}</td>
                    <td
                      className="px-4 py-3 text-right font-bold"
                      style={{ color: '#1B2F5E' }}
                    >
                      {player.points}
                    </td>
                    <td className="px-4 py-3 text-right opacity-60">{player.wins}</td>
                    <td className="px-4 py-3 text-right opacity-60">{player.gamesPlayed}</td>
                    <td className="px-4 py-3 text-right opacity-60 tabular-nums">
                      {fmtWinPct(player.wins, player.gamesPlayed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 text-xs opacity-30 border-t">
              PTS = Points · W = Wins · GP = Games Played · W% = Win %
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
