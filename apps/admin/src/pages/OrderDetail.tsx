import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { SkeletonTable } from '../components/ui/EmptyState'
import { formatDateTime, formatPhoneUz } from '../lib/utils'
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '../lib/labels'
import { OrderEditModal } from '../components/listings/OrderEditModal'
import type { BotOrderRow } from '../types'
import { OrderAudienceBadge, PASSENGER_GENDER_LABEL } from '../components/listings/OrderAudienceBadge'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-bot-order', id],
    queryFn: async () => {
      const raw = await api.get<Omit<BotOrderRow, 'id' | 'orderId'> & { id: number }>(`/admin/bot-orders/${id}`)
      return { ...raw, id: String(raw.id), orderId: raw.id } as BotOrderRow
    },
  })

  const setStatus = useMutation({
    mutationFn: (status: 'OPEN' | 'CLOSED' | 'CANCELLED') => api.patch(`/admin/bot-orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bot-order', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-bot-orders'] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Holatni o‘zgartirib bo‘lmadi'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/bot-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bot-orders'] })
      navigate('/listings')
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'O‘chirib bo‘lmadi'),
  })

  if (isLoading || !order) return <SkeletonTable />

  const canPublishToggle = order.status === 'OPEN' || order.status === 'CLOSED'
  const canCancel = order.status === 'OPEN' || order.status === 'CLOSED'

  return (
    <div>
      <PageHeader
        title={`${order.fromRegion}, ${order.fromDistrict} → ${order.toRegion}, ${order.toDistrict}`}
        subtitle={order.whenText || formatDateTime(order.createdAt)}
        onBack={() => navigate('/listings')}
        action={
          <div className="flex items-center gap-2">
            <OrderAudienceBadge womenOnly={order.womenOnly} femaleOnly={order.femaleOnly} gender={order.passengerGender} />
            <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Tahrirlash
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Buyurtma</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Yo‘lovchi" value={order.passengerName} />
            <Row label="Xizmat" value={order.womenOnly ? '🌸 Ayollar uchun taxi' : 'Oddiy taxi'} />
            <Row label="Kim boradi" value={PASSENGER_GENDER_LABEL[order.passengerGender ?? ''] ?? '—'} />
            <Row label="Telefon" value={formatPhoneUz(order.passengerPhone)} />
            <Row label="Avtomobil turi" value={order.carBrand} />
            <Row label="Yo‘lovchilar" value={String(order.passengers)} />
            <Row label="Yuk" value={order.luggageSize} />
            <Row label="Manba" value={CHANNEL_LABEL[order.source] ?? order.source} />
            <Row label="Guruh/DM xabarlari" value={String(order.dispatchCount)} />
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Haydovchi</h2>
          {order.assignedDriver ? (
            <dl className="space-y-2 text-sm">
              <Row label="Ism" value={order.assignedDriver.name} />
              <Row label="Telefon" value={formatPhoneUz(order.assignedDriver.phone)} />
            </dl>
          ) : (
            <p className="text-sm text-muted">Hali hech kim qabul qilmagan</p>
          )}
          <div className="mt-5 space-y-2">
            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            {canPublishToggle ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate(order.status === 'OPEN' ? 'CLOSED' : 'OPEN')}
              >
                {order.status === 'OPEN' ? 'Yopish (unpublish)' : 'Nashr qilish (publish)'}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="danger"
                className="w-full"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate('CANCELLED')}
              >
                Elonni bekor qilish
              </Button>
            ) : null}
            <Button
              variant="danger"
              className="w-full"
              disabled={remove.isPending}
              onClick={() => {
                if (confirm('Elonni o‘chirishga ishonchingiz komilmi? Barcha guruh/DM xabarlaridan ham o‘chiriladi.'))
                  remove.mutate()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> O‘chirish
            </Button>
          </div>
        </Card>
      </div>

      <OrderEditModal open={editing} order={order} onClose={() => setEditing(false)} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  )
}
