import { Link } from 'react-router-dom'

export function PageTitle({ eyebrow, title, meta, size = 'md', children }) {
  const sz = size === 'lg' ? 'text-5xl leading-[.9]' : 'text-[30px] leading-none'
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 min-w-0">
        {eyebrow}
        <h1 className={`font-display font-black text-brand ${sz}`}>{title}</h1>
        {meta && <p className="text-[15px] text-muted mt-1">{meta}</p>}
      </div>
      {children}
    </div>
  )
}

export function SectionLabel({ children, right, as: Tag = 'h2' }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <Tag className="text-xs font-bold tracking-[.12em] uppercase text-muted">{children}</Tag>
      {right && <span className="text-[13px] text-muted">{right}</span>}
    </div>
  )
}

export function Card({ className = '', children, ...rest }) {
  return <div className={`bg-card rounded-2xl ${className}`} {...rest}>{children}</div>
}

export function LiveLabel({ children = 'Live' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[.12em] uppercase text-live">
      <span className="w-2 h-2 rounded-full bg-live" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Pill({ children, tone = 'live' }) {
  const t = tone === 'live' ? 'text-live bg-live-bg' : 'text-muted bg-hair'
  return <span className={`text-xs font-bold rounded-[10px] px-2 py-[3px] ${t}`}>{children}</span>
}

const BTN = {
  primary: 'bg-[#1B2F5E] text-white dark:bg-sky dark:text-[#0B1530]',
  secondary: 'bg-card text-brand ring-[1.5px] ring-inset ring-line',
  ghost: 'bg-transparent text-brand',
  danger: 'bg-card text-danger ring-[1.5px] ring-inset ring-line',
}

export function Button({ variant = 'primary', size = 'md', to, className = '', children, ...rest }) {
  const h = size === 'lg' ? 'h-[54px] text-[17px] rounded-2xl px-5' : size === 'sm' ? 'h-9 text-sm rounded-full px-3' : 'h-11 text-[15px] rounded-xl px-4'
  const cls = `inline-flex items-center justify-center gap-2 font-bold select-none transition-opacity disabled:opacity-40 ${h} ${BTN[variant]} ${className}`
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  return <button type="button" className={cls} {...rest}>{children}</button>
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 gap-2">
      <p className="font-display font-extrabold text-2xl text-brand">{title}</p>
      {children && <p className="text-[15px] text-muted max-w-xs">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Icon({ name, size = 22, strokeWidth = 2, className = '' }) {
  const p = ICONS[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{p}</svg>
  )
}

const ICONS = {
  standings: <path d="M5 20V11M12 20V5M19 20v-6" />,
  tonight: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></>,
  sessions: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  rules: <><path d="M6 4h10l3 3v13H6z" /><path d="M9 11h7M9 15h5" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12l5 5 9-10" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  more: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
  arrow: <path d="M5 12h12M13 7l5 5-5 5" />,
  shuffle: <path d="M4 7h3c5 0 5 10 10 10h3M17 4l3 3-3 3M4 17h3c1.5 0 2.5-.9 3.3-2M17 14l3 3-3 3M14 9c.8-1.2 1.8-2 3-2h3" />,
  sparkle: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" />,
  send: <path d="M5 12h14M13 6l6 6-6 6" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
}
