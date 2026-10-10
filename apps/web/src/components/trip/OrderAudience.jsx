import { t } from '../../i18n'
// Who an order is for — shown wherever a driver sees a passenger request, so a women-only
// ("Ayollar uchun taxi") order and the passenger's gender are obvious at a glance.

const GENDER_CHIP = {
  MALE: { label: 'Erkak yo‘lovchi', icon: '👨', cls: 'bg-seat-male-soft text-seat-male' },
  FEMALE: { label: 'Ayol yo‘lovchi', icon: '👩', cls: 'bg-seat-female-soft text-seat-female' },
  COUPLE: { label: 'Er-xotin / oila', icon: '👫', cls: 'bg-violet-50 text-violet-700' },
}

export const WOMEN_CARD_CLASS = 'ring-2 ring-[#f5559a]/50 bg-gradient-to-b from-[#fff0f6] to-white'

export function WomenOrderRibbon({ className = '' }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5559a] to-[#ff7eb3] px-3 py-2 text-[12px] font-extrabold text-white ${className}`}
    >
      <span aria-hidden>🌸</span>
      <span className="min-w-0 flex-1 truncate">{t('Ayollar uchun taxi')}</span>
      <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">{t('Ayol yo‘lovchi')}</span>
    </div>
  )
}

export function PassengerGenderChip({ gender, className = '' }) {
  const chip = GENDER_CHIP[gender]
  if (!chip) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${chip.cls} ${className}`}>
      <span aria-hidden>{chip.icon}</span>
      {t(chip.label)}
    </span>
  )
}

/** Ribbon for women-only orders, otherwise just the passenger-gender chip (if known). */
export function OrderAudience({ order, className = '' }) {
  if (order?.womenOnly) return <WomenOrderRibbon className={className} />
  if (!order?.passengerGender) return null
  return (
    <div className={className}>
      <PassengerGenderChip gender={order.passengerGender} />
    </div>
  )
}
