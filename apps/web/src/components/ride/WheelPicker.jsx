import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

// One column of an iOS-style picker: the list scrolls and snaps, and whatever stops on the band
// in the middle is the value. Rows tilt away and fade the further they are from the band. Disabled
// rows stay visible (greyed) but the wheel never settles on one — it rolls on to the nearest free row.
export const ROW = 44
const VISIBLE = 5 // rows in view; the middle one is the choice
const PAD = ((VISIBLE - 1) / 2) * ROW

export function WheelPicker({ items, value, onChange, label, className, align = 'center' }) {
  const ref = useRef(null)
  const settleTimer = useRef(0)
  const frame = useRef(0)
  const index = Math.max(0, items.findIndex((it) => it.value === value))

  // Tilt and fade each row by its distance from the band.
  const paint = useCallback(() => {
    frame.current = 0
    const el = ref.current
    if (!el) return
    const center = el.scrollTop / ROW
    el.querySelectorAll('[data-row]').forEach((row, i) => {
      const d = i - center
      const a = Math.min(Math.abs(d), 3)
      row.style.transform = `rotateX(${Math.max(-60, Math.min(60, -d * 20))}deg) scale(${1 - a * 0.07})`
      row.style.opacity = String((1 - a * 0.28) * (items[i]?.disabled ? 0.45 : 1))
      row.dataset.center = a < 0.5 ? 'true' : 'false'
    })
  }, [items])

  // Show the current value on the band (on open, and when the value changes from outside).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW
    paint()
  }, [index, paint])

  useEffect(() => () => {
    cancelAnimationFrame(frame.current)
    clearTimeout(settleTimer.current)
  }, [])

  const settle = useCallback(() => {
    const el = ref.current
    if (!el) return
    let i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)))
    if (items[i]?.disabled) {
      // Roll to the nearest free row, preferring later ones (later times).
      const after = items.findIndex((it, k) => k > i && !it.disabled)
      let before = -1
      for (let k = i - 1; k >= 0 && before < 0; k--) if (!items[k].disabled) before = k
      i = after >= 0 ? after : before
      if (i < 0) return
      el.scrollTo({ top: i * ROW, behavior: 'smooth' })
    }
    if (items[i].value !== value) onChange(items[i].value)
  }, [items, value, onChange])

  function onScroll() {
    if (!frame.current) frame.current = requestAnimationFrame(paint)
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(settle, 120)
  }

  function pick(i) {
    if (items[i].disabled) return
    ref.current?.scrollTo({ top: i * ROW, behavior: 'smooth' })
  }

  function onKeyDown(e) {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    for (let i = index + step; i >= 0 && i < items.length; i += step) {
      if (!items[i].disabled) return pick(i)
    }
  }

  return (
    <div
      ref={ref}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={items[index] ? `${label}-${index}` : undefined}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      className={cn('no-scrollbar relative h-[220px] snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [perspective:600px]', className)}
      style={{ paddingTop: PAD, paddingBottom: PAD }}
    >
      {items.map((it, i) => (
        <div
          key={it.value}
          id={`${label}-${i}`}
          data-row
          role="option"
          aria-selected={i === index}
          aria-disabled={it.disabled || undefined}
          onClick={() => pick(i)}
          className={cn(
            'flex h-11 snap-center select-none items-center whitespace-nowrap px-2 text-[17px] font-semibold tabular-nums text-ink/60 transition-colors data-[center=true]:text-[21px] data-[center=true]:font-extrabold data-[center=true]:text-ink',
            align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center',
            it.disabled ? 'cursor-default text-slate-300' : 'cursor-pointer',
          )}
        >
          {it.label}
        </div>
      ))}
    </div>
  )
}
