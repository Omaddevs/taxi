import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Clock3, Copy, Percent, Plus } from 'lucide-react'
import { AccountScreen, PrimaryButton, Sheet } from '../components/account/AccountKit'
import { api } from '../lib/api'
import { formatSom } from '../lib/utils'
import { t } from '../i18n'

// Menu → Keshbek va chegirmalar: enter a promo code (checked against /promo/validate; a valid one
// is applied when a ride is booked) and the codes currently on offer.

function untilLabel(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`
}

const discountText = (p) => (p.discountType === 'PERCENT' ? `${p.discountValue}%` : formatSom(p.discountValue))

export default function PromoCodes() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')
  const { data: promos = [], isLoading } = useQuery({ queryKey: ['promo-available'], queryFn: () => api.get('/promo/available') })

  const validate = useMutation({
    mutationFn: (value) => api.post('/promo/validate', { code: value }),
    onSuccess: (data, value) => setResult({ code: value, ...data }),
    onError: () => setResult({ code, valid: false, reason: 'Tekshirib bo‘lmadi' }),
  })

  function openWith(value = '') {
    setCode(value)
    setResult(null)
    setOpen(true)
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      openWith(value)
    }
  }

  return (
    <AccountScreen title="Keshbek va chegirmalar">
      <button type="button" onClick={() => openWith()} className="mt-1 flex w-full items-center gap-4 rounded-[22px] bg-canvas p-4 text-left transition active:scale-[0.99]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/[0.06] text-ink">
          <Plus className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <span className="text-[17px] font-semibold text-ink">{t('Promo kodni kiriting')}</span>
      </button>

      <div className="mt-3 space-y-3">
        {isLoading ? <div className="h-20 animate-pulse rounded-[22px] bg-canvas" /> : null}
        {promos.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-[22px] bg-canvas p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white">
              <Percent className="h-6 w-6" strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="text-[17px] font-semibold text-ink">{t('Chegirma {0}', discountText(p))}</span>
                {p.validUntil ? (
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[13px] text-muted">
                    <Clock3 className="h-3.5 w-3.5" /> {t('{0} gacha', untilLabel(p.validUntil))}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-[14px] text-ink/80">{t(p.title)}</span>
              <button type="button" onClick={() => copy(p.code)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-bold tracking-wide text-brand-dark">
                {copied === p.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {p.code}
              </button>
            </span>
          </div>
        ))}
        {!isLoading && !promos.length ? <p className="px-1 pt-4 text-center text-[14px] text-muted">{t('Hozircha amaldagi promo kodlar yo‘q')}</p> : null}
      </div>

      <Sheet open={open} title="Promo kod" onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) validate.mutate(code.trim())
          }}
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setResult(null)
            }}
            placeholder={t('PROMO KOD')}
            autoCapitalize="characters"
            className="h-14 w-full rounded-[18px] bg-canvas px-4 text-[18px] font-bold uppercase tracking-wider text-ink outline-none ring-brand/40 placeholder:font-semibold placeholder:text-muted focus:ring-2"
          />
          {result?.valid ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-[14px] font-semibold text-emerald-700">
              {result.code} {t('amal qiladi —')} {result.discountType === 'PERCENT' ? `${result.discountValue}%` : formatSom(result.discountValue)}{' '}
              {t('chegirma. Safar band qilishda avtomatik qo‘llanadi.')}
            </p>
          ) : null}
          {result && !result.valid ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600">{t(result.reason || 'Kod topilmadi')}</p> : null}
          <PrimaryButton type="submit" className="mt-4" disabled={!code.trim() || validate.isPending}>
            {validate.isPending ? t('Tekshirilmoqda…') : t('Tekshirish')}
          </PrimaryButton>
        </form>
      </Sheet>
    </AccountScreen>
  )
}
