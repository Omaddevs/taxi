import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { ArrowLeft, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function DriverHeader({ title, right, back = true, onBack, className = '' }) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-20 overflow-x-clip bg-white/95 px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur',
        className,
      )}
    >
      <div className="relative flex items-center justify-between gap-2">
        {back ? (
          <button
            type="button"
            onClick={onBack || (() => navigate(-1))}
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-10 w-10 shrink-0" />
        )}
        <h1 className="pointer-events-none absolute inset-x-14 truncate text-center text-[17px] font-extrabold leading-10">
          {title}
        </h1>
        <div className="relative z-10 flex h-10 min-w-10 shrink-0 items-center justify-end">
          {right ?? <div className="w-10" />}
        </div>
      </div>
    </header>
  )
}

export function DriverTabs({ children, className = '' }) {
  return <div className={cn('grid grid-cols-4 gap-1 border-b border-line px-3 pt-2', className)}>{children}</div>
}

export function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
        on ? 'bg-brand' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
          on ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function StatusBadge({ status }) {
  const map = {
    PENDING: { label: 'Kutmoqda', className: 'bg-orange-50 text-orange-600' },
    ACCEPTED: { label: 'Faol', className: 'bg-emerald-50 text-emerald-600' },
    ONGOING: { label: 'Faol', className: 'bg-emerald-50 text-emerald-600' },
    NEW: { label: 'Yangi', className: 'bg-brand-soft text-brand' },
    COMPLETED: { label: 'Bajarilgan', className: 'bg-sky-50 text-sky-600' },
    CANCELLED: { label: 'Bekor qilingan', className: 'bg-slate-100 text-slate-500' },
  }
  const item = map[status] || map.PENDING
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', item.className)}>{item.label}</span>
}

export function RouteStops({ from, fromHint, to, toHint, whenText, compact }) {
  return (
    <div className={cn('relative', compact ? 'pl-4' : 'pl-5')}>
      <span className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />
      <div className="relative pb-3">
        <span className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-sky-100" />
        <p className="text-sm font-bold leading-snug">{from}</p>
        {fromHint ? <p className="text-[11px] text-muted">Mo‘ljal: {fromHint}</p> : null}
      </div>
      <div className="relative">
        <span className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-brand-soft" />
        <p className="text-sm font-bold leading-snug">{to}</p>
        {toHint ? <p className="text-[11px] text-muted">Mo‘ljal: {toHint}</p> : null}
        {whenText ? <p className="text-[11px] font-semibold text-brand">🕐 Jo‘nash vaqti: {whenText}</p> : null}
      </div>
    </div>
  )
}

export function SeatChips({ chips }) {
  if (!chips?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span
          key={i}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
            c.gender === 'MALE' ? 'bg-seat-male-soft text-seat-male' : 'bg-seat-female-soft text-seat-female',
          )}
        >
          {c.label} · {c.gender === 'MALE' ? 'Erkak' : 'Ayol'}
        </span>
      ))}
    </div>
  )
}

export function timeHm(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function remainingSeconds(iso, windowSec = 60) {
  if (!iso) return windowSec
  const elapsed = (Date.now() - new Date(iso).getTime()) / 1000
  return Math.max(0, Math.round(windowSec - elapsed))
}

export function formatMmSs(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function DriverSheet({ title, onClose, children, footer }) {
  return createPortal(
    <div className="fixed inset-0 z-[11000]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-3 flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-base font-extrabold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-canvas"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
