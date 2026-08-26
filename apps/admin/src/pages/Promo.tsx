import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import type { PromoRow } from '../types'

export default function Promo() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo'],
    queryFn: () => api.get<PromoRow[]>('/admin/promo'),
  })

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/admin/promo', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo'] })
      setShowForm(false)
      setError('')
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => api.patch(`/admin/promo/${input.id}`, { active: input.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-promo'] }),
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    create.mutate({
      code: String(form.get('code')).toUpperCase(),
      title: form.get('title'),
      discountType: form.get('discountType'),
      discountValue: Number(form.get('discountValue')),
      validFrom: new Date(String(form.get('validFrom'))).toISOString(),
      validUntil: new Date(String(form.get('validUntil'))).toISOString(),
      maxUses: form.get('maxUses') ? Number(form.get('maxUses')) : undefined,
    })
  }

  return (
    <div>
      <PageHeader
        title="Promo kodlar"
        subtitle={data ? `${data.length} ta kod` : undefined}
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Bekor qilish' : 'Yangi kod'}</Button>}
      />

      {showForm ? (
        <Card className="mb-6 p-5">
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <input name="code" placeholder="Kod (masalan SAFAR20)" required className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
            <input name="title" placeholder="Nomi" required className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
            <select name="discountType" className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand">
              <option value="PERCENT">Foizda</option>
              <option value="FIXED">Aniq summa</option>
            </select>
            <input name="discountValue" type="number" placeholder="Chegirma qiymati" required className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
            <input name="validFrom" type="date" required className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
            <input name="validUntil" type="date" required className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
            <input name="maxUses" type="number" placeholder="Maksimal ishlatish soni (ixtiyoriy)" className="h-10 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand sm:col-span-2" />
            {error ? <p className="text-sm font-semibold text-red-500 sm:col-span-2">{error}</p> : null}
            <Button type="submit" disabled={create.isPending} className="sm:col-span-2">
              Yaratish
            </Button>
          </form>
        </Card>
      ) : null}

      {isLoading ? (
        <p className="text-muted">Yuklanmoqda…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((promo) => (
            <Card key={promo.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-sm font-extrabold text-brand">{promo.code}</p>
                {promo.active ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Faol emas</Badge>}
              </div>
              <p className="mb-1 text-sm font-semibold text-ink">{promo.title}</p>
              <p className="text-sm text-muted">
                {promo.discountType === 'PERCENT' ? `${promo.discountValue}%` : `${promo.discountValue} so'm`} chegirma
              </p>
              <p className="mt-1 text-xs text-muted">
                Ishlatilgan: {promo.usesCount}{promo.maxUses ? ` / ${promo.maxUses}` : ''}
              </p>
              <button
                onClick={() => toggleActive.mutate({ id: promo.id, active: !promo.active })}
                className="mt-3 text-sm font-semibold text-brand hover:underline"
              >
                {promo.active ? 'O‘chirish' : 'Yoqish'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
