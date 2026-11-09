import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './ui'

// Bottom sheet dialog. Closes on backdrop tap, Escape, or the X.
export default function Sheet({ open, title, onClose, children, footer }) {
  const panel = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-[#0F1C3D]/50 dark:bg-black/65" onClick={onClose} aria-hidden="true" />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className="relative w-full max-w-lg bg-ice rounded-t-3xl max-h-[88svh] flex flex-col outline-none focus-visible:outline-none"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))', outline: 'none' }}>
        <div className="flex items-center gap-2 pl-5 pr-2 pt-3 pb-2">
          <h2 className="flex-1 font-display font-extrabold text-[22px] text-brand">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 flex items-center justify-center text-muted rounded-full">
            <Icon name="close" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-2 space-y-4">{children}</div>
        {footer && <div className="px-4 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
