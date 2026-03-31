import { Link, useLocation } from 'react-router-dom'
import { isAdmin } from '../lib/auth'

export default function Layout({ children }) {
  const location = useLocation()
  const admin = isAdmin()

  const nav = [
    { to: '/', label: 'Standings' },
    { to: '/active', label: 'Active' },
    { to: '/weeks', label: 'Weeks' },
    { to: '/tournament', label: 'Tournament' },
    { to: '/rules', label: 'Rules' },
  ]

  return (
    <div className="flex flex-col min-h-svh">
      {/* Header */}
      <header style={{ backgroundColor: '#1B2F5E' }} className="text-white px-4 pt-4 pb-0 shadow-md">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo-192.png" alt="Bush League Bocce" className="w-10 h-10 rounded-full" />
            <div>
              <div className="font-bold text-lg leading-tight">Bush League Bocce</div>
              <div style={{ color: '#89B4D0' }} className="text-xs">Oakhurst Neighborhood</div>
            </div>
            <div className="ml-auto">
              {admin ? (
                <Link
                  to="/admin"
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: '#2a4a82', color: '#89B4D0' }}
                >
                  ⚙ Admin
                </Link>
              ) : (
                <Link
                  to="/admin/login"
                  className="text-xs opacity-40 hover:opacity-70 transition-opacity"
                  style={{ color: '#89B4D0' }}
                >
                  commissioner
                </Link>
              )}
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1">
            {nav.map(({ to, label }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className="px-4 py-2 text-sm font-medium rounded-t-md transition-colors"
                  style={{
                    backgroundColor: active ? '#F5F3EF' : 'transparent',
                    color: active ? '#1B2F5E' : '#89B4D0',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {children}
      </main>

      <footer className="text-center text-xs py-4 opacity-30">
        Bush League Bocce · Oakhurst
      </footer>
    </div>
  )
}
