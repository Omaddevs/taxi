import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Lock, MessageSquareText } from 'lucide-react'
import { AccountScreen, PrimaryButton } from '../../components/account/AccountKit'
import { NetworkMark } from '../../components/payment/PaymentLogos'
import { api } from '../../lib/api'
import { cardNetwork, expiryValid, formatCardNumber, formatExpiry, isLocalNetwork, luhnValid, NETWORK_NAME } from '../../lib/cards'
import { ONLINE_PAYMENTS } from '../../lib/features'
import { t } from '../../i18n'

// To‘lov usullari → Karta qo‘shish: Uzcard, Humo, Visa, Mastercard. The number is checked here
// (network, Luhn, expiry) and never sent anywhere — only the network and the last four digits go
// to the server, next to the provider's token. Until a payment provider is live (ONLINE_PAYMENTS)
// the form explains that instead of saving.

const NETWORKS = ['uzcard', 'humo', 'visa', 'mastercard']

const CARD_FACE = {
  uzcard: 'from-[#1d4f91] to-[#0f2f5c]',
  humo: 'from-[#0aa5d8] to-[#0b5f8a]',
  visa: 'from-[#1a1f71] to-[#0b0e3d]',
  mastercard: 'from-[#2b2b33] to-[#111116]',
}

const fieldCls =
  'h-14 w-full rounded-[18px] bg-canvas px-4 text-[17px] text-ink outline-none ring-brand/40 placeholder:text-muted/70 focus:ring-2'

function Label({ children, error }) {
  return (
    <span className={`mb-1.5 block px-1 text-[13px] font-semibold ${error ? 'text-red-500' : 'text-muted'}`}>{error || children}</span>
  )
}

export default function AddCard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [holder, setHolder] = useState('')
  const [touched, setTouched] = useState(false)
  const [notice, setNotice] = useState('')

  const network = cardNetwork(number)
  const local = isLocalNetwork(network)
  const numberDone = number.length >= 16
  const numberError = numberDone && (!network ? t('Bu karta turi qo‘llab-quvvatlanmaydi') : !luhnValid(number) ? t('Karta raqami noto‘g‘ri') : '')
  const expiryError = expiry.length === 4 && !expiryValid(expiry) ? t('Muddat noto‘g‘ri yoki o‘tib ketgan') : ''
  const ready =
    network && luhnValid(number) && expiryValid(expiry) && (local || (/^\d{3}$/.test(cvv) && holder.trim().length >= 3))

  const add = useMutation({
    mutationFn: () =>
      api.post('/wallet/cards', {
        providerToken: `demo_${number.slice(-4)}_${Date.now()}`,
        brand: NETWORK_NAME[network],
        last4: number.slice(-4),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-cards'] })
      navigate('/payment-methods', { replace: true })
    },
    onError: (err) => setNotice(err?.message || t('Kartani qo‘shib bo‘lmadi')),
  })

  function submit(e) {
    e.preventDefault()
    setTouched(true)
    if (!ready) return
    if (!ONLINE_PAYMENTS) {
      setNotice(t('Karta ulash to‘lov tizimi ishga tushishi bilan ochiladi. Hozircha safar uchun naqd pul bilan to‘lang.'))
      return
    }
    add.mutate()
  }

  const shown = formatCardNumber(number.padEnd(16, '•'))
  return (
    <AccountScreen title="Karta qo‘shish">
      {/* Card face */}
      <div
        className={`relative mx-auto mt-1 aspect-[1.586] w-full max-w-[360px] overflow-hidden rounded-[24px] bg-gradient-to-br p-5 text-white shadow-[0_18px_40px_-18px_rgba(15,29,42,0.6)] transition-[background] duration-300 ${
          network ? CARD_FACE[network] : 'from-brand to-brand-dark'
        }`}
      >
        <span aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-start justify-between">
          <span className="h-8 w-11 rounded-md bg-gradient-to-br from-[#f6d77c] to-[#c9a23f] shadow-inner" aria-hidden />
          <span className="flex h-8 items-center">{network ? <NetworkMark network={network} light /> : null}</span>
        </div>
        <p className="relative mt-[13%] font-mono text-[clamp(18px,5.6vw,22px)] font-semibold tracking-[0.12em]" aria-hidden>
          {shown}
        </p>
        <div className="relative mt-[6%] flex items-end justify-between gap-3 text-[13px] uppercase tracking-wider text-white/85">
          <span className="min-w-0 truncate">{local ? NETWORK_NAME[network] : holder.trim() || t('KARTA EGASI')}</span>
          <span className="shrink-0 font-mono text-[15px]">{expiry ? formatExpiry(expiry).padEnd(5, '•') : 'MM/YY'}</span>
        </div>
      </div>

      {/* Supported networks */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {NETWORKS.map((n) => (
          <span
            key={n}
            className={`flex h-9 items-center rounded-xl bg-[#ffffff] px-2.5 ring-1 transition ${
              network === n ? 'ring-2 ring-brand' : network ? 'opacity-40 ring-black/[0.06]' : 'ring-black/[0.06]'
            }`}
          >
            <NetworkMark network={n} className="h-[18px]" />
          </span>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <label className="block">
          <Label error={(touched || numberDone) && numberError}>{t('Karta raqami')}</Label>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={formatCardNumber(number)}
            onChange={(e) => {
              setNumber(e.target.value.replace(/\D/g, '').slice(0, 19))
              setNotice('')
            }}
            className={`${fieldCls} font-mono tracking-wider ${numberError ? 'ring-2 ring-red-400' : ''}`}
          />
        </label>

        <div className={`grid gap-3 ${local ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <label className="block">
            <Label error={expiryError}>{t('Amal qilish muddati')}</Label>
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={formatExpiry(expiry)}
              onChange={(e) => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={`${fieldCls} font-mono ${expiryError ? 'ring-2 ring-red-400' : ''}`}
            />
          </label>
          {local ? null : (
            <label className="block">
              <Label>CVV</Label>
              <input
                inputMode="numeric"
                autoComplete="cc-csc"
                type="password"
                placeholder="•••"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className={`${fieldCls} font-mono`}
              />
            </label>
          )}
        </div>

        {local ? (
          <p className="flex items-start gap-3 rounded-[18px] bg-canvas px-4 py-3.5 text-[14px] leading-5 text-muted">
            <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />
            {t('Karta ulangan telefon raqamiga tasdiqlash uchun SMS-kod yuboriladi.')}
          </p>
        ) : (
          <label className="block">
            <Label>{t('Karta egasi')}</Label>
            <input
              autoComplete="cc-name"
              placeholder="ALISHER NAVOIY"
              value={holder}
              onChange={(e) => setHolder(e.target.value.toUpperCase().replace(/[^A-Z\s'-]/g, '').slice(0, 40))}
              className={`${fieldCls} uppercase`}
            />
          </label>
        )}

        {notice ? (
          <p className="flex items-start gap-3 rounded-[18px] bg-amber-50 px-4 py-3.5 text-[14px] leading-5 text-amber-700">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            {notice}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={!ready || add.isPending}>
          {add.isPending ? t('Qo‘shilmoqda…') : t('Kartani qo‘shish')}
        </PrimaryButton>
        <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[12px] text-muted">
          <Lock className="h-3.5 w-3.5" />
          {t('Karta ma’lumotlari TaxiLine serverida saqlanmaydi')}
        </p>
      </form>
    </AccountScreen>
  )
}
