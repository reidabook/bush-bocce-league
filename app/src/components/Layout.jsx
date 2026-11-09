import { useState } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import CommishMenu from './CommishMenu'
import { isAdmin } from '../lib/auth'
import { useActiveSession } from '../lib/useActiveSession'
import { Icon } from './ui'

const TABS = [
  { to: '/', label: 'Standings', icon: 'standings', end: true },
  { to: '/tonight', label: 'Tonight', icon: 'tonight' },
  { to: '/sessions', label: 'Sessions', icon: 'sessions' },
  { to: '/rules', label: 'Rules', icon: 'rules' },
]

export function Ridge() {
  return (
    <svg viewBox="0 0 390 22" preserveAspectRatio="none" aria-hidden="true"
      className="absolute left-0 right-0 -bottom-px w-full h-[22px] block">
      <path d="M0 22 L0 15 L34 9 L58 14 L92 3 L118 12 L150 7 L178 15 L214 5 L246 13 L280 8 L316 16 L350 6 L390 13 L390 22 Z" fill="#89B4D0" opacity=".55" />
      <path d="M0 22 L0 18 L44 12 L70 17 L104 8 L136 16 L170 12 L204 19 L238 10 L270 17 L306 12 L340 19 L372 13 L390 16 L390 22 Z" style={{ fill: 'var(--ice)' }} />
    </svg>
  )
}

export function Header({ children }) {
  return (
    <header className="relative text-white pb-[26px]" style={{ backgroundColor: 'var(--navy)', paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
      <div className="max-w-lg mx-auto px-4 flex items-center gap-2.5">{children}</div>
      <Ridge />
    </header>
  )
}

export default function Layout({ children }) {
  const admin = isAdmin()
  const active = useActiveSession()
  const [params, setParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = admin && (menuOpen || params.get('commish') === '1')
  function closeMenu() {
    setMenuOpen(false)
    if (params.get('commish')) { params.delete('commish'); setParams(params, { replace: true }) }
  }

  return (
    <div className="flex flex-col min-h-svh">
      <Header>
        <Link to="/" className="flex items-center gap-2.5 rounded-lg">
          <img src="/logo-192.png" alt="" className="w-9 h-9 rounded-full" />
          <span className="flex flex-col leading-none">
            <span className="font-display font-black text-2xl tracking-[.03em] whitespace-nowrap">Bush League</span>
            <span className="text-[11px] font-semibold tracking-[.14em] uppercase text-sky mt-[3px] whitespace-nowrap">Bocce · Oakhurst</span>
          </span>
        </Link>
        {admin ? (
          <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-label="Commissioner menu"
            className="ml-auto h-11 px-3 -mr-1 flex items-center">
            <span className="h-9 px-3 rounded-full ring-[1.5px] ring-sky text-white text-[13px] font-semibold flex items-center gap-1.5">
              <Icon name="person" size={16} /><span className="sr-only min-[380px]:not-sr-only">Commissioner</span>
            </span>
          </button>
        ) : (
          <Link to="/admin/login" aria-label="Commissioner login" className="ml-auto w-11 h-11 flex items-center justify-center text-sky rounded-full">
            <Icon name="person" strokeWidth={1.8} />
          </Link>
        )}
      </Header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-2 pb-28">{children}</main>

      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-line"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto flex px-2">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `relative flex-1 flex flex-col items-center gap-[3px] pt-2 pb-1 min-h-[52px] text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}>
              <Icon name={t.icon} />
              {t.label}
              {t.to === '/tonight' && active && (
                <span className="absolute top-[7px] left-[calc(50%+8px)] w-[7px] h-[7px] rounded-full bg-live" aria-label="Session live" />
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <CommishMenu open={menu} onClose={closeMenu} active={active} />
    </div>
  )
}
