import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSessions } from '../lib/db'
import Spinner from '../components/Spinner'

const statusLabel = {
  setup: { text: 'Setting up', color: '#89B4D0' },
  active: { text: 'In Progress', color: '#16a34a' },
  completed: { text: 'Completed', color: '#6b7280' },
  historical: { text: 'Completed', color: '#6b7280' },
}

export default function SessionList() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [initializing, setInitializing] = useState(false)
  const [initResult, setInitResult] = useState(null)

  useEffect(() => {
    getSessions()
      .then(setSessions)
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

  if (loading) return <Spinner />
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
      <p className="font-semibold text-red-700 text-sm">Failed to load sessions</p>
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
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">
        All Sessions
      </h2>
      {sessions.length === 0 ? (
        <p className="text-sm opacity-50 text-center py-8">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const s = statusLabel[session.status] || statusLabel.setup
            return (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="font-bold" style={{ color: '#1B2F5E' }}>
                    Session {session.session_number}
                  </div>
                  <div className="text-sm opacity-60">
                    {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: s.color, backgroundColor: s.color + '20' }}>
                  {s.text}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
