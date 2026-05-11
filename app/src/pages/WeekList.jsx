import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWeeks } from '../lib/db'
import Spinner from '../components/Spinner'

const statusLabel = {
  setup: { text: 'Setting up', color: '#89B4D0' },
  active: { text: 'In Progress', color: '#16a34a' },
  completed: { text: 'Completed', color: '#6b7280' },
}

export default function WeekList() {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getWeeks()
      .then(setWeeks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
      <p className="font-semibold text-red-700 text-sm">Failed to load sessions</p>
      <p className="text-red-600 text-xs font-mono break-all">{error}</p>
      <p className="text-red-500 text-xs">Visit <a href="/api/debug" className="underline" target="_blank">/api/debug</a> for connection details.</p>
    </div>
  )

  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">
        All Sessions
      </h2>
      {weeks.length === 0 ? (
        <p className="text-sm opacity-50 text-center py-8">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {weeks.map((week) => {
            const s = statusLabel[week.status] || statusLabel.setup
            return (
              <Link
                key={week.id}
                to={`/weeks/${week.id}`}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="font-bold" style={{ color: '#1B2F5E' }}>
                    Week {week.week_number}
                  </div>
                  <div className="text-sm opacity-60">
                    {new Date(week.date + 'T12:00:00').toLocaleDateString('en-US', {
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
