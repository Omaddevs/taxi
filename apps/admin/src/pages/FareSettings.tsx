import { useState, type FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { SkeletonGrid } from '../components/ui/EmptyState'
import { Field, inputClass } from '../components/ui/Chart'
import { formatDateTime, formatSom } from '../lib/utils'
import type { FarePreview, FareRange, FareRates, FareSettingsResponse } from '../types'

const FIELDS: { key: keyof FareRates; label: string; unit: string; hint: string }[] = [
  { key: 'perKm', label: '1 km narxi (bir o‘rindiq)', unit: 'so‘m', hint: 'Masofa shu narxga ko‘paytiriladi — o‘rtacha narx shundan chiqadi.' },
  { key: 'minPerSeat', label: 'Eng kam narx (bir o‘rindiq)', unit: 'so‘m', hint: 'Qisqa yo‘lda ham bir o‘rindiq bundan arzon tavsiya qilinmaydi.' },
  { key: 'spreadPercent', label: 'Narx oralig‘i', unit: '%', hint: '“Tejamkor” va “Tez topiladi” o‘rtacha narxdan shuncha foiz past va baland turadi. 0 — bitta narx.' },
  { key: 'wholeCarDiscountPercent', label: 'Butun mashina chegirmasi', unit: '%', hint: '“Bo‘sh mashina” (4 o‘rindiq) umumiy narxidan ayiriladi.' },
]

type Draft = Record<keyof FareRates, string>

const toDraft = (rates: FareRates): Draft => ({
  perKm: String(rates.perKm),
  minPerSeat: String(rates.minPerSeat),
  spreadPercent: String(rates.spreadPercent),
  wholeCarDiscountPercent: String(rates.wholeCarDiscountPercent),
})

/** The draft as numbers, or the first field that is not a whole number within its limits. */
function parseDraft(draft: Draft, limits: FareSettingsResponse['limits']): { rates: FareRates } | { invalid: keyof FareRates } {
  const rates = {} as FareRates
  for (const { key } of FIELDS) {
    const value = Number(draft[key])
    if (draft[key].trim() === '' || !Number.isInteger(value) || value < limits[key].min || value > limits[key].max) return { invalid: key }
    rates[key] = value
  }
  return { rates }
}

function RangeRow({ title, range }: { title: string; range: FareRange }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['Tejamkor', range.min],
            ['O‘rtacha', range.mid],
            ['Tez topiladi', range.max],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-canvas px-3 py-2">
            <p className="text-[11px] font-semibold text-muted">{label}</p>
            <p className="text-sm font-extrabold text-ink">{formatSom(value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// "Yo‘l haqi tariflari": the admin tunes the formula behind the fare the passenger is suggested
// in "Taxi chaqirish" → "Yo‘l haqqi", and tries any values on a sample distance before saving.
export default function FareSettings() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [km, setKm] = useState('362')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data } = useQuery({
    queryKey: ['admin-fare-settings'],
    queryFn: () => api.get<FareSettingsResponse>('/admin/fare-settings'),
  })

  // Until the admin types something the form simply mirrors what is saved.
  const form = draft ?? (data ? toDraft(data.rates) : null)
  const parsed = data && form ? parseDraft(form, data.limits) : null
  const rates = parsed && 'rates' in parsed ? parsed.rates : null
  const invalid = parsed && 'invalid' in parsed ? parsed.invalid : null
  const dirty = Boolean(data && rates && FIELDS.some(({ key }) => rates[key] !== data.rates[key]))
  const kmValue = Number(km)
  const kmOk = km.trim() !== '' && kmValue > 0 && kmValue <= 5000

  const { data: preview } = useQuery({
    queryKey: ['admin-fare-preview', rates, kmValue],
    queryFn: () => api.post<FarePreview>('/admin/fare-settings/preview', { km: kmValue, rates }),
    enabled: Boolean(rates) && kmOk,
    placeholderData: keepPreviousData,
  })

  const save = useMutation({
    mutationFn: (next: FareRates) => api.patch<FareSettingsResponse>('/admin/fare-settings', next),
    onSuccess: (next) => {
      qc.setQueryData(['admin-fare-settings'], next)
      setDraft(null)
      setError('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Saqlab bo‘lmadi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (rates) save.mutate(rates)
  }

  if (!data || !form) {
    return (
      <div>
        <PageHeader title="Yo‘l haqi tariflari" subtitle="Yo‘lovchiga tavsiya qilinadigan narx formulasi" />
        <SkeletonGrid count={2} />
      </div>
    )
  }

  const isDefault = FIELDS.every(({ key }) => form[key] === String(data.defaults[key]))

  return (
    <div>
      <PageHeader
        title="Yo‘l haqi tariflari"
        subtitle="Yo‘lovchiga “Taxi chaqirish”da tavsiya qilinadigan narx formulasi"
        action={dirty ? <Badge tone="amber">Saqlanmagan o‘zgarishlar</Badge> : null}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-bold text-ink">Formula</h2>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            Bir o‘rindiq narxi = masofa (km) × 1 km narxi, lekin eng kam narxdan past emas. Narxlar 5 000 so‘mgacha yaxlitlanadi.
            Yo‘lovchi baribir o‘z narxini taklif qilishi yoki “Kelishiladi”ni tanlashi mumkin — bu faqat tavsiya.
          </p>
          <form onSubmit={onSubmit} className="space-y-3.5">
            {FIELDS.map(({ key, label, unit, hint }) => {
              const { min, max } = data.limits[key]
              return (
                <div key={key}>
                  <Field label={`${label}, ${unit}`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={min}
                      max={max}
                      step={1}
                      value={form[key]}
                      onChange={(e) => setDraft({ ...form, [key]: e.target.value })}
                      aria-invalid={invalid === key}
                      className={`${inputClass} ${invalid === key ? 'border-red-400 focus:border-red-500' : ''}`}
                    />
                  </Field>
                  <p className={`mt-1 text-xs ${invalid === key ? 'font-semibold text-red-500' : 'text-muted'}`}>
                    {invalid === key ? `Butun son kiriting: ${min.toLocaleString('ru-RU')} – ${max.toLocaleString('ru-RU')} ${unit}` : hint}
                  </p>
                </div>
              )
            })}

            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" disabled={!dirty || save.isPending}>
                {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
              </Button>
              {dirty ? (
                <Button variant="outline" onClick={() => setDraft(null)}>
                  Bekor qilish
                </Button>
              ) : null}
              {isDefault ? null : (
                <Button variant="ghost" onClick={() => setDraft(toDraft(data.defaults))}>
                  Standart qiymatlar
                </Button>
              )}
              {saved ? <span className="text-sm font-semibold text-emerald-600">Saqlandi — yangi narxlar darhol amal qiladi</span> : null}
            </div>
          </form>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            {data.updatedAt ? `Oxirgi o‘zgarish: ${formatDateTime(data.updatedAt)}` : 'Hali o‘zgartirilmagan — standart qiymatlar amal qilmoqda.'}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-sm font-bold text-ink">Sinab ko‘rish</h2>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            Chapdagi qiymatlar bilan (saqlanmagan bo‘lsa ham) yo‘lovchi qanday narxlarni ko‘rishini tekshiring.
          </p>
          <Field label="Yo‘l masofasi, km">
            <input type="number" inputMode="decimal" min={1} max={5000} value={km} onChange={(e) => setKm(e.target.value)} className={inputClass} />
          </Field>
          <p className="mt-1 text-xs text-muted">Masalan, Toshkent — Andijon taxminan 362 km.</p>

          {preview && rates && kmOk ? (
            <div className="mt-4 space-y-4">
              <RangeRow title="1 kishi" range={preview.oneSeat.total} />
              <RangeRow title="Bo‘sh mashina (4 o‘rindiq)" range={preview.wholeCar.total} />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-3 text-sm text-muted">
              {rates ? 'Masofani kiriting (1 – 5 000 km).' : 'Avval formuladagi xatoni to‘g‘rilang.'}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
