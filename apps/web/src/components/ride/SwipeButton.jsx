import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronsRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { t } from '../../i18n'

// Slide to confirm: the round knob is dragged to the far end of the pill — a tap alone doesn't
// confirm, it nudges the knob to show which way to slide. A colour trail fills behind the knob and
// the label fades as it goes. Let go before the end and it springs back. Enter / Space confirm too,
// so it works from the keyboard.
const PAD = 6 // the pill's inner padding (p-1.5)
const KNOB = 60
const DONE_AT = 0.85

export function SwipeButton({ accent, disabled = false, caption, title, onConfirm }) {
  const track = useRef(null)
  const drag = useRef(null) // { startX, max }
  const [x, setX] = useState(0)
  const [max, setMax] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState(false)
  const [nudge, setNudge] = useState(false)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const span = () => Math.max(1, (track.current?.clientWidth ?? 0) - KNOB - PAD * 2)

  function confirm() {
    if (disabled || done) return
    const m = span()
    setMax(m)
    setX(m)
    setDone(true)
    later(() => onConfirm(), 220)
    // If the sheet stays open (the parent keeps it), be ready again.
    later(() => {
      setDone(false)
      setX(0)
    }, 1400)
  }

  function onPointerDown(e) {
    if (disabled || done) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const m = span()
    setMax(m)
    drag.current = { startX: e.clientX - x, max: m, moved: false }
    setDragging(true)
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    const next = Math.max(0, Math.min(d.max, e.clientX - d.startX))
    if (next > 4) d.moved = true
    setX(next)
  }

  function onPointerUp() {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    if (x / d.max >= DONE_AT) return confirm()
    setX(0)
    if (!d.moved) {
      // A tap: show which way to slide.
      setNudge(true)
      later(() => setNudge(false), 420)
    }
  }

  const progress = done ? 1 : x / max

  return (
    <div
      ref={track}
      className={cn(
        'relative flex h-[72px] w-full select-none items-center overflow-hidden rounded-full p-1.5 transition-colors',
        disabled ? 'bg-canvas' : cn(accent.soft, accent.glow),
      )}
    >
      {/* Trail behind the knob. */}
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-1.5 left-1.5 rounded-full opacity-25', accent.solid, dragging ? '' : 'transition-[width] duration-300 ease-out')}
        style={{ width: KNOB + (done ? max : x) }}
      />

      <span
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[84px] text-center"
        style={{ opacity: Math.max(0, 1 - progress * 1.6) }}
      >
        <span className={cn('block max-w-full truncate text-[13px] font-semibold', disabled ? 'text-slate-400' : accent.softText)}>{caption}</span>
        <span className={cn('block text-[19px] font-extrabold leading-tight', disabled ? 'text-slate-400' : accent.softText)}>{title}</span>
      </span>

      <span aria-hidden="true" className="pointer-events-none absolute right-5 flex items-center">
        {done ? (
          <Check className={cn('h-6 w-6', disabled ? 'text-slate-300' : accent.softText)} strokeWidth={2.4} />
        ) : (
          <ChevronsRight className={cn('h-6 w-6', disabled ? 'text-slate-300' : cn(accent.softText, 'motion-safe:animate-pulse'))} strokeWidth={2.4} />
        )}
      </span>

      <button
        type="button"
        disabled={disabled}
        aria-label={`${title}: ${t('surib tasdiqlang')}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            confirm()
          }
        }}
        className={cn(
          'relative z-10 flex h-[60px] w-[60px] shrink-0 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70',
          disabled ? 'cursor-not-allowed bg-slate-200 text-white' : cn('cursor-grab active:cursor-grabbing', accent.solid),
          dragging ? '' : 'transition-transform duration-300 ease-out',
        )}
        style={{ transform: `translateX(${done ? max : nudge ? 28 : x}px)` }}
      >
        {done ? <Check className="h-6 w-6" strokeWidth={2.6} /> : <ArrowRight className="h-6 w-6" strokeWidth={2.4} />}
      </button>
    </div>
  )
}
