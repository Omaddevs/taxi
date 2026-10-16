import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { useScrollLock } from '../../lib/scrollLock'
import { t } from '../../i18n'

// "Arizangiz qabul qilindi" confirmation: a bottom sheet on phones, a centred card on wider
// screens — a scalloped brand badge with a check, the message, one button. Closes on the button,
// the backdrop or Escape; focus moves to the button so Enter/Space dismiss it too.

const SEAL =
  'M50 2l8.6 7.2 11-2.2 4.5 10.3 10.8 3.1-.6 11.2 8.3 7.5-5.4 9.9 5.4 9.9-8.3 7.5.6 11.2-10.8 3.1-4.5 10.3-11-2.2L50 98l-8.6-7.2-11 2.2-4.5-10.3-10.8-3.1.6-11.2-8.3-7.5 5.4-9.9-5.4-9.9 8.3-7.5-.6-11.2 10.8-3.1 4.5-10.3 11 2.2z'

export function SuccessSheet({ open, title, text, button = 'Yaxshi', onClose }) {
  const buttonRef = useRef(null)
  useScrollLock(open)
  useEffect(() => {
    if (!open) return undefined
    buttonRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null

  // Portalled to <body>: a transformed or blurred ancestor would otherwise trap `fixed`.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="success-sheet-title">
      <button
        type="button"
        aria-label={t('Yopish')}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f1d2a]/45 backdrop-blur-[3px] animate-[fade-in_.2s_ease-out] motion-safe-anim"
      />
      <div className="relative w-full max-w-[440px] rounded-t-[32px] bg-white px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 text-center shadow-[0_-20px_60px_-20px_rgba(15,29,42,0.45)] animate-[sheet-up_.32s_cubic-bezier(.2,.9,.25,1)] motion-safe-anim sm:rounded-[32px] sm:pb-7">
        <span className="mx-auto block h-1 w-10 rounded-full bg-black/10 sm:hidden" aria-hidden />

        <span className="relative mx-auto mt-6 flex h-[92px] w-[92px] items-center justify-center animate-[seal-pop_.5s_.12s_cubic-bezier(.3,1.6,.5,1)_both] motion-safe-anim">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d={SEAL} fill="#bff3f7" />
          </svg>
          <Check className="relative h-11 w-11 text-[#00808a]" strokeWidth={3.2} />
        </span>

        <h3 id="success-sheet-title" className="mt-5 text-[26px] font-extrabold tracking-tight text-[#1a2b3c]">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-[320px] text-[15px] leading-[1.5] text-[#5b6472]">{text}</p>

        <button
          ref={buttonRef}
          type="button"
          onClick={onClose}
          className="mt-8 h-14 w-full rounded-[18px] bg-[#1a2b3c] text-[16px] font-bold text-white outline-none ring-brand/40 transition hover:bg-[#0f1d2a] focus-visible:ring-4 active:scale-[0.99]"
        >
          {t(button)}
        </button>
      </div>
    </div>,
    document.body,
  )
}
