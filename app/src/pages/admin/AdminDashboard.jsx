import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../lib/auth'
import { useEffect, useState } from 'react'
import { getWeeks, getTournament } from '../../lib/db'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [weeks, setWeeks] = useState([])
  const [tournament, setTournament] = useState(null)

  useEffect(() => {
    getWeeks().then(setWeeks).catch(console.error)
    getTournament().then(setTournament).catch(console.error)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const activeWeek = weeks.find((w) => w.status === 'active')
  const allComplete = weeks.length > 0 && weeks.every((w) => w.status === 'completed')

  const tiles = [
    {
      to: '/admin/roster',
      icon: '👥',
      label: 'Manage Roster',
      desc: 'Add or remove players',
    },
    {
      to: activeWeek ? `/admin/weeks/${activeWeek.id}` : '/admin/weeks/new',
      icon: activeWeek ? '🎯' : '➕',
      label: activeWeek ? `Manage Week ${activeWeek.week_number}` : 'New Session',
      desc: activeWeek ? 'Record games, close week' : 'Set attendance & generate teams',
    },
    {
      to: '/admin/tournament',
      icon: '🏆',
      label: 'Tournament',
      desc: tournament ? 'Manage bracket' : allComplete ? 'Ready to seed' : 'Finish all weeks first',
      disabled: !tournament && !allComplete,
    },
    {
      to: '/admin/chat',
      icon: '💬',
      label: 'AI Assistant',
      desc: activeWeek ? 'Log games by talking' : 'Start a session first',
      disabled: !activeWeek,
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">Commissioner</div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2F5E' }}>Admin Panel</h1>
      </div>

      {/* Past weeks quick links */}
      {weeks.filter((w) => w.status !== 'active').length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Past Weeks</div>
          <div className="flex gap-2 flex-wrap">
            {weeks
              .filter((w) => w.status !== 'active')
              .map((w) => (
                <Link
                  key={w.id}
                  to={`/admin/weeks/${w.id}`}
                  className="text-xs px-3 py-1 rounded-full border font-medium"
                  style={{ borderColor: '#1B2F5E', color: '#1B2F5E' }}
                >
                  Week {w.week_number}
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
