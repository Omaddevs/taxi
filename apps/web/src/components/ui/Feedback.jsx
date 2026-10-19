import { useEffect, useRef, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { t } from '../../i18n'

// One place for "are you sure?" and "that didn't work" — mounted once in App (<FeedbackHost />).
// The site runs as a Telegram mini app too, where the browser's own confirm() is unreliable, so
// destructive actions ask through confirmAction() instead, and failed actions say so through
// showToast() rather than leaving a button that silently did nothing.
const CONFIRM_EVENT = 'taxiline:confirm'
const TOAST_EVENT = 'taxiline:toast'
const TOAST_MS = 4500

/** Resolves true when the person confirms, false when they back out. */
export function confirmAction({ title, message = '', confirmLabel = 'Ha', cancelLabel = 'Yo‘q', danger = true }) {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail: { title, message, confirmLabel, cancelLabel, danger, resolve } }))
  })
}

export function showToast(message) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }))
}

/** onError for a mutation whose failure has no other place on screen. */
export function toastError(err) {
  // PHONE_REQUIRED already opens the "add your number" dialog (lib/api.js).
  if (err?.code === 'PHONE_REQUIRED') return
  showToast(err?.message || t('Xatolik yuz berdi'))
}

export function FeedbackHost() {
  const [ask, setAsk] = useState(null)
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    const onConfirm = (e) => setAsk(e.detail)
    const onToast = (e) => {
      clearTimeout(timer.current)
      setToast({ message: e.detail?.message, key: Date.now() })
      timer.current = setTimeout(() => setToast(null), TOAST_MS)
    }
    window.addEventListener(CONFIRM_EVENT, onConfirm)
    window.addEventListener(TOAST_EVENT, onToast)
    return () => {
      window.removeEventListener(CONFIRM_EVENT, onConfirm)
      window.removeEventListener(TOAST_EVENT, onToast)
      clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    if (!ask) return undefined
    const onKey = (e) => e.key === 'Escape' && answer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function answer(ok) {
    ask?.resolve(ok)
    setAsk(null)
  }

  return (
    <>
      {ask ? (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-black/45 p-3 sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={ask.message ? 'confirm-message' : undefined}
        >
          <button type="button" className="absolute inset-0" aria-label={t('Yopish')} onClick={() => answer(false)} />
          <div className="relative w-full max-w-[400px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
            <h2 id="confirm-title" className="text-[18px] font-extrabold text-ink">
              {t(ask.title)}
            </h2>
            {ask.message ? (
              <p id="confirm-message" className="mt-1.5 text-[14px] leading-5 text-muted">
                {t(ask.message)}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => answer(false)}
                className="h-12 rounded-full bg-canvas text-[15px] font-extrabold text-ink"
              >
                {t(ask.cancelLabel)}
              </button>
              <button
                type="button"
                onClick={() => answer(true)}
                className={`h-12 rounded-full text-[15px] font-extrabold ${ask.danger ? 'bg-red-500 text-white' : 'bg-brand text-ink'}`}
              >
                {t(ask.confirmLabel)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div key={toast.key} className="pointer-events-none fixed inset-x-0 bottom-4 z-[220] flex justify-center px-4" role="status" aria-live="polite">
          <div className="pointer-events-auto flex max-w-[480px] items-start gap-2 rounded-2xl bg-[#1a2b3c] px-4 py-3 text-[14px] font-semibold text-white shadow-2xl ring-1 ring-white/10">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <span className="min-w-0 flex-1">{t(toast.message)}</span>
            <button type="button" onClick={() => setToast(null)} aria-label={t('Yopish')} className="-mr-1 rounded-full p-0.5 text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
