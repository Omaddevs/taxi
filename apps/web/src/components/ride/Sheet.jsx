import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { lockScroll } from '../../lib/scrollLock'
import { cn } from '../../lib/utils'
import { t } from '../../i18n'

// The ride flow's step container: a bottom sheet on phones, a centred dialog from `lg` up.
// `footer` stays pinned under the scrolling body (the step's main button lives there).
export function Sheet({ open, title, onClose, children, footer, className }) {
  // Callers pass a fresh closure every render; the lock must not be re-taken each time.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const unlock = lockScroll()
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-end justify-center lg:items-center lg:p-6">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label={t('Yopish')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92svh] w-full flex-col rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(16,42,67,0.18)] lg:max-h-[88svh] lg:max-w-[480px] lg:rounded-[28px]',
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 lg:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-4 lg:pt-5">
          <h3 className="min-w-0 text-[20px] font-extrabold leading-tight text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink"
            aria-label={t('Yopish')}
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        <div className="shrink-0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}

/** The step's main button. `accent` is one of RIDE_ACCENTS. */
export function SheetButton({ accent, disabled, className, children, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-[20px] px-4 text-[16px] font-extrabold transition',
        disabled ? 'bg-slate-200 text-slate-400' : cn(accent.solid, accent.glow, 'active:scale-[0.99]'),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
