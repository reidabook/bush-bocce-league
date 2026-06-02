import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../lib/auth'
import { useEffect, useState } from 'react'
import { getSessions } from '../../lib/db'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const activeSession = sessions.find((s) => s.status === 'active')

  const tiles = [
    {
      to: '/admin/roster',
      icon: '👥',
      label: 'Manage Roster',
      desc: 'Add or remove players',
    },
    {
      to: activeSession ? `/admin/sessions/${activeSession.id}` : '/admin/sessions/new',
      icon: activeSession ? '🎯' : '➕',
      label: activeSession ? `Manage Session ${activeSession.week_number}` : 'New Session',
      desc: activeSession ? 'Record games, close session' : 'Set attendance & generate teams',
    },
    {
      to: '/admin/chat',
      icon: '💬',
      label: 'AI Assistant',
      desc: activeSession ? 'Log games by talking' : 'Start a session first',
      disabled: !activeSession,
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Commissioner</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>Admin Panel</h1>
      </div>

      {/* Past sessions quick links */}
      {sessions.filter((s) => s.status !== 'active').length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Past Sessions</div>
          <div className="flex gap-2 flex-wrap">
            {sessions
              .filter((s) => s.status !== 'active')
              .map((s) => (
                <Link
                  key={s.id}
                  to={`/admin/sessions/${s.id}`}
                  className="text-xs px-3 py-1 rounded-full border font-medium"
                  style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                >
                  Session {s.week_number}
                </Link>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.disabled ? '#' : tile.to}
            className={`flex items-center gap-4 bg-white rounded-xl px-4 py-4 shadow-sm ${tile.disabled ? 'opacity-40 pointer-events-none' : 'hover:shadow-md transition-shadow'}`}
          >
            <div className="text-2xl w-10 text-center">{tile.icon}</div>
            <div>
              <div className="font-bold text-sm" style={{ color: '#1B2F5E' }}>{tile.label}</div>
              <div className="text-xs opacity-50">{tile.desc}</div>
            </div>
            <div className="ml-auto opacity-20 text-lg">›</div>
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border text-sm font-medium opacity-50 hover:opacity-100 transition-opacity"
        style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
      >
        Log out
      </button>
    </div>
  )
}
