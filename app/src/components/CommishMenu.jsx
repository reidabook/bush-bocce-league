import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../lib/auth'
import Sheet from './Sheet'
import { Icon } from './ui'

function Row({ to, onClick, title, sub, onNavigate }) {
  const inner = (
    <>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[17px]">{title}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      <Icon name="chevron" size={18} className="text-muted" />
    </>
  )
  const cls = 'flex items-center gap-3 w-full text-left px-4 min-h-[60px] py-2 border-t border-hair first:border-t-0'
  return to
    ? <Link to={to} onClick={onNavigate} className={cls}>{inner}</Link>
    : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

export default function CommishMenu({ open, onClose, active }) {
  const navigate = useNavigate()
  return (
    <Sheet open={open} title="Commissioner" onClose={onClose}>
      <div className="bg-card rounded-2xl overflow-hidden">
        {active
          ? <Row to="/tonight" onNavigate={onClose} title="Go to tonight" sub={`Session ${active.session_number} is live`} />
          : <Row to="/admin/sessions/new" onNavigate={onClose} title="Start a session" sub="Who's here, then teams" />}
        <Row to="/admin/roster" onNavigate={onClose} title="Roster" sub="Add, rename or remove players" />
        <Row to="/admin/tournament" onNavigate={onClose} title="Tournament" sub="End-of-season bracket" />
      </div>
      <button type="button" onClick={() => { logout(); onClose(); navigate('/') }}
        className="w-full h-12 rounded-xl text-[15px] font-bold text-muted">Log out</button>
    </Sheet>
  )
}
