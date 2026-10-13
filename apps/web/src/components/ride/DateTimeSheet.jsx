import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, User } from 'lucide-react'
import { dayLabel, dayOptions, isSlotBookable, slotEnd, timeSlots } from '../../lib/ride'
import { cn } from '../../lib/utils'
import { Sheet } from './Sheet'
import { t } from '../../i18n'

// "Sanani tanlang": a row of days and the day's half-hour slots as a bar strip. Slots that have
// already passed stay visible (short, grey) so the strip reads as a timeline.
export function DateTimeSheet({ open, onClose, accent, date, time, party, onConfirm }) {
  const days = dayOptions()
  const [day, setDay] = useState(date)
  const [slot, setSlot] = useState(time)
  const [wasOpen, setWasOpen] = useState(false)
  const stripRef = useRef(null)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const start = days.some((d) => d.iso === date) ? date : days[0].iso
      setDay(start)
      setSlot(isSlotBookable(start, time) ? time : '')
    }
  }

  const slots = timeSlots(day)

  // Bring the chosen slot — or the first one still bookable — into view.
  useEffect(() => {
    if (!open) return
    const strip = stripRef.current
    const target = strip?.querySelector('[data-focus="true"]')
    if (strip && target) strip.scrollLeft = Math.max(0, target.offsetLeft - 96)
    // Runs when the sheet opens or the day changes, not on every slot tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day])

  const firstFree = slots.find((s) => !s.past)?.time
  const focusTime = slot || firstFree

  function pickDay(iso) {
    setDay(iso)
    setSlot((cur) => (isSlotBookable(iso, cur) ? cur : ''))
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Sanani tanlang')}
      footer={
        <button
          type="button"
          disabled={!slot}
          onClick={() => onConfirm({ date: day, time: slot })}
          className={cn(
            'flex h-[72px] w-full items-center gap-3 rounded-full p-1.5 pr-5 text-left transition',
            slot ? cn(accent.soft, accent.glow) : 'bg-canvas',
          )}
        >
          <span
            className={cn(
              'flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full',
              slot ? accent.solid : 'bg-slate-200 text-white',
            )}
          >
            <ArrowRight className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1 text-center">
            <span className={cn('block text-[13px] font-semibold', slot ? accent.softText : 'text-slate-400')}>
              {slot ? `${dayLabel(day)} · ${slot}` : t('Vaqtni tanlang')}
            </span>
            <span className={cn('block text-[19px] font-extrabold leading-tight', slot ? accent.softText : 'text-slate-400')}>
              {t('Davom etish')}
            </span>
          </span>
          <Check className={cn('h-6 w-6 shrink-0', slot ? accent.softText : 'text-slate-300')} strokeWidth={2.4} />
        </button>
      }
    >
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {days.map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => pickDay(d.iso)}
            aria-pressed={d.iso === day}
            className={cn(
              'h-11 shrink-0 rounded-2xl border-2 px-5 text-[14px] font-bold transition',
              d.iso === day ? cn('bg-white text-ink', accent.border) : 'border-transparent bg-canvas text-ink/80',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div
        ref={stripRef}
        className="no-scrollbar -mx-5 mt-4 flex h-[236px] items-end gap-2.5 overflow-x-auto px-5 lg:h-[200px]"
        role="listbox"
        aria-label={t('Vaqtni tanlang')}
      >
        {slots.map((s) => {
          const active = s.time === slot
          return (
            <button
              key={s.time}
              type="button"
              role="option"
              aria-selected={active}
              disabled={s.past}
              data-focus={s.time === focusTime}
              onClick={() => setSlot(s.time)}
              className="flex w-[68px] shrink-0 flex-col items-center gap-2.5"
            >
              <span
                className={cn(
                  'w-full rounded-[16px] transition-all duration-200',
                  s.past
                    ? 'h-[64px] bg-slate-200'
                    : active
                      ? cn('h-[188px] lg:h-[152px]', accent.solid, accent.glow)
                      : 'h-[104px] bg-[#eef6f7] hover:bg-brand-soft lg:h-[88px]',
                )}
              />
              <span
                className={cn(
                  'text-[14px] tabular-nums',
                  s.past ? 'text-slate-300' : active ? 'font-extrabold text-ink' : 'font-medium text-ink/80',
                )}
              >
                {s.time}
              </span>
            </button>
          )
        })}
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
