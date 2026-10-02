import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Card } from '../components/ui/Button'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { formatSom } from '../lib/utils'
import type { SubscriptionPlanRow } from '../types'

export default function SubscriptionPlans() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: () => api.get<SubscriptionPlanRow[]>('/admin/subscription-plans'),
  })

  const updatePlan = useMutation({
    mutationFn: (input: { id: string; patch: Partial<{ price: number; active: boolean }> }) =>
      api.patch(`/admin/subscription-plans/${input.id}`, input.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] }),
  })

  return (
    <div>
      <PageHeader title="Obuna tariflari" subtitle="Haydovchilik obunasi narxlarini boshqaring" />

      {isLoading ? (
        <SkeletonGrid count={3} />
      ) : !data?.length ? (
        <EmptyState icon={CalendarClock} title="Tariflar topilmadi" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((plan) => (
            <Card key={plan.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold text-ink">{plan.title}</p>
                {plan.active ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Faol emas</Badge>}
              </div>
              <p className="mb-3 text-sm text-muted">{plan.durationDays} kun</p>
              <label className="mb-1 block text-xs font-semibold text-muted">Narxi (so‘m)</label>
              <input
                type="number"
                defaultValue={plan.price}
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  if (value !== plan.price) updatePlan.mutate({ id: plan.id, patch: { price: value } })
                }}
                className="mb-2 h-9 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
              />
              <p className="mb-3 text-xs text-muted">Joriy: {formatSom(plan.price)}</p>
              <button
                onClick={() => updatePlan.mutate({ id: plan.id, patch: { active: !plan.active } })}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {plan.active ? 'O‘chirish' : 'Yoqish'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
