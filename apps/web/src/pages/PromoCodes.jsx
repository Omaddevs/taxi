import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { promos } from '../data/mock'
import { api } from '../lib/api'

export default function PromoCodes() {
  const [promoInput, setPromoInput] = useState('')
  const [result, setResult] = useState(null)

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

      <p className="mb-2 mt-6 text-sm font-bold">Mening kodlarim</p>
      <div className="space-y-3">
        {promos.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-extrabold tracking-wide text-brand">{p.code}</p>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted">{p.until} gacha</p>
            </div>
            <Button size="sm" variant="soft" onClick={() => setPromoInput(p.code)}>
              {p.discount}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
