import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { SITE_MENUS } from '../../data/siteMenus'
import { t } from '../../i18n'

const CLOSE_DELAY_MS = 140

/**
 * A drop-down group in the desktop menus ("Kompaniya", "Resurslar" — `menu` is a key of
 * SITE_MENUS): a trigger styled like its neighbours (`className`) and a panel that drops under
 * it. Opens on hover and on click/keyboard; closes on leaving, on Escape, on a click elsewhere
 * and after choosing. `activeClassName` marks it while one of its pages is open.
 */
export function NavDropdown({ menu, className = '', activeClassName = '' }) {
  const { label, items } = SITE_MENUS[menu]
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const rootRef = useRef(null)
  const closeTimer = useRef(0)
  const panelId = useId()
  const active = items.some((item) => item.to && pathname.startsWith(item.to))

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const openNow = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // A short grace period, so the pointer can cross the gap between the trigger and the panel.
  const closeSoon = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  const row = 'group flex items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition hover:bg-canvas'

  return (
    <div ref={rootRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        className={`inline-flex items-center gap-1 ${className} ${active ? activeClassName : ''}`}
      >
        {t(label)}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.4} />
      </button>

      <div
        id={panelId}
        className={`absolute left-1/2 top-full z-50 w-[292px] -translate-x-1/2 pt-3 transition duration-200 ease-out ${
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
        }`}
      >
        <ul className="rounded-[20px] bg-white p-2 text-ink shadow-[0_22px_50px_-14px_rgba(15,29,42,0.35)] ring-1 ring-black/[0.06]">
          {items.map((item) => {
            const Icon = item.icon
            const current = item.to && pathname.startsWith(item.to)
            const body = (
              <>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
                    current ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold leading-tight text-ink">{t(item.label)}</span>
                  <span className="block truncate text-[12.5px] font-medium text-muted">{t(item.hint)}</span>
                </span>
                {item.href ? <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-ink" /> : null}
              </>
            )
            return (
              <li key={item.label}>
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={row}>
                    {body}
                  </a>
                ) : (
                  <Link to={item.to} onClick={() => setOpen(false)} aria-current={current ? 'page' : undefined} className={row}>
                    {body}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
