import { useState } from 'react'
import { User } from 'lucide-react'
import { dayLabel, dayOptions, isSlotBookable, slotEnd, timeSlots } from '../../lib/ride'
import { cn } from '../../lib/utils'
import { Sheet } from './Sheet'
import { SwipeButton } from './SwipeButton'
import { ROW, WheelPicker } from './WheelPicker'
import { t } from '../../i18n'

const pad = (n) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h))
const MINUTES = ['00', '30']
const firstFree = (iso) => timeSlots(iso).find((s) => !s.past)?.time ?? ''

// "Sanani tanlang": three wheels — day, hour, minute — in the iOS picker style; the row on the
// band in the middle is the choice. Departures go in half-hour slots, and a slot that has
// already passed stays on its wheel, greyed, but can't be chosen.
export function DateTimeSheet({ open, onClose, accent, date, time, party, onConfirm }) {
  const days = dayOptions()
  const [day, setDay] = useState(date)
  const [slot, setSlot] = useState(time)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      // The given day if it still has a free slot, else the first one that does (late at night
      // today has none left).
      const start = [date, ...days.map((d) => d.iso)].find((iso) => days.some((d) => d.iso === iso) && firstFree(iso))
      setDay(start)
      setSlot(isSlotBookable(start, time) ? time : firstFree(start))
    }
  }

  const slots = timeSlots(day)
  const past = new Set(slots.filter((s) => s.past).map((s) => s.time))
  const [hour, minute] = slot ? slot.split(':') : ['', '']

  const dayItems = days.map((d) => ({ value: d.iso, label: d.label, disabled: !firstFree(d.iso) }))
  const hourItems = HOURS.map((h) => ({ value: h, label: h, disabled: MINUTES.every((m) => past.has(`${h}:${m}`)) }))
  const minuteItems = MINUTES.map((m) => ({ value: m, label: m, disabled: past.has(`${hour}:${m}`) }))

  // Keep the time when it still works on the new day / hour, else the nearest one that does.
  function pickDay(iso) {
    setDay(iso)
    setSlot((cur) => (isSlotBookable(iso, cur) ? cur : firstFree(iso)))
  }
  function pickHour(h) {
    const options = [`${h}:${minute}`, ...MINUTES.map((m) => `${h}:${m}`)]
    setSlot(options.find((s) => isSlotBookable(day, s)) ?? firstFree(day))
  }
  function pickMinute(m) {
    if (isSlotBookable(day, `${hour}:${m}`)) setSlot(`${hour}:${m}`)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Sanani tanlang')}
      footer={
        <SwipeButton
          accent={accent}
          disabled={!slot}
          caption={slot ? `${dayLabel(day)} · ${slot}` : t('Vaqtni tanlang')}
          title={t('Davom etish')}
          onConfirm={() => onConfirm({ date: day, time: slot })}
        />
      }
    >
      <div className="relative -mx-2 flex items-stretch">
        {/* The band: whatever rests on it is the choice. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 rounded-2xl bg-canvas" style={{ top: ROW * 2, height: ROW }} />
        <WheelPicker label={t('Kun')} items={dayItems} value={day} onChange={pickDay} align="right" className="relative min-w-0 flex-[1.7] pr-3" />
        <WheelPicker label={t('Soat')} items={hourItems} value={hour} onChange={pickHour} className="relative w-[68px] shrink-0" />
        <span aria-hidden="true" className="relative flex w-3 shrink-0 items-center justify-center text-[21px] font-extrabold text-ink">:</span>
        <WheelPicker label={t('Daqiqa')} items={minuteItems} value={minute} onChange={pickMinute} className="relative w-[68px] shrink-0" />
        <span aria-hidden="true" className="flex-[0.5]" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="text-[19px] font-extrabold leading-tight text-ink">
            {slot ? `${slot} - ${slotEnd(slot)}` : t('Vaqtni tanlang')}
          </p>
          <p className="text-[13px] text-muted">{t('Jo‘nab ketish')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="text-right">
            <p className="text-[17px] font-extrabold leading-tight text-ink">{party}</p>
            <p className="text-[13px] text-muted">{t('Band qilish')}</p>
          </div>
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accent.solid)}>
            <User className="h-5 w-5" />
          </span>
        </div>
      </div>
    </Sheet>
  )
}
