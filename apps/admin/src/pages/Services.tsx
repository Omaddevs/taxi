import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Card } from '../components/ui/Button'
import { formatSom } from '../lib/utils'
import type { ServiceRow } from '../types'

export default function Services() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get<ServiceRow[]>('/admin/services'),
  })

  const updatePrice = useMutation({
    mutationFn: (input: { id: string; basePrice: number }) => api.patch(`/admin/services/${input.id}`, { basePrice: input.basePrice }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  })

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => api.patch(`/admin/services/${input.id}`, { active: input.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  })

  return (
    <div>
      <PageHeader title="Xizmat turlari" subtitle="Narxlar va faollik holatini boshqarish" />
      {isLoading ? (
        <p className="text-muted">Yuklanmoqda…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((service) => (
            <Card key={service.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold text-ink">{service.title}</p>
                {service.active ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Faol emas</Badge>}
              </div>
              <p className="mb-3 text-sm text-muted">{service.description}</p>
              <label className="mb-1 block text-xs font-semibold text-muted">Boshlang‘ich narx</label>
              <input
                type="number"
                defaultValue={service.basePrice}
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  if (value !== service.basePrice) updatePrice.mutate({ id: service.id, basePrice: value })
                }}
                className="mb-3 h-9 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
              />
              <p className="mb-3 text-xs text-muted">Joriy: {formatSom(service.basePrice)}</p>
              <button
                onClick={() => toggleActive.mutate({ id: service.id, active: !service.active })}
                className="text-sm font-semibold text-brand hover:underline"
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
