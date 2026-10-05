import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  LoaderCircle,
  MapPin,
  Minus,
  Navigation,
  PersonStanding,
  Plus,
  X,
} from 'lucide-react'
import { MONTHS, cn, formatDateShortUz } from '../../lib/utils'
import {
  ACTIVE_REGION_IDS,
  REGIONS_BY_AVAILABILITY,
  formatPlace,
  getRegion,
  isRegionActive,
  matchRegion,
  searchUzPlaces,
} from '../../data/uzbekistan'
import { useApp } from '../../context/AppContext'
import { extractCity, formatAddress, reverseGeocode } from '../../lib/geocode'

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

function BottomSheet({ open, title, onClose, children, bare = false }) {
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
    <div className="fixed inset-0 z-[120]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={onClose} />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[85vh] touch-pan-y overflow-y-auto overscroll-contain rounded-t-2xl px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.18)] [-webkit-overflow-scrolling:touch]',
          bare ? 'bg-[#eef3f6]' : 'bg-white',
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
        {bare ? null : (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-ink">{title}</h3>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
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

// `forceSheet` skips the desktop absolute-popover branch entirely and always uses the
// (portal-based, viewport-contained) BottomSheet — for callers whose trigger lives in a
// layout that's narrow/mobile-styled regardless of the actual browser window width (e.g. the
// driver app's shell), where the popover's `left-0`/`right-0` anchoring against the trigger
// can overflow past the visible card even though `useDesktop()` says "desktop".
function PickerShell({
  open,
  onClose,
  title,
  align = 'left',
  trigger,
  children,
  panelClass,
  forceSheet = false,
  bare = false,
}) {
  const ref = useRef(null)
  const desktop = useDesktop() && !forceSheet

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
      <BottomSheet open={open && !desktop} title={title} onClose={onClose} bare={bare}>
        {children}
      </BottomSheet>
    </div>
  )
}

export function DatePicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card', forceSheet = false }) {
  const selected = parseIso(value)
  const [view, setView] = useState({ year: selected.year, month: selected.month })
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setView({ year: selected.year, month: selected.month })
  }

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
      forceSheet={forceSheet}
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

// Sequential 24-hour picker: pick an hour (0–23, no AM/PM), it auto-advances to the minute
// grid (00–59); picking a minute confirms and closes. A back-link on the minute step lets the
// user revisit the hour without re-opening the picker.
export function TimePicker({ value, onChange, open, onToggle, onClose, triggerVariant = 'card', forceSheet = false }) {
  const { h, m } = splitTime(value)
  const [step, setStep] = useState('hour')
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setStep('hour')
  }

  function pickHour(hour) {
    onChange(`${hour}:${m}`)
    setStep('minute')
  }

  function pickMinute(min) {
    onChange(`${h}:${min}`)
    onClose()
  }

  function pickPreset(next) {
    onChange(next)
    onClose()
  }

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title="Vaqtni tanlang"
      forceSheet={forceSheet}
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
              if (label === 'Hozir') pickPreset(nowTime())
              else {
                const add = label.startsWith('+15') ? 15 : 30
                const d = new Date()
                d.setMinutes(d.getMinutes() + add)
                pickPreset(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
              }
            }}
            className="flex-1 rounded-xl bg-canvas py-2 text-xs font-bold text-ink hover:bg-brand-soft hover:text-brand"
          >
            {label}
          </button>
        ))}
      </div>

      {step === 'hour' ? (
        <>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
            Soatni tanlang (24 soatlik, 0–23)
          </p>
          <div className="no-scrollbar grid h-48 touch-pan-y grid-cols-6 content-start gap-1.5 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
            {HOURS.map((hour) => (
              <button
                key={`h-${hour}`}
                type="button"
                aria-label={`${hour} soat`}
                onClick={() => pickHour(hour)}
                className={cn(
                  'h-10 rounded-xl text-sm font-bold',
                  hour === h ? 'bg-brand text-white shadow-sm shadow-brand/30' : 'bg-canvas text-ink hover:bg-brand-soft',
                )}
              >
                {hour}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setStep('hour')} className="flex items-center gap-0.5 text-xs font-bold text-brand">
              <ChevronLeft className="h-3.5 w-3.5" /> Soat: {h}
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Daqiqani tanlang</p>
          </div>
          <div className="no-scrollbar grid h-48 touch-pan-y grid-cols-6 content-start gap-1.5 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
            {MINUTES.map((min) => (
              <button
                key={`m-${min}`}
                type="button"
                aria-label={`${min} daqiqa`}
                onClick={() => pickMinute(min)}
                className={cn(
                  'h-10 rounded-xl text-sm font-bold',
                  min === m ? 'bg-brand text-white shadow-sm shadow-brand/30' : 'bg-canvas text-ink hover:bg-brand-soft',
                )}
              >
                {min}
              </button>
            ))}
          </div>
        </>
      )}
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

export const CARS = [
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

function PlaceRow({ title, subtitle, soon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soon}
      className="group flex w-full items-center gap-3 pl-4 text-left transition enabled:active:bg-canvas disabled:cursor-not-allowed"
    >
      <MapPin className={cn('h-5 w-5 shrink-0', selected ? 'text-brand' : 'text-slate-400')} />
      <span className="flex min-w-0 flex-1 items-center gap-2 border-b border-line py-3.5 pr-4 group-last:border-b-0">
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[15px] font-medium',
              soon ? 'text-slate-400' : 'text-ink',
              selected && 'font-bold text-brand',
            )}
          >
            {title}
          </span>
          {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
        </span>
        {soon ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
            Tez orada
          </span>
        ) : selected ? (
          <Check className="h-4 w-4 shrink-0 text-brand" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        )}
      </span>
    </button>
  )
}

// `kind` "from" shows the GPS shortcut; "to" can show the already-picked origin above the input
// (pass `origin` + `onEditOrigin`). `variant="headless"` renders no trigger — the parent drives `open`.
export function RegionPicker({
  label,
  region,
  place,
  onChange,
  open,
  onToggle,
  onClose,
  variant = 'stacked',
  icon: RowIcon,
  forceSheet = false,
  kind,
  origin,
  onEditOrigin,
}) {
  const { openLocationPicker } = useApp()
  const side = kind || (origin || label === 'Qayerga' ? 'to' : 'from')
  const [step, setStep] = useState('region')
  const [picked, setPicked] = useState(region)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [locating, setLocating] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      // Faol viloyatning tumani tanlangan bo‘lsa — darhol shu viloyat tumanlarini ochamiz.
      setStep(region && place && isRegionActive(region) ? 'district' : 'region')
      setPicked(region)
      setQuery('')
      setNotice('')
    }
  }

  const districts = getRegion(picked)?.districts || []
  const q = query.trim().toLowerCase()
  const searchHits = !q
    ? []
    : step === 'district'
      ? districts
          .filter((d) => d.toLowerCase().includes(q))
          .map((d) => ({ type: 'district', region: picked, place: d, active: true }))
      : searchUzPlaces(query)
  const display = formatPlace(region, place) || 'Tanlang'

  function pickRegion(name) {
    setPicked(name)
    setQuery('')
    setStep('district')
  }

  function pickPlace(nextRegion, nextPlace, coords) {
    // Close first so a parent that chains to the next picker inside onChange wins the open state.
    onClose()
    onChange({ region: nextRegion, place: nextPlace, label: formatPlace(nextRegion, nextPlace), ...coords })
  }

  function pickGeocoded(loc) {
    const name = matchRegion(loc.state, loc.city, loc.label)
    if (!name) {
      setNotice('Bu manzil hududini aniqlab bo‘lmadi. Ro‘yxatdan tanlang.')
      return
    }
    if (!isRegionActive(name)) {
      setNotice(`${name} — tez orada ishga tushadi. Hozircha Toshkent, Andijon va Samarqand.`)
      return
    }
    pickPlace(name, loc.label, { lat: loc.lat, lng: loc.lng })
  }

  function openMap() {
    setNotice('')
    openLocationPicker({ title: side === 'to' ? 'Qayerga' : 'Qayerdan', onPick: pickGeocoded })
  }

  function pickCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice('Brauzer geolokatsiyani qo‘llab-quvvatlamaydi.')
      return
    }
    setNotice('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await reverseGeocode(coords.latitude, coords.longitude)
          pickGeocoded({
            label: formatAddress(data),
            city: extractCity(data),
            state: data?.address?.state,
            lat: coords.latitude,
            lng: coords.longitude,
          })
        } catch {
          setNotice('Manzil aniqlanmadi. Xaritadan tanlang.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setNotice('Joylashuvga ruxsat berilmadi. Ro‘yxat yoki xaritadan tanlang.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const InputIcon = side === 'to' ? Flag : PersonStanding
  const placeholder =
    step === 'district' ? `${picked}: tuman qidiring` : side === 'to' ? 'Qayerga?' : 'Viloyat yoki manzil'

  let trigger = null
  if (variant === 'row') {
    trigger = (
      <button type="button" onClick={onToggle} className="flex h-[68px] w-full items-center gap-3 px-3.5 text-left">
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
    )
  } else if (variant === 'stacked') {
    trigger = (
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

  return (
    <PickerShell
      open={open}
      onClose={onClose}
      title={label}
      forceSheet={forceSheet}
      bare
      panelClass="w-[min(380px,calc(100vw-2rem))] bg-[#eef3f6]!"
      trigger={trigger}
    >
      <div className="space-y-3 text-ink">
        <div className="rounded-2xl bg-white shadow-[0_6px_20px_rgba(28,28,40,0.06)]">
          {side === 'to' && origin?.region ? (
            <div className="flex items-start gap-3 border-b border-line py-3 pl-4 pr-2">
              <PersonStanding className="mt-1.5 h-5 w-5 shrink-0" />
              <button type="button" onClick={onEditOrigin} className="min-w-0 flex-1 text-left">
                <span className="inline-flex max-w-full rounded-full bg-canvas px-3 py-1 text-[13px] font-semibold">
                  <span className="truncate">{origin.region}</span>
                </span>
                <span className="mt-1.5 block truncate text-[15px]">{origin.place || origin.region}</span>
              </button>
              {onEditOrigin ? (
                <button
                  type="button"
                  onClick={onEditOrigin}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  aria-label="Qayerdan manzilini o‘zgartirish"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-3 py-2 pl-4 pr-2">
            <InputIcon className="h-5 w-5 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-11 min-w-0 flex-1 bg-transparent text-[16px] caret-brand outline-none placeholder:text-slate-400"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} className="p-1 text-muted" aria-label="Tozalash">
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button type="button" onClick={openMap} className="h-10 shrink-0 rounded-full bg-canvas px-4 text-sm font-bold">
              Xarita
            </button>
          </div>

          {side === 'from' && !q && step === 'region' ? (
            <button
              type="button"
              onClick={pickCurrentLocation}
              disabled={locating}
              className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left"
            >
              {locating ? (
                <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-brand" />
              ) : (
                <Navigation className="h-5 w-5 shrink-0 fill-sky-500 text-sky-500" />
              )}
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">Joriy joylashuv</span>
                <span className="block text-xs text-muted">{locating ? 'Aniqlanmoqda…' : 'GPS orqali aniqlanadi'}</span>
              </span>
            </button>
          ) : null}
        </div>

        {notice ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{notice}</p> : null}

        <div className="no-scrollbar max-h-[50vh] touch-pan-y overflow-y-auto overscroll-contain rounded-2xl bg-white lg:max-h-80 [-webkit-overflow-scrolling:touch]">
          {step === 'district' && !q ? (
            <div className="flex items-center gap-2 border-b border-line px-2 py-2">
              <button
                type="button"
                onClick={() => setStep('region')}
                className="flex h-9 items-center gap-1 rounded-full px-2 text-sm font-bold text-brand"
              >
                <ChevronLeft className="h-4 w-4" />
                Viloyatlar
              </button>
              <span className="min-w-0 flex-1 truncate pr-2 text-right text-sm font-bold">{picked}</span>
            </div>
          ) : null}

          {q ? (
            searchHits.length ? (
              searchHits.map((hit) => (
                <PlaceRow
                  key={`${hit.region}-${hit.place}`}
                  title={hit.place || hit.region}
                  subtitle={hit.place ? hit.region : 'Viloyat · tumanlarni ochish'}
                  soon={!hit.active}
                  selected={hit.region === region && hit.place === place}
                  onClick={() => (hit.type === 'region' ? pickRegion(hit.region) : pickPlace(hit.region, hit.place))}
                />
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">Hech narsa topilmadi — “Xarita” orqali belgilang.</p>
            )
          ) : step === 'region' ? (
            REGIONS_BY_AVAILABILITY.map((item) => (
              <PlaceRow
                key={item.id}
                title={item.name}
                soon={!ACTIVE_REGION_IDS.has(item.id)}
                selected={item.name === region}
                onClick={() => pickRegion(item.name)}
              />
            ))
          ) : (
            districts.map((item) => (
              <PlaceRow
                key={item}
                title={item}
                selected={picked === region && item === place}
                onClick={() => pickPlace(picked, item)}
              />
            ))
          )}
        </div>
      </div>
    </PickerShell>
  )
}
