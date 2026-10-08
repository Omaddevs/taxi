import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, LayoutGrid, ListChecks, Map as MapIcon, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RentCatalog } from './RentCatalog'
import { RentDetail } from './RentDetail'
import { RentForm } from './RentForm'
import { RentMap } from './RentMap'
import { RentMine, RentSaved } from './RentMine'
import { useRentNav } from './rentData'

const TABS = [
  { view: '1', label: 'Katalog', icon: LayoutGrid },
  { view: 'xarita', label: 'Xarita', icon: MapIcon },
  { view: 'yangi', label: 'Joylash', icon: Plus, primary: true },
  { view: 'saqlangan', label: 'Saqlangan', icon: Heart },
  { view: 'mening', label: 'E’lonlarim', icon: ListChecks },
]

const CLOSE_DRAG_PX = 110
const ANIM_MS = 320

/**
 * "Skuter ijara" market — a full-height sheet that slides up over whatever page is open.
 * Driven entirely by the query string (?ijara=…), so any link can open it: ServiceStrip,
 * the sidebar, a shared listing URL. Mounted once in AppLayout / DriverLayout.
 */
export function RentMarketHost() {
  const nav = useRentNav()
  const isOpen = Boolean(nav.view)
  const [mounted, setMounted] = useState(isOpen)
  const [shown, setShown] = useState(false)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef(null)

  // While sliding out the params are already gone — keep painting the last screen.
  const last = useRef(nav)
  if (isOpen) last.current = nav
  const { view, listingId, editId } = last.current

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      // Two frames: let the panel paint off-screen first so the slide-up actually animates.
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
    setShown(false)
    setDrag(0)
    const t = setTimeout(() => setMounted(false), ANIM_MS)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') nav.close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // nav.close is recreated every render; the listener only needs the latest params setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  if (!mounted) return null

  const onPointerDown = (e) => {
    dragStart.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (dragStart.current == null) return
    setDrag(Math.max(0, e.clientY - dragStart.current))
  }
  const onPointerUp = () => {
    if (dragStart.current == null) return
    dragStart.current = null
    if (drag > CLOSE_DRAG_PX) nav.close()
    else setDrag(0)
  }

  let screen
  let showTabs = false
  let showGrabber = true
  if (listingId) {
    screen = <RentDetail id={listingId} onBack={() => nav.back({ ijara: view || '1' })} />
  } else if (view === 'yangi') {
    screen = (
      <RentForm
        editId={editId}
        onBack={() => nav.back({ ijara: editId ? 'mening' : '1' })}
        onDone={() => nav.go({ ijara: 'mening' }, { replace: true })}
      />
    )
  } else if (view === 'xarita') {
    showGrabber = false
    screen = <RentMap onBack={() => nav.back({ ijara: '1' })} onOpenListing={(id) => nav.go({ ijara: 'xarita', elon: id })} />
  } else if (view === 'mening') {
    showTabs = true
    screen = <RentMine />
  } else if (view === 'saqlangan') {
    showTabs = true
    screen = <RentSaved />
  } else {
    showTabs = true
    screen = <RentCatalog onClose={nav.close} />
  }

  const activeTab = TABS.find((t) => t.view === view)?.view ?? '1'

  return createPortal(
    <div className="fixed inset-0 z-[9000]" role="dialog" aria-modal="true" aria-label="Skuter ijara">
      <button
        type="button"
        aria-label="Yopish"
        onClick={nav.close}
        className={cn('absolute inset-0 bg-ink/50 transition-opacity duration-300', shown ? 'opacity-100' : 'opacity-0')}
      />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 top-[max(10px,env(safe-area-inset-top))] flex flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-16px_50px_rgba(16,42,67,0.28)]',
          'lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:top-6 lg:w-[480px] lg:-translate-x-1/2 lg:rounded-[30px]',
          drag ? '' : 'transition-[translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          shown ? 'translate-y-0' : 'translate-y-[110%]',
        )}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      >
        {showGrabber ? (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute left-1/2 top-0 z-30 flex h-7 w-32 -translate-x-1/2 cursor-grab touch-none justify-center pt-2.5"
            aria-hidden
          >
            <span className="h-1.5 w-11 rounded-full bg-black/20" />
          </div>
        ) : null}

        <div className={cn('relative min-h-0 flex-1', showTabs ? 'overflow-y-auto' : 'overflow-hidden')}>{screen}</div>

        {showTabs ? (
          <nav className="grid shrink-0 grid-cols-5 border-t border-line bg-white px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
            {TABS.map((t) => {
              const active = activeTab === t.view
              if (t.primary) {
                return (
                  <button key={t.view} type="button" onClick={() => nav.go({ ijara: t.view })} className="flex flex-col items-center gap-0.5">
                    <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(140deg,#00d2de,#00a3ae)] text-white shadow-[0_8px_20px_rgba(0,163,174,0.45)] ring-4 ring-white transition active:scale-90">
                      <t.icon className="h-6 w-6" strokeWidth={3} />
                    </span>
                    <span className="text-[11px] font-bold text-brand-dark">{t.label}</span>
                  </button>
                )
              }
              return (
                <button
                  key={t.view}
                  type="button"
                  onClick={() => nav.go({ ijara: t.view }, { replace: true })}
                  className={cn('flex flex-col items-center gap-1 py-1 transition', active ? 'text-ink' : 'text-muted')}
                >
                  <t.icon className={cn('h-6 w-6', active && t.view === 'saqlangan' && 'fill-ink')} strokeWidth={active ? 2.4 : 2} />
                  <span className={cn('text-[11px]', active ? 'font-bold' : 'font-semibold')}>{t.label}</span>
                </button>
              )
            })}
          </nav>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
