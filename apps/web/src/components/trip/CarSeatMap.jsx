import { useState } from 'react'
import { Check, CarFront } from 'lucide-react'
import { cn } from '../../lib/utils'

const POSITIONS = ['FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT']

const POSITION_LABEL = {
  FRONT: 'Old o‘rindiq',
  REAR_LEFT: 'Orqa chap',
  REAR_MIDDLE: 'Orqa o‘rta',
  REAR_RIGHT: 'Orqa o‘ng',
}

function seatTone(status, gender) {
  if (status === 'AVAILABLE') return 'available'
  if (gender === 'MALE') return 'male'
  if (gender === 'FEMALE') return 'female'
  return 'taken'
}

const TONE_CLASS = {
  available: 'border-2 border-dashed border-success/60 bg-success/10 text-success',
  male: 'border-2 border-seat-male bg-seat-male text-white',
  female: 'border-2 border-seat-female bg-seat-female text-white',
  taken: 'border-2 border-slate-300 bg-slate-200 text-slate-500',
}

function SeatButton({ position, status, gender, selectable, selected, disabled, onClick }) {
  const tone = seatTone(status, gender)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-bold transition-transform',
        TONE_CLASS[tone],
        selectable && !disabled ? 'active:scale-95' : '',
        disabled && status === 'AVAILABLE' ? 'opacity-70' : '',
      )}
      aria-label={POSITION_LABEL[position]}
    >
      {selected ? (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink shadow ring-1 ring-black/5">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 13V8.5A2.5 2.5 0 0 1 8.5 6h3A2.5 2.5 0 0 1 14 8.5V13" />
        <path d="M5 13h14v2.5a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 15.5V13z" fill="currentColor" stroke="none" />
      </svg>
      <span className="leading-none">{POSITION_LABEL[position].split(' ').slice(-1)[0]}</span>
    </button>
  )
}

// Small popover anchored to the tapped seat — "Erkak" (blue) / "Ayol" (pink), plus a clear
// option when the seat already carries a pick. Opens upward so it never collides with the row
// of seats below it.
function SeatGenderPopup({ onPickMale, onPickFemale, onClear, showClear }) {
  return (
    <div
      className="absolute bottom-full left-1/2 z-50 mb-2.5 w-[148px] -translate-x-1/2 rounded-2xl bg-white p-1.5 text-left shadow-xl ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onPickMale}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-bold hover:bg-seat-male-soft"
      >
        <span className="h-3 w-3 shrink-0 rounded-full bg-seat-male" /> Erkak
      </button>
      <button
        type="button"
        onClick={onPickFemale}
        className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-bold hover:bg-seat-female-soft"
      >
        <span className="h-3 w-3 shrink-0 rounded-full bg-seat-female" /> Ayol
      </button>
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-bold text-muted hover:bg-canvas"
        >
          <span className="h-3 w-3 shrink-0 rounded-full border border-slate-300" /> Bo‘sh qilish
        </button>
      ) : null}
      <span className="absolute left-1/2 top-full -mt-[5px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white" />
    </div>
  )
}

/**
 * Top-down 4-seat car layout (front + rear-left/middle/right), reused for both the
 * passenger's booking picker (`mode="book"`) and the driver's listing editor (`mode="manage"`).
 *
 * `seats`: [{ id, position, status: 'AVAILABLE'|'RESERVED'|'BOOKED', gender: 'MALE'|'FEMALE'|null }]
 *
 * Tapping an eligible seat opens a small popup right at that seat with "Erkak"/"Ayol" (and a
 * clear option once it already carries a pick) — the same interaction in both modes:
 *
 * book mode: `selected` = [{ offerSeatId, gender }] the parent owns; `onChange(nextSelected)`
 * is called with the full next array on every pick/clear, or "select whole car".
 *
 * manage mode: `onChange(nextSeats)` is called with the full 4-entry seats array after picking
 * a gender (→ BOOKED) or clearing (→ AVAILABLE) for one position.
 */
export function CarSeatMap({
  mode = 'book',
  seats = [],
  selected = [],
  defaultGender = 'MALE',
  onChange,
  className,
  readOnly = false,
}) {
  const [activePosition, setActivePosition] = useState(null)
  const byPosition = new Map(seats.map((s) => [s.position, s]))
  const selectedById = new Map(selected.map((s) => [s.offerSeatId, s]))

  function seatIsEligible(seat) {
    if (readOnly) return false
    if (mode === 'manage') return true
    return seat.status === 'AVAILABLE'
  }

  function toggleActive(seat) {
    if (!seatIsEligible(seat)) return
    setActivePosition((cur) => (cur === seat.position ? null : seat.position))
  }

  function pickBook(seat, gender) {
    const exists = selectedById.has(seat.id)
    onChange(
      exists
        ? selected.map((s) => (s.offerSeatId === seat.id ? { ...s, gender } : s))
        : [...selected, { offerSeatId: seat.id, gender }],
    )
    setActivePosition(null)
  }

  function clearBook(seat) {
    onChange(selected.filter((s) => s.offerSeatId !== seat.id))
    setActivePosition(null)
  }

  function pickManage(seat, gender) {
    onChange(seats.map((s) => (s.position === seat.position ? { ...s, status: 'BOOKED', gender } : s)))
    setActivePosition(null)
  }

  function clearManage(seat) {
    onChange(seats.map((s) => (s.position === seat.position ? { ...s, status: 'AVAILABLE', gender: null } : s)))
    setActivePosition(null)
  }

  function selectWholeCar() {
    const additions = seats
      .filter((s) => s.status === 'AVAILABLE' && !selectedById.has(s.id))
      .map((s) => ({ offerSeatId: s.id, gender: defaultGender }))
    if (additions.length === 0) return
    onChange([...selected, ...additions])
  }

  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length

  function renderSeat(pos) {
    const seat = byPosition.get(pos)
    if (!seat) return null
    const isSelected = selectedById.has(seat.id)
    const gender = isSelected ? selectedById.get(seat.id).gender : seat.gender
    const open = activePosition === pos
    const showClear = mode === 'book' ? isSelected : seat.status !== 'AVAILABLE'
    // In book mode the seat's own status stays AVAILABLE until the booking is created —
    // the pick only lives in `selected` — so once picked we treat it as taken here so
    // the seat tone reflects the chosen gender instead of staying "available" green.
    const displayStatus = mode === 'book' && isSelected ? 'RESERVED' : seat.status

    return (
      <div key={pos} className="relative">
        <SeatButton
          position={seat.position}
          status={displayStatus}
          gender={gender}
          selectable
          selected={mode === 'book' && !readOnly && isSelected}
          disabled={!seatIsEligible(seat)}
          onClick={() => toggleActive(seat)}
        />
        {open ? (
          <SeatGenderPopup
            onPickMale={() => (mode === 'book' ? pickBook(seat, 'MALE') : pickManage(seat, 'MALE'))}
            onPickFemale={() => (mode === 'book' ? pickBook(seat, 'FEMALE') : pickManage(seat, 'FEMALE'))}
            onClear={() => (mode === 'book' ? clearBook(seat) : clearManage(seat))}
            showClear={showClear}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl bg-canvas p-4', className)}>
      {activePosition ? (
        <button
          type="button"
          className="fixed inset-0 z-30"
          aria-label="Yopish"
          onClick={() => setActivePosition(null)}
        />
      ) : null}
      {/* Above the backdrop (z-30) so tapping a different seat switches the popup instead of
          the backdrop swallowing the click and just closing it. */}
      <div className="relative z-40 mx-auto w-fit rounded-[28px] border border-line bg-white p-4 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
        <div className="mb-3 flex justify-center gap-3">
          <span className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl bg-slate-100 text-[10px] font-bold text-slate-400">
            <CarFront className="h-5 w-5" />
            Haydovchi
          </span>
          {POSITIONS.slice(0, 1).map(renderSeat)}
        </div>
        <div className="flex justify-center gap-3">{POSITIONS.slice(1).map(renderSeat)}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
        <Legend tone="available" label="Bo‘sh" />
        <Legend tone="male" label="Band (erkak)" />
        <Legend tone="female" label="Band (ayol)" />
      </div>

      {mode === 'book' && !readOnly ? (
        <button
          type="button"
          disabled={availableCount === 0}
          onClick={selectWholeCar}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl border border-brand text-sm font-extrabold text-brand disabled:opacity-40"
        >
          Butun mashinani band qilish
        </button>
      ) : null}
    </div>
  )
}

const LEGEND_DOT_CLASS = {
  available: 'bg-success',
  male: 'bg-seat-male',
  female: 'bg-seat-female',
}

function Legend({ tone, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full', LEGEND_DOT_CLASS[tone])} />
      {label}
    </span>
  )
}
