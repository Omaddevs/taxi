import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, FileText, Flower2, Phone, Shirt, ShoppingBag, Smartphone, Utensils } from 'lucide-react'
import { api } from '../../lib/api'
import { formatSom } from '../../lib/utils'
import { cargoTypes } from '../../data/mock'
import { DriverHeader, RouteStops, StatusBadge } from './ui'

const icons = {
  file: FileText,
  shirt: Shirt,
  bag: ShoppingBag,
  flower: Flower2,
  utensils: Utensils,
  smartphone: Smartphone,
  box: Box,
}
const typeById = Object.fromEntries(cargoTypes.map((t) => [t.id, t]))

// CargoOrder.status -> the label set StatusBadge already understands.
const STATUS_MAP = { NEW: 'NEW', CLAIMED: 'ACCEPTED', DELIVERED: 'COMPLETED', CANCELLED: 'CANCELLED' }

const TABS = [
  { id: 'open', label: 'Ochiq' },
  { id: 'mine', label: 'Mening yuklarim' },
]

export default function DriverCargo() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('open')

  const { data: open = [], isLoading: openLoading } = useQuery({
    queryKey: ['driver-cargo-open'],
    queryFn: () => api.get('/drivers/me/cargo-orders/open'),
    refetchInterval: 5000,
  })
  const { data: mine = [], isLoading: mineLoading } = useQuery({
    queryKey: ['driver-cargo-mine'],
    queryFn: () => api.get('/drivers/me/cargo-orders/mine'),
    refetchInterval: 5000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-cargo-open'] })
    queryClient.invalidateQueries({ queryKey: ['driver-cargo-mine'] })
  }

  const claim = useMutation({
    mutationFn: (id) => api.post(`/drivers/me/cargo-orders/${id}/claim`),
    onSuccess: () => {
      invalidate()
      setTab('mine')
    },
  })
  const complete = useMutation({
    mutationFn: (id) => api.post(`/drivers/me/cargo-orders/${id}/complete`),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: (id) => api.post(`/drivers/me/cargo-orders/${id}/cancel`),
    onSuccess: invalidate,
  })

  const list = tab === 'open' ? open : mine
  const loading = tab === 'open' ? openLoading : mineLoading
  const busy = claim.isPending || complete.isPending || cancel.isPending

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader title="Yuklar" />

      <div className="grid grid-cols-2 gap-1 border-b border-line px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`truncate border-b-2 pb-2.5 text-center text-[13px] font-bold outline-none ${
              tab === t.id ? 'border-brand text-ink' : 'border-transparent text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3 px-4 pb-4">
        {claim.isError ? (
          <p className="rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">
            {claim.error?.message || 'Bu yuk allaqachon band qilingan'}
          </p>
        ) : null}
        {!loading && list.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">
            {tab === 'open' ? 'Hozircha ochiq yuklar yo‘q.' : 'Sizda hali yuklar yo‘q.'}
          </p>
        ) : (
          list.map((order) => (
            <CargoCard
              key={order.id}
              order={order}
              busy={busy}
              onClaim={() => claim.mutate(order.id)}
              onComplete={() => complete.mutate(order.id)}
              onCancel={() => cancel.mutate(order.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function CargoCard({ order, busy, onClaim, onComplete, onCancel }) {
  const type = typeById[order.cargoType]
  const Icon = icons[type?.icon] || Box

  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
          <Icon className="h-3.5 w-3.5" />
          {type?.title || order.cargoType} · {order.weightLabel}
        </div>
        <StatusBadge status={STATUS_MAP[order.status] || 'PENDING'} />
      </div>

      <div className="mt-3">
        <RouteStops from={order.fromLabel} to={order.toLabel} compact />
      </div>

      <div className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs">
        <p className="font-bold">{order.recipientName}</p>
        <p className="mt-0.5 flex items-center gap-1 text-muted">
          <Phone className="h-3 w-3" /> {order.recipientPhone}
        </p>
        {order.note ? <p className="mt-1 text-muted">{order.note}</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-extrabold">{formatSom(order.price)}</p>
        {order.status === 'NEW' ? (
          <button
            type="button"
            disabled={busy}
            onClick={onClaim}
            className="rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
          >
            Qabul qilish
          </button>
        ) : order.status === 'CLAIMED' ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-line px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              Yetkazildi
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
