import { useState } from 'react'
import { Check, User } from 'lucide-react'
import { SEAT_LABEL, WHOLE_CAR_SEATS, seatsSummary } from '../../lib/ride'
import { cn } from '../../lib/utils'
import { Sheet, SheetButton } from './Sheet'
import { t } from '../../i18n'

// Where each passenger seat sits inside the cabin (percent of the cabin box).
const SEAT_BOX = {
  FRONT: 'left-[54%] top-[8%] h-[38%] w-[38%]',
  REAR_LEFT: 'left-[5%] top-[54%] h-[38%] w-[28%]',
  REAR_MIDDLE: 'left-[36%] top-[54%] h-[38%] w-[28%]',
  REAR_RIGHT: 'left-[67%] top-[54%] h-[38%] w-[28%]',
}

const SEAT_TONE = {
  empty: 'bg-[#efe3c8] dark:bg-[#3a3426] text-[#b9a57c]',
  MALE: 'bg-seat-male text-white',
  FEMALE: 'bg-seat-female text-white',
}

function Seat({ position, gender, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t(SEAT_LABEL[position])}
      aria-pressed={Boolean(gender)}
      className={cn(
        'absolute flex items-center justify-center rounded-[14px] transition active:scale-95',
        SEAT_BOX[position],
        SEAT_TONE[gender || 'empty'],
        active && 'ring-[3px] ring-brand ring-offset-2 ring-offset-[#1f2b3a]',
      )}
    >
      {/* Seat cushion: a darker band along the front edge. */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[30%] rounded-b-[14px] bg-black/10" />
      {gender ? (
        <User className="relative h-5 w-5" strokeWidth={2.4} />
      ) : (
        <span aria-hidden className="relative h-5 w-5 rounded-full border-2 border-dashed border-current" />
      )}
      {gender ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink shadow">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  )
}

/** Top-down car: body, glass, lights, and the cabin with the driver's seat plus four seats to pick. */
function CarTopView({ seats, activePosition, onSeat }) {
  const genderAt = (position) => seats.find((s) => s.position === position)?.gender
  return (
    <div className="relative mx-auto h-[330px] w-[176px]">
      <span aria-hidden className="absolute inset-x-3 -bottom-2 h-6 rounded-full bg-black/15 blur-md" />
      {/* Mirrors */}
      <span aria-hidden className="absolute -left-1.5 top-[31%] h-4 w-3 rounded-l-full bg-slate-300" />
      <span aria-hidden className="absolute -right-1.5 top-[31%] h-4 w-3 rounded-r-full bg-slate-300" />
      <div className="absolute inset-0 overflow-hidden rounded-[76px_76px_56px_56px] border border-slate-300 bg-gradient-to-b from-white via-[#eef1f5] to-[#dfe4ea] shadow-[inset_0_2px_0_rgba(255,255,255,0.9)]">
        {/* Grille and headlights */}
        <span aria-hidden className="absolute left-1/2 top-[3%] h-1.5 w-10 -translate-x-1/2 rounded-full bg-slate-400/80" />
        <span aria-hidden className="absolute left-[9%] top-[7%] h-2 w-8 -rotate-[24deg] rounded-full bg-white shadow-[0_0_0_1px_rgba(148,163,184,0.5)]" />
        <span aria-hidden className="absolute right-[9%] top-[7%] h-2 w-8 rotate-[24deg] rounded-full bg-white shadow-[0_0_0_1px_rgba(148,163,184,0.5)]" />
        {/* Windshield and rear window */}
        <span aria-hidden className="absolute inset-x-[13%] top-[24%] h-[11%] bg-gradient-to-b from-[#3b4a5c] to-[#1f2b3a] [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]" />
        <span aria-hidden className="absolute inset-x-[13%] top-[79%] h-[8%] bg-[#1f2b3a] [clip-path:polygon(0_0,100%_0,90%_100%,10%_100%)]" />
        {/* Tail lights */}
        <span aria-hidden className="absolute bottom-[4%] left-[6%] h-2 w-9 rotate-[24deg] rounded-full bg-[#e11d48]" />
        <span aria-hidden className="absolute bottom-[4%] right-[6%] h-2 w-9 -rotate-[24deg] rounded-full bg-[#e11d48]" />
      </div>

      {/* Cabin */}
      <div className="absolute inset-x-[9%] top-[36%] h-[42%] rounded-[14px] bg-[#1f2b3a]">
        {/* Driver's seat (left-hand drive) with the wheel */}
        <span aria-hidden className="absolute left-[8%] top-[8%] h-[38%] w-[38%] rounded-[14px] bg-[#3b4656]">
          <span className="absolute inset-x-[18%] top-[14%] h-1.5 rounded-full bg-[#566273]" />
        </span>
        <span aria-hidden className="absolute left-[18%] top-[-9%] h-7 w-7 rounded-full border-[3px] border-slate-400 bg-[#1f2b3a]">
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400" />
        </span>
        <span aria-hidden className="absolute left-[48%] top-[14%] h-[26%] w-[4%] rounded-full bg-[#566273]" />
        {Object.keys(SEAT_BOX).map((position) => (
          <Seat
            key={position}
            position={position}
            gender={genderAt(position)}
            active={activePosition === position}
            onClick={() => onSeat(position)}
          />
        ))}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex items-center justify-center gap-5 text-[13px] font-semibold text-muted">
      {[
        ['bg-[#d8c7a3]', 'Bo‘sh'],
        ['bg-seat-male', 'Erkak'],
        ['bg-seat-female', 'Ayol'],
      ].map(([dot, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={cn('h-3 w-3 rounded', dot)} />
          {t(label)}
        </span>
      ))}
    </div>
  )
}

/**
 * "O‘rindiq tanlang": the party picks its seats on the car and says who sits on each.
 * `required` seats must be picked; with `wholeCar` nothing is required and marking seats is optional.
 * `womenOnly` ("Ayollar uchun Taxi") fixes every seat to a woman.
 */
export function SeatSheet({ open, onClose, accent, seats, required, wholeCar = false, womenOnly = false, onConfirm }) {
  const [draft, setDraft] = useState(seats)
  const [active, setActive] = useState(null)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(seats)
      setActive(seats.length === 1 ? seats[0].position : null)
    }
  }

  const limit = wholeCar ? WHOLE_CAR_SEATS : required
  const missing = wholeCar ? 0 : required - draft.length
  const defaultGender = womenOnly ? 'FEMALE' : draft[draft.length - 1]?.gender || 'MALE'
  const activeGender = draft.find((s) => s.position === active)?.gender

  function tapSeat(position) {
    if (draft.some((s) => s.position === position)) {
      setActive(position)
      return
    }
    // A full party taps another seat: one passenger moves there, more than one must free a seat first.
    if (draft.length >= limit) {
      if (limit !== 1) return
      setDraft([{ position, gender: draft[0].gender }])
    } else {
      setDraft([...draft, { position, gender: defaultGender }])
    }
    setActive(position)
  }

  function setGender(gender) {
    setDraft(draft.map((s) => (s.position === active ? { ...s, gender } : s)))
  }

  function clearActive() {
    setDraft(draft.filter((s) => s.position !== active))
    setActive(null)
  }

  const ready = missing === 0
  const summary = seatsSummary(draft)
  const buttonLabel = !ready
    ? t('Yana {0} ta joy tanlang', missing)
    : wholeCar
      ? summary
        ? t('Tayyor · Butun mashina, {0}', summary)
        : t('Tayyor · Butun mashina')
      : t('Tayyor · {0}', summary)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('O‘rindiq tanlang')}
      footer={
        <SheetButton accent={accent} disabled={!ready} onClick={() => onConfirm(draft)}>
          {buttonLabel}
        </SheetButton>
      }
    >
      <p className="mb-3 text-[14px] text-muted">
        {wholeCar
          ? t('Butun mashina sizniki. Xohlasangiz, kim qayerga o‘tirishini belgilang.')
          : t('{0} ta joy tanlang va har biriga kim o‘tirishini belgilang.', required)}
      </p>

      <div className="rounded-[24px] bg-canvas px-4 pb-4 pt-6">
        <CarTopView seats={draft} activePosition={active} onSeat={tapSeat} />
        <Legend />
      </div>

      {active && activeGender ? (
        <div className="mt-3 rounded-[20px] border border-line p-3.5">
          <p className="mb-2.5 text-[14px] font-extrabold text-ink">{t('{0} — kim o‘tiradi?', t(SEAT_LABEL[active]))}</p>
          <div className="grid grid-cols-3 gap-2">
            {womenOnly ? null : (
              <button
                type="button"
                onClick={() => setGender('MALE')}
                aria-pressed={activeGender === 'MALE'}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-2xl border-2 text-[15px] font-bold text-seat-male',
                  activeGender === 'MALE' ? 'border-seat-male bg-seat-male-soft' : 'border-transparent bg-seat-male-soft/60',
                )}
              >
                <span className="h-3 w-3 rounded-full bg-seat-male" /> {t('Erkak')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setGender('FEMALE')}
              aria-pressed={activeGender === 'FEMALE'}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-2xl border-2 text-[15px] font-bold text-seat-female',
                activeGender === 'FEMALE' ? 'border-seat-female bg-seat-female-soft' : 'border-transparent bg-seat-female-soft/60',
                womenOnly && 'col-span-2',
              )}
            >
              <span className="h-3 w-3 rounded-full bg-seat-female" /> {t('Ayol')}
            </button>
            <button type="button" onClick={clearActive} className="h-12 rounded-2xl bg-canvas text-[15px] font-bold text-muted">
              {t('Bo‘sh qilish')}
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  )
}
