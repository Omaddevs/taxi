import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Phone, X } from 'lucide-react'
import { FlagUz } from '../ui/Flags'
import { usePhoneClaim, PhoneConfirmPanel } from './PhoneConfirm'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../../lib/utils'
import { t } from '../../i18n'

// Accounts made with Google start without a phone. The first time something needs one (booking,
// cargo, a request to drivers…) the API answers PHONE_REQUIRED; lib/api.js turns that into this
// event and the dialog below asks for the number once, confirmed in Telegram (PhoneConfirm.jsx)
// — no SMS code. The action that hit it can
// register itself with resumeAfterPhone(): the button then reads e.g. "Saqlash va yuborish" and
// the action runs again right after the number is saved; otherwise the person just retries.
export const PHONE_REQUIRED_EVENT = 'taxiline:phone-required'
const PHONE_RESUME_EVENT = 'taxiline:phone-resume'

export function askForPhone(message) {
  window.dispatchEvent(new CustomEvent(PHONE_REQUIRED_EVENT, { detail: { message } }))
}

/** Call from the failed action's error handler (after PHONE_REQUIRED): `run` goes again once saved. */
export function resumeAfterPhone(label, run) {
  window.dispatchEvent(new CustomEvent(PHONE_RESUME_EVENT, { detail: { label, run } }))
}

export function PhoneRequiredDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [resumeLabel, setResumeLabel] = useState('')
  const resume = useRef(null)
  const ready = isCompletePhoneUz(phone)
  const phoneClaim = usePhoneClaim(async () => {
    await queryClient.invalidateQueries({ queryKey: ['me'] })
    const run = resume.current
    resume.current = null
    if (run) {
      // Straight back to what the person was doing (e.g. sending the request to drivers).
      setOpen(false)
      run()
    } else setSaved(true)
  })

  useEffect(() => {
    function onRequired(e) {
      setReason(e.detail?.message || '')
      setError('')
      setSaved(false)
      setResumeLabel('')
      resume.current = null
      setOpen(true)
    }
    function onResume(e) {
      resume.current = e.detail?.run || null
      setResumeLabel(e.detail?.label || '')
    }
    window.addEventListener(PHONE_REQUIRED_EVENT, onRequired)
    window.addEventListener(PHONE_RESUME_EVENT, onResume)
    return () => {
      window.removeEventListener(PHONE_REQUIRED_EVENT, onRequired)
      window.removeEventListener(PHONE_RESUME_EVENT, onResume)
    }
  }, [])

  // A claim belongs to one opening of the dialog.
  const cancelClaim = phoneClaim.cancel
  useEffect(() => {
    if (!open) cancelClaim()
  }, [open, cancelClaim])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  async function onSubmit(e) {
    e.preventDefault()
    if (!ready) {
      setError(t('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak'))
      return
    }
    setError('')
    await phoneClaim.start(toE164Uz(phone))
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="phone-dialog-title">
      <button type="button" className="absolute inset-0" aria-label={t('Yopish')} onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-[420px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-canvas" aria-label={t('Yopish')}>
          <X className="h-5 w-5" />
        </button>

        {saved ? (
          <div className="py-2 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-7 w-7" strokeWidth={2.6} />
            </span>
            <h2 id="phone-dialog-title" className="mt-4 text-[19px] font-extrabold text-ink">{t('Raqam saqlandi')}</h2>
            <p className="mt-1.5 text-[14px] text-muted">{t('Endi amalni qaytadan bosing — davom etasiz.')}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 h-12 w-full rounded-full bg-brand text-[15px] font-extrabold text-ink transition hover:bg-[#00b6c2]"
            >
              {t('Davom etish')}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
              <Phone className="h-6 w-6" />
            </span>
            <h2 id="phone-dialog-title" className="mt-4 text-[19px] font-extrabold text-ink">{t('Telefon raqamingizni qo‘shing')}</h2>
            <p className="mt-1.5 text-[14px] leading-5 text-muted">
              {reason || t('Davom etish uchun raqam kerak')} {t('— haydovchi siz bilan shu raqam orqali bog‘lanadi. Raqam bir marta, Telegram orqali tasdiqlanadi.')}
            </p>

            <label className="relative mt-5 block">
              <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-bold text-brand">{t('Telefon raqam')}</span>
              <div className={`flex h-14 items-center gap-2 rounded-[16px] border-[1.5px] bg-white px-3 ${ready ? 'border-brand' : 'border-brand/50'}`}>
                <FlagUz className="h-4 w-[22px]" />
                <span className="text-[15px] font-extrabold">+998</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted" />
                <input
                  value={maskLocalPhoneUz(phone)}
                  onChange={(e) => {
                    setPhone(maskPhoneUz(e.target.value))
                    phoneClaim.cancel()
                  }}
                  placeholder="87 735 36 36"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={12}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-extrabold tracking-wide outline-none placeholder:font-semibold placeholder:text-slate-300"
                />
              </div>
            </label>
            {error || phoneClaim.error ? (
              <p className="mt-2 text-[13px] font-semibold text-red-500">{t(error || phoneClaim.error)}</p>
            ) : null}

            {phoneClaim.claim ? (
              <div className="mt-4">
                <PhoneConfirmPanel
                  claim={phoneClaim.claim}
                  state={phoneClaim.state}
                  onRetry={() => phoneClaim.start(phoneClaim.claim.phone)}
                  onCancel={phoneClaim.cancel}
                />
              </div>
            ) : (
              <button
                type="submit"
                disabled={phoneClaim.busy || !ready}
                className="mt-4 h-12 w-full rounded-full bg-brand text-[15px] font-extrabold text-ink transition hover:bg-[#00b6c2] disabled:bg-[#e9eef2] disabled:text-ink/35"
              >
                {phoneClaim.busy ? t('Saqlanmoqda…') : resumeLabel || t('Davom etish')}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
