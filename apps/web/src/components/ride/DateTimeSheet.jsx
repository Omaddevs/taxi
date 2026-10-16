import { useState } from 'react'
import { User } from 'lucide-react'
import { dayLabel, dayOptions, firstFreeTime, isTimeBookable, slotEnd } from '../../lib/ride'
import { cn } from '../../lib/utils'
import { Sheet } from './Sheet'
import { SwipeButton } from './SwipeButton'
import { ROW, WheelPicker } from './WheelPicker'
import { t } from '../../i18n'

const pad = (n) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h))
const MINUTES = Array.from({ length: 60 }, (_, m) => pad(m))

// "Sanani tanlang": three wheels — day, hour, minute — in the iOS picker style; the row on the
// band in the middle is the choice. Any minute can be picked; today's minutes that have already
// passed stay on their wheel, greyed, but can't be chosen.
export function DateTimeSheet({ open, onClose, accent, date, time, party, onConfirm }) {
  const days = dayOptions()
  const [day, setDay] = useState(date)
  const [slot, setSlot] = useState(time)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const start = days.some((d) => d.iso === date) ? date : days[0].iso
      setDay(start)
      setSlot(isTimeBookable(start, time) ? time : firstFreeTime(start))
    }
  }

  const [hour, minute] = slot ? slot.split(':') : ['', '']
  const free = (h, m) => isTimeBookable(day, `${h}:${m}`)

  const dayItems = days.map((d) => ({ value: d.iso, label: d.label }))
  // An hour is out once its last minute has passed.
  const hourItems = HOURS.map((h) => ({ value: h, label: h, disabled: !free(h, '59') }))
  const minuteItems = MINUTES.map((m) => ({ value: m, label: m, disabled: !free(hour, m) }))

  // Keep the time when it still works on the new day / hour, else the nearest one that does.
  function pickDay(iso) {
    setDay(iso)
    setSlot((cur) => (isTimeBookable(iso, cur) ? cur : firstFreeTime(iso)))
  }
  function pickHour(h) {
    if (free(h, minute)) return setSlot(`${h}:${minute}`)
    // The current hour today: from the current minute.
    const m = MINUTES.find((x) => free(h, x))
    setSlot(m ? `${h}:${m}` : firstFreeTime(day))
  }
  function pickMinute(m) {
    if (free(hour, m)) setSlot(`${hour}:${m}`)
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
