import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { formatSom } from '../lib/utils'
import type { ServiceRow } from '../types'

export default function Services() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get<ServiceRow[]>('/admin/services'),
  })

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/admin/services', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
      setShowForm(false)
      setError('')
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  const updatePrice = useMutation({
    mutationFn: (input: { id: string; basePrice: number }) =>
      api.patch(`/admin/services/${input.id}`, { basePrice: input.basePrice }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  })

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) =>
      api.patch(`/admin/services/${input.id}`, { active: input.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    create.mutate({
      id: String(form.get('id')).trim().toLowerCase().replace(/\s+/g, '-'),
      title: form.get('title'),
      description: form.get('description') || undefined,
      icon: form.get('icon') || 'car',
      basePrice: Number(form.get('basePrice')),
      sortOrder: Number(form.get('sortOrder') || 0),
    })
  }

  return (
    <div>
      <PageHeader
        title="Xizmat turlari"
        subtitle="Narxlar, tartib va faollik holatini boshqaring"
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Bekor qilish' : 'Yangi xizmat'}</Button>}
      />

      {showForm ? (
        <Card className="mb-6 p-5">
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <Field label="ID (lotin, masalan intercity)">
              <input name="id" required className={inputClass} />
            </Field>
            <Field label="Nomi">
              <input name="title" required className={inputClass} />
            </Field>
            <Field label="Tavsif">
              <input name="description" className={inputClass} />
            </Field>
            <Field label="Ikonka">
              <input name="icon" placeholder="car" className={inputClass} />
            </Field>
            <Field label="Boshlang‘ich narx">
              <input name="basePrice" type="number" required className={inputClass} />
            </Field>
            <Field label="Tartib">
              <input name="sortOrder" type="number" defaultValue={0} className={inputClass} />
            </Field>
            {error ? <p className="text-sm font-semibold text-red-500 sm:col-span-2">{error}</p> : null}
            <Button type="submit" disabled={create.isPending} className="sm:col-span-2">
              Yaratish
            </Button>
          </form>
        </Card>
      ) : null}

      {isLoading ? (
        <SkeletonGrid count={3} />
      ) : !data?.length ? (
        <EmptyState icon={Layers} title="Xizmat turlari yo‘q" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((service) => (
            <Card key={service.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold text-ink">{service.title}</p>
                {service.active ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Faol emas</Badge>}
              </div>
              <p className="mb-3 text-sm text-muted">{service.description || '—'}</p>
              <label className="mb-1 block text-xs font-semibold text-muted">Boshlang‘ich narx</label>
              <input
                type="number"
                defaultValue={service.basePrice}
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  if (value !== service.basePrice) updatePrice.mutate({ id: service.id, basePrice: value })
                }}
                className="mb-2 h-9 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
              />
              <p className="mb-3 text-xs text-muted">Joriy: {formatSom(service.basePrice)}</p>
              <button
                onClick={() => toggleActive.mutate({ id: service.id, active: !service.active })}
                className="text-sm font-semibold text-brand-dark hover:underline"
              >
                {service.active ? 'O‘chirish' : 'Yoqish'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
