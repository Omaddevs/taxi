import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api } from '../lib/api'
import { formatDateUz, formatSom } from '../lib/utils'

export default function PromoCodes() {
  const [promoInput, setPromoInput] = useState('')
  const [result, setResult] = useState(null)
  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['promo-available'],
    queryFn: () => api.get('/promo/available'),
  })

  const validate = useMutation({
    mutationFn: (code) => api.post('/promo/validate', { code }),
    onSuccess: (data, code) => setResult({ code, ...data }),
    onError: () => setResult({ code: promoInput, valid: false, reason: 'Tekshirib bo‘lmadi' }),
  })

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Promo kodlar" />
      <PageTitle title="Promo kodlar" subtitle="Chegirma kodini kiriting yoki mavjudlaridan foydalaning" />

      <Card className="flex gap-2 p-3">
        <Input
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
          placeholder="PROMO KOD"
          className="uppercase"
        />
        <Button disabled={!promoInput || validate.isPending} onClick={() => validate.mutate(promoInput)}>
          Tekshirish
        </Button>
      </Card>
      {result?.valid ? (
        <p className="mt-2 text-sm font-semibold text-success">
          {result.code} amal qiladi — {result.discountType === 'PERCENT' ? `${result.discountValue}%` : `${result.discountValue} so'm`} chegirma.
          Safar band qilishda avtomatik qo‘llanadi.
        </p>
      ) : null}
      {result && !result.valid ? (
        <p className="mt-2 text-sm font-semibold text-danger">{result.reason || 'Kod topilmadi'}</p>
      ) : null}

      <p className="mb-2 mt-6 text-sm font-bold">Amaldagi kodlar</p>
      {isLoading ? (
        <p className="text-sm text-muted">Yuklanmoqda…</p>
      ) : !promos.length ? (
        <p className="text-sm text-muted">Hozircha amaldagi promo kodlar yo‘q</p>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-extrabold tracking-wide text-brand">{p.code}</p>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted">{formatDateUz(String(p.validUntil).slice(0, 10))} gacha</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => setPromoInput(p.code)}>
                {p.discountType === 'PERCENT' ? `${p.discountValue}%` : formatSom(p.discountValue)}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
