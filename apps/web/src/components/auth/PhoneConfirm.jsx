import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { KIRISH_BOT } from './AuthChrome'
import { formatPhoneUz } from '../../lib/utils'
import { t } from '../../i18n'

// Adding or changing the account's phone. There is no SMS, so the number is confirmed in
// @taxiline_kirish_bot: the server opens a claim, the person taps through to the bot and shares
// their contact, and the number is saved only if Telegram's matches the one typed here
// (server: users/phoneClaim.service). This hook drives that; <PhoneConfirmPanel> shows it.
const POLL_MS = 2000

export function usePhoneClaim(onConfirmed) {
  const [claim, setClaim] = useState(null) // { token, phone }
  const [state, setState] = useState('idle') // idle | starting | waiting | expired
  const [error, setError] = useState('')
  const onConfirmedRef = useRef(onConfirmed)
  useEffect(() => {
    onConfirmedRef.current = onConfirmed
  }, [onConfirmed])

  useEffect(() => {
    if (state !== 'waiting' || !claim) return undefined
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/users/me/phone/${claim.token}`)
        if (res.status === 'done') {
          setState('idle')
          setClaim(null)
          onConfirmedRef.current?.(res.phone)
        } else if (res.status === 'expired') setState('expired')
      } catch {
        /* retry next tick */
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [state, claim])

  async function start(phone) {
    setError('')
    setState('starting')
    try {
      const res = await api.post('/users/me/phone', { phone })
      setClaim(res)
      setState('waiting')
      return true
    } catch (err) {
      setError(err.message || t('Raqamni saqlab bo‘lmadi'))
      setState('idle')
      return false
    }
  }

  const cancel = useCallback(() => {
    setClaim(null)
    setState('idle')
  }, [])

  return { claim, state, error, start, cancel, busy: state === 'starting' }
}

/** The "now confirm it in Telegram" step, while a claim is open. */
export function PhoneConfirmPanel({ claim, state, onRetry, onCancel }) {
  if (!claim) return null
  const expired = state === 'expired'
  return (
    <div className="rounded-[18px] border border-[#2AABEE]/30 bg-[#f2faff] p-4">
      <p className="text-[14px] font-extrabold text-ink">
        {t('{0} raqamini Telegram orqali tasdiqlang', formatPhoneUz(claim.phone))}
      </p>
      <p className="mt-1 text-[13px] leading-5 text-muted">
        {expired
          ? t('Vaqt tugadi. Qaytadan urinib ko‘ring.')
          : t('@{0} ochiladi — «📱 Raqamimni yuborish» tugmasini bosing. Raqam Telegram’dagi raqamingizga mos bo‘lsa, shu yerning o‘zida saqlanadi.', KIRISH_BOT)}
      </p>
      {expired ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-11 w-full rounded-full bg-[#2AABEE] text-[14px] font-extrabold text-white"
        >
          {t('Qaytadan urinish')}
        </button>
      ) : (
        <>
          <a
            href={`https://t.me/${KIRISH_BOT}?start=ph_${claim.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-11 items-center justify-center rounded-full bg-[#2AABEE] text-[14px] font-extrabold text-white"
          >
            {t('Telegram orqali tasdiqlash')}
          </a>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('Tasdiq kutilmoqda…')}
          </p>
        </>
      )}
      {onCancel ? (
        <button type="button" onClick={onCancel} className="mt-2 w-full text-center text-[13px] font-semibold text-muted hover:text-ink">
          {t('Bekor qilish')}
        </button>
      ) : null}
    </div>
  )
}
