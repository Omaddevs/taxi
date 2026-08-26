import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Search, X } from 'lucide-react'
import { MONTHS, cn, formatDateShortUz } from '../../lib/utils'
import { REGIONS, formatPlace, getRegion, searchUzPlaces } from '../../data/uzbekistan'

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

function toIso(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseIso(iso) {
  const [y, m, d] = (iso || '2026-05-22').split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

function useDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

function BottomSheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[120] lg:hidden">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.18)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function PickerTrigger({ icon: Icon, label, value, open, onClick, variant = 'card' }) {
  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-14 w-full items-center gap-3 px-1 text-left transition',
          open && 'text-brand',
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
          <span className="mt-0.5 block truncate text-[15px] font-extrabold leading-5 text-ink">{value}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-14 w-full items-center gap-3 rounded-2xl bg-canvas px-3.5 text-left transition',
        open ? 'bg-white ring-2 ring-brand/25' : 'hover:bg-slate-100',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-bold leading-5 text-ink">{value}</span>
      </span>
      <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180 text-brand')} />
    </button>
  )
}

function PickerShell({ open, onClose, title, align = 'left', trigger, children, panelClass }) {
  const ref = useRef(null)
  const desktop = useDesktop()

  useEffect(() => {
    if (!open || !desktop) return
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, desktop, onClose])

  return (
    <div ref={ref} className="relative min-w-0">
      {trigger}
      {open && desktop ? (
        <div
          className={cn(
            'absolute top-[calc(100%+8px)] z-50 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-3 text-ink shadow-[0_18px_50px_rgba(28,28,40,0.16)]',
            align === 'right' ? 'right-0' : 'left-0',
            panelClass,
          )}
        >
          {children}
        </div>
      ) : null}
      <BottomSheet open={open && !desktop} title={title} onClose={onClose}>
        {children}
      </BottomSheet>
    </div>
  )
}

export function DatePicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card' }) {
  const selected = parseIso(value)
  const [view, setView] = useState({ year: selected.year, month: selected.month })

  useEffect(() => {
    if (open) setView({ year: selected.year, month: selected.month })
  }, [open, selected.year, selected.month])

  const first = new Date(view.year, view.month, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const todayIso = toIso(2026, 7, 24)

  const shiftMonth = (delta) => {
    const next = new Date(view.year, view.month + delta, 1)
    setView({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Sanani tanlang"
      trigger={
        <PickerTrigger
          icon={CalendarIcon}
          label="Sana"
          value={formatDateShortUz(value)}
          open={open}
          onClick={onToggle}
          variant={triggerVariant}
        />
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold">
          {MONTHS[view.month]} {view.year}
        </p>
        <button type="button" onClick={() => shiftMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const iso = toIso(view.year, view.month, day)
          const active = iso === value
          const isToday = iso === todayIso
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                onChange(iso)
                onClose()
              }}
              className={cn(
                'h-10 rounded-xl text-sm font-semibold transition',
                active && 'bg-brand text-white shadow-sm shadow-brand/30',
                !active && isToday && 'bg-brand-soft text-brand',
                !active && !isToday && 'text-ink hover:bg-canvas',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </PickerShell>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function splitTime(value) {
  const [h = '18', m = '00'] = (value || '18:00').split(':')
  return { h: h.padStart(2, '0'), m: m.padStart(2, '0') }
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function TimePicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card' }) {
  const { h, m } = splitTime(value)

  function setPart(part, next) {
    onChange(part === 'h' ? `${next}:${m}` : `${h}:${next}`)
  }

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Vaqtni tanlang"
      trigger={
        <PickerTrigger icon={ClockIcon} label="Vaqt" value={value} open={open} onClick={onToggle} variant={triggerVariant} />
      }
      panelClass="w-[300px]"
    >
      <p className="mb-3 text-center text-[32px] font-extrabold tracking-tight text-ink">
        {h}:{m}
      </p>
      <div className="mb-3 flex gap-2">
        {['Hozir', '+15 daq', '+30 daq'].map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (label === 'Hozir') onChange(nowTime())
              else {
                const add = label.startsWith('+15') ? 15 : 30
                const d = new Date()
                d.setMinutes(d.getMinutes() + add)
                onChange(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
              }
            }}
            className="flex-1 rounded-xl bg-canvas py-2 text-xs font-bold text-ink hover:bg-brand-soft hover:text-brand"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">Soat</p>
          <div className="no-scrollbar grid h-40 grid-cols-4 content-start gap-1.5 overflow-y-auto pr-0.5">
            {HOURS.map((hour) => (
              <button
                key={`h-${hour}`}
                type="button"
                aria-label={`${hour} soat`}
                onClick={() => setPart('h', hour)}
                className={cn(
                  'h-9 rounded-xl text-sm font-bold',
                  hour === h ? 'bg-brand text-white shadow-sm shadow-brand/30' : 'bg-canvas text-ink hover:bg-brand-soft',
                )}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">Daqiqa</p>
          <div className="no-scrollbar grid h-40 grid-cols-4 content-start gap-1.5 overflow-y-auto pr-0.5">
            {MINUTES.map((min) => (
              <button
                key={`m-${min}`}
                type="button"
                aria-label={`${min} daqiqa`}
                onClick={() => setPart('m', min)}
                className={cn(
                  'h-9 rounded-xl text-sm font-bold',
                  min === m ? 'bg-brand text-white shadow-sm shadow-brand/30' : 'bg-canvas text-ink hover:bg-brand-soft',
                )}
              >
                {min}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 flex h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white"
      >
        Shu vaqtni tanlash
      </button>
    </PickerShell>
  )
}

function ClockIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

export function PassengerPicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card' }) {
  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Yo‘lovchilar"
      trigger={
        <PickerTrigger
          icon={UsersIcon}
          label="Yo‘lovchilar"
          value={`${value} kishi`}
          open={open}
          onClick={onToggle}
          variant={triggerVariant}
        />
      }
      panelClass="w-[280px]"
    >
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
        <span className="text-sm font-semibold">Nechta yo‘lovchi?</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(Math.max(1, value - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand shadow-sm"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-7 text-center text-xl font-extrabold">{value}</span>
          <button
            type="button"
            onClick={() => onChange(Math.min(6, value + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onChange(n)
              onClose()
            }}
            className={cn(
              'rounded-2xl py-3 text-sm font-bold',
              n === value ? 'bg-brand text-white' : 'bg-canvas hover:bg-brand-soft hover:text-brand',
            )}
          >
            {n} kishi
          </button>
        ))}
      </div>
    </PickerShell>
  )
}

function UsersIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16.5 19c.4-2.2 1.8-3.7 4.5-4" />
    </svg>
  )
}

const LUGGAGE = [
  { id: 'Kichik', title: 'Kichik', desc: 'Qo‘l yuki, sumka' },
  { id: "O'rta", title: 'O‘rta', desc: '1–2 chamadon' },
  { id: 'Katta', title: 'Katta', desc: '3+ chamadon' },
]

export function LuggagePicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card' }) {
  const current = LUGGAGE.find((x) => x.id === value) || LUGGAGE[1]
  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Bagaj hajmi"
      align="right"
      trigger={
        <PickerTrigger
          icon={BagIcon}
          label="Bagaj"
          value={current.title}
          open={open}
          onClick={onToggle}
          variant={triggerVariant}
        />
      }
      panelClass="w-[280px]"
    >
      <div className="space-y-2">
        {LUGGAGE.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onChange(item.id)
              onClose()
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left',
              item.id === value ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas',
            )}
          >
            <span>
              <span className="block text-sm font-bold">{item.title}</span>
              <span className="text-xs text-muted">{item.desc}</span>
            </span>
            {item.id === value ? <Check className="h-5 w-5 text-brand" /> : null}
          </button>
        ))}
      </div>
    </PickerShell>
  )
}

function BagIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

const GENDERS = [
  { id: 'erkak', title: 'Erkak', desc: 'Erkak yo‘lovchi' },
  { id: 'ayol', title: 'Ayol', desc: 'Ayol yo‘lovchi' },
  { id: 'juft', title: 'Juft', desc: 'Er-xotin' },
]

export function GenderPicker({ value, onChange, passengers = 1, open, onToggle, onClose, triggerVariant = 'card' }) {
  const options = passengers > 1 ? GENDERS : GENDERS.filter((item) => item.id !== 'juft')
  const current = options.find((x) => x.id === value)

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Jins"
      align="right"
      trigger={
        <PickerTrigger
          icon={GenderIcon}
          label="Jins"
          value={current?.title || 'Tanlang'}
          open={open}
          onClick={onToggle}
          variant={triggerVariant}
        />
      }
      panelClass="w-[280px]"
    >
      <div className="space-y-2">
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onChange(item.id)
              onClose()
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left',
              item.id === value ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas',
            )}
          >
            <span>
              <span className="block text-sm font-bold">{item.title}</span>
              <span className="text-xs text-muted">{item.desc}</span>
            </span>
            {item.id === value ? <Check className="h-5 w-5 text-brand" /> : null}
          </button>
        ))}
      </div>
    </PickerShell>
  )
}

function GenderIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M6.5 19c0-3.4 2.4-5.5 5.5-5.5s5.5 2.1 5.5 5.5" />
    </svg>
  )
}

const SEATS = [
  { id: 'old', title: 'Old o‘rindiq', desc: 'Haydovchi yonida' },
  { id: 'orqa-ong', title: 'Orqa o‘ng', desc: 'Orqa qator, o‘ng tomon' },
  { id: 'orqa-chap', title: 'Orqa chap', desc: 'Orqa qator, chap tomon' },
  { id: 'orqa-orta', title: 'Orqa o‘rta', desc: 'Orqa qator, o‘rtada' },
  { id: 'farqi-yoq', title: 'Farqi yo‘q', desc: 'Istalgan joy' },
]

export function SeatPicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card' }) {
  const current = SEATS.find((x) => x.id === value)

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="O‘rindiq tanlash"
      align="right"
      trigger={
        <PickerTrigger
          icon={SeatIcon}
          label="O‘rindiq"
          value={current?.title || 'Tanlang'}
          open={open}
          onClick={onToggle}
          variant={triggerVariant}
        />
      }
      panelClass="w-[280px]"
    >
      <div className="space-y-2">
        {SEATS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onChange(item.id)
              onClose()
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left',
              item.id === value ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas',
            )}
          >
            <span>
              <span className="block text-sm font-bold">{item.title}</span>
              <span className="text-xs text-muted">{item.desc}</span>
            </span>
            {item.id === value ? <Check className="h-5 w-5 text-brand" /> : null}
          </button>
        ))}
      </div>
    </PickerShell>
  )
}

function SeatIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 14V8.5A2.5 2.5 0 0 1 8.5 6h3A2.5 2.5 0 0 1 14 8.5V14" />
      <path d="M5 14h14v2.5a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 16.5V14z" />
      <path d="M8 18v1.5M16 18v1.5" />
    </svg>
  )
}

const CARS = [
  { id: 'cobalt', title: 'Chevrolet Cobalt', photo: '/cars/models/cobalt.png?v=2' },
  { id: 'gentra', title: 'Chevrolet Gentra', photo: '/cars/models/gentra.png?v=2' },
  { id: 'lacetti', title: 'Chevrolet Lacetti', photo: '/cars/models/lacetti.png?v=2' },
  { id: 'spark', title: 'Chevrolet Spark', photo: '/cars/models/spark.png?v=2' },
  { id: 'captiva', title: 'Chevrolet Captiva', photo: '/cars/models/captiva.png?v=2' },
  { id: 'malibu-xl', title: 'Chevrolet Malibu XL', photo: '/cars/models/malibu-xl.png?v=2' },
  { id: 'nexia', title: 'Daewoo Nexia', photo: '/cars/models/nexia.png?v=2' },
  { id: 'nexia-r3', title: 'Nexia R3', photo: '/cars/models/nexia-r3.png?v=2' },
]

export function CarPicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card' }) {
  const current = CARS.find((x) => x.id === value)

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Avtomobil tanlash"
      align="right"
      trigger={
        <PickerTrigger
          icon={CarPickIcon}
          label="Avtomobil"
          value={current?.title || 'Tanlang'}
          open={open}
          onClick={onToggle}
          variant={triggerVariant}
        />
      }
      panelClass="w-[min(340px,calc(100vw-2rem))]"
    >
      <div className="space-y-2">
        {CARS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onChange(item.id)
              onClose()
            }}
            className={cn(
              'flex w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3.5 text-left',
              item.id === value ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas',
            )}
          >
            <span className="flex h-[96px] w-[168px] shrink-0 items-center justify-center">
              <img src={item.photo} alt="" className="max-h-[96px] w-full object-contain" />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold leading-5">{item.title}</span>
            {item.id === value ? <Check className="h-5 w-5 shrink-0 text-brand" /> : null}
          </button>
        ))}
      </div>
    </PickerShell>
  )
}

function CarPickIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15.5h16l-1.4-5.2A2 2 0 0 0 16.7 9H7.3a2 2 0 0 0-1.9 1.3L4 15.5z" />
      <circle cx="7.5" cy="16.8" r="1.4" />
      <circle cx="16.5" cy="16.8" r="1.4" />
      <path d="M8 9.2V7.6A1.6 1.6 0 0 1 9.6 6h4.8A1.6 1.6 0 0 1 16 7.6v1.6" />
    </svg>
  )
}

export function RegionPicker({ label, region, place, onChange, open, onToggle, onClose, variant = 'stacked', icon: RowIcon }) {
  const [step, setStep] = useState('region')
  const [picked, setPicked] = useState(region)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('region')
    setPicked(region)
    setQuery('')
  }, [open, region])

  const districts = getRegion(picked)?.districts || []
  const searchHits = query.trim().length ? searchUzPlaces(query) : []
  const display = formatPlace(region, place) || 'Tanlang'

  function pickRegion(name) {
    setPicked(name)
    setQuery('')
    setStep('district')
  }

  function pickPlace(nextRegion, nextPlace) {
    onChange({ region: nextRegion, place: nextPlace, label: formatPlace(nextRegion, nextPlace) })
    onClose()
  }

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title={label}
      panelClass="w-[min(360px,calc(100vw-2rem))]"
      trigger={
        variant === 'row' ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-[68px] w-full items-center gap-3 px-3.5 text-left"
          >
            {RowIcon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <RowIcon className="h-[18px] w-[18px]" />
              </span>
            ) : null}
            <span className="min-w-0 flex-1 overflow-hidden pr-9">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
              <span className="mt-0.5 block truncate text-[15px] font-extrabold leading-5 text-ink">{display}</span>
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180 text-brand')} />
          </button>
        ) : (
          <div>
            <span className="mb-1.5 block text-[11px] font-medium leading-none text-white/80">{label}</span>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-white px-3.5 text-left text-[15px] font-semibold text-ink"
            >
              <span className="min-w-0 truncate">{display}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180 text-brand')} />
            </button>
          </div>
        )
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Viloyat yoki tuman qidiring"
          className="h-11 w-full rounded-2xl bg-canvas pl-9 pr-3 text-sm font-medium outline-none ring-brand/20 focus:bg-white focus:ring-2"
        />
      </div>

      {searchHits.length > 0 ? (
        <div className="no-scrollbar max-h-[50vh] space-y-1.5 overflow-y-auto lg:max-h-72">
          {searchHits.map((hit) => (
            <button
              key={`${hit.region}-${hit.place}`}
              type="button"
              onClick={() => (hit.type === 'region' ? pickRegion(hit.region) : pickPlace(hit.region, hit.place))}
              className="flex h-11 w-full flex-col justify-center rounded-2xl bg-canvas px-4 text-left"
            >
              <span className="text-[13px] font-semibold">{hit.place || hit.region}</span>
              {hit.place ? <span className="text-[11px] text-muted">{hit.region}</span> : <span className="text-[11px] text-muted">Viloyat · tumanlarni ochish</span>}
            </button>
          ))}
        </div>
      ) : step === 'region' ? (
        <div className="no-scrollbar max-h-[50vh] space-y-1.5 overflow-y-auto lg:max-h-72">
          {REGIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => pickRegion(item.name)}
              className={cn(
                'flex h-11 w-full items-center justify-between rounded-2xl px-4 text-[13px] font-semibold transition',
                item.name === region ? 'bg-brand-soft text-brand' : 'bg-canvas text-ink',
              )}
            >
              {item.name}
              <ChevronRight className={cn('h-4 w-4', item.name === region ? 'text-brand' : 'text-slate-300')} />
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setStep('region')}
            className="mb-2 flex items-center gap-1 text-sm font-bold text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
            {picked}
          </button>
          <div className="no-scrollbar max-h-[46vh] space-y-1.5 overflow-y-auto lg:max-h-64">
            {districts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => pickPlace(picked, item)}
                className={cn(
                  'flex h-11 w-full items-center justify-between rounded-2xl px-4 text-[13px] font-semibold transition',
                  picked === region && item === place ? 'bg-brand-soft text-brand' : 'bg-canvas text-ink',
                )}
              >
                {item}
                {picked === region && item === place ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </PickerShell>
  )
}
