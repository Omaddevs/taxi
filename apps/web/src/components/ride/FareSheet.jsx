import { useState } from 'react'
import { Minus, Plus, Sparkles } from 'lucide-react'
import { useFareEstimate } from '../../lib/queries'
import { MAX_PRICE, MIN_PRICE, PRICE_STEP, clampPrice, formatMoney, partyLabel } from '../../lib/ride'
import { cn } from '../../lib/utils'
import { Sheet, SheetButton } from './Sheet'
import { t } from '../../i18n'

const FALLBACK_PRICE = 50_000

/**
 * "Yo‘l haqqi": the passenger either names a fare for the whole party ("Narx taklif qilaman",
 * guided by the server's estimate) or leaves it to be agreed by phone ("Kelishiladi").
 */
export function FareSheet({ open, onClose, accent, from, to, routeKm, passengers, wholeCar, price, priceMode, onConfirm }) {
  const { data: estimate } = useFareEstimate({ from, to, routeKm, passengers, wholeCar, enabled: open })
  const [mode, setMode] = useState('offer')
  // null until the passenger touches the amount — until then it follows the estimate's middle.
  const [amount, setAmount] = useState(null)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setMode(priceMode === 'negotiable' ? 'negotiable' : 'offer')
      setAmount(priceMode === 'offer' && price != null ? price : null)
    }
  }

  const range = estimate?.total
  const value = amount ?? range?.mid ?? FALLBACK_PRICE
  const forWhom = wholeCar ? t('Butun mashina uchun') : t('{0} kishi uchun', Number(passengers) || 1)
  // An admin may set the range to zero width ("Yo‘l haqi tariflari") — then there is one
  // suggested fare and nothing to choose between.
  const flat = range ? range.min === range.max : false
  const presets =
    range && !flat
      ? [
          ['Tejamkor', range.min],
          ['O‘rtacha', range.mid],
          ['Tez topiladi', range.max],
        ]
      : []

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Yo‘l haqqi')}
      footer={
        <SheetButton
          accent={accent}
          onClick={() => onConfirm(mode === 'offer' ? { priceMode: 'offer', price: value } : { priceMode: 'negotiable', price: null })}
        >
          {mode === 'offer' ? t('Tasdiqlash · {0} so‘m', formatMoney(value)) : t('Tasdiqlash · Kelishiladi')}
        </SheetButton>
      }
    >
      {range ? (
        <div className={cn('flex items-center gap-3.5 rounded-[20px] p-4', accent.soft)}>
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white', accent.softText)}>
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className={cn('text-[13px] font-semibold', accent.softText)}>
              {t('Taxminiy narx · {0}', partyLabel({ passengers, wholeCar }))}
            </p>
            <p className="text-[20px] font-extrabold leading-tight text-ink">
              {flat ? t('{0} so‘m', formatMoney(range.mid)) : t('{0} – {1} so‘m', formatMoney(range.min), formatMoney(range.max))}
            </p>
            <p className="text-[13px] text-muted">{t('Yo‘l masofasi bo‘yicha (~{0} km)', estimate.km)}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 rounded-[18px] bg-canvas p-1" role="tablist">
        {[
          ['offer', 'Narx taklif qilaman'],
          ['negotiable', 'Kelishiladi'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              'h-12 rounded-[14px] text-[14px] font-bold transition',
              mode === id ? 'bg-white text-ink shadow-[0_2px_8px_rgba(16,42,67,0.1)]' : 'text-muted',
            )}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {mode === 'offer' ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setAmount(clampPrice(value - PRICE_STEP))}
              disabled={value <= MIN_PRICE}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-canvas text-ink disabled:opacity-40"
              aria-label={t('Narxni kamaytirish')}
            >
              <Minus className="h-6 w-6" strokeWidth={2.4} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-[34px] font-black leading-none tracking-tight text-ink">
                {formatMoney(value)} <span className="text-[17px] font-bold text-muted">{t('so‘m')}</span>
              </p>
              <p className="mt-1.5 text-[13px] text-muted">{forWhom}</p>
            </div>
            <button
              type="button"
              onClick={() => setAmount(clampPrice(value + PRICE_STEP))}
              disabled={value >= MAX_PRICE}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-canvas text-ink disabled:opacity-40"
              aria-label={t('Narxni oshirish')}
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </button>
          </div>

          {presets.length ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {presets.map(([label, preset]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAmount(preset)}
                  aria-pressed={value === preset}
                  className={cn(
                    'rounded-2xl border-2 px-1 py-2.5 text-center transition',
                    value === preset ? cn('bg-white', accent.border) : 'border-line bg-canvas',
                  )}
                >
                  <span className={cn('block text-[13px] font-semibold', value === preset ? accent.softText : 'text-muted')}>{t(label)}</span>
                  <span className="block text-[15px] font-extrabold text-ink">{formatMoney(preset)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          {t('Narxni haydovchi bilan telefon orqali kelishasiz. So‘rovda "Kelishiladi" deb ko‘rsatiladi.')}
        </p>
      )}
    </Sheet>
  )
}
