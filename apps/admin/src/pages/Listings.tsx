import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Pencil, Radio, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Card } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { formatDate, formatSom, formatTime, displayName } from '../lib/utils'
import { OFFER_LABEL, OFFER_TONE, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '../lib/labels'
import { OfferEditModal } from '../components/listings/OfferEditModal'
import { OrderEditModal } from '../components/listings/OrderEditModal'
import type { BotOrderRow, CancellationStats, RideOfferRow } from '../types'
import { OrderAudienceBadge } from '../components/listings/OrderAudienceBadge'

type ListingRow = ({ kind: 'offer' } & RideOfferRow) | ({ kind: 'order' } & BotOrderRow)

function WhenCell({ iso, whenText }: { iso?: string | null; whenText?: string | null }) {
  const hint = (whenText || '').trim()
  const clock = /^\d{1,2}:\d{2}$/.test(hint) ? hint : hint && !/^\d/.test(hint) ? hint : formatTime(iso)
  return (
    <div className="leading-tight">
      <p className="font-semibold text-ink">{formatDate(iso)}</p>
      <p className="text-xs text-muted">{clock}</p>
    </div>
  )
}

function CancellationList({ title, items }: { title: string; items: CancellationStats['riders'] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Bekor qilishlar qayd etilmagan</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((row) => (
            <li key={row.user.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{displayName(row.user)}</p>
                <p className="truncate text-xs text-muted">{row.user.phone}</p>
              </div>
              <Badge tone="red">{row.count} marta</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Listings() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editingOffer, setEditingOffer] = useState<RideOfferRow | null>(null)
  const [editingOrder, setEditingOrder] = useState<BotOrderRow | null>(null)
  const [actionError, setActionError] = useState('')

  const { data: offers, isLoading: offersLoading, error: offersError } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: () => api.get<RideOfferRow[]>('/admin/offers'),
    refetchInterval: 7_000,
  })
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-bot-orders'],
    queryFn: async () => {
      const raw = await api.get<Array<Omit<BotOrderRow, 'id' | 'orderId'> & { id: number }>>('/admin/bot-orders')
      return raw.map((o) => ({ ...o, id: String(o.id), orderId: o.id }) as BotOrderRow)
    },
    refetchInterval: 7_000,
  })
  const { data: cancellations } = useQuery({
    queryKey: ['admin-cancellation-stats'],
    queryFn: () => api.get<CancellationStats>('/admin/analytics/cancellations'),
    refetchInterval: 30_000,
  })

  function reportActionError(err: unknown, fallback: string) {
    setActionError(err instanceof ApiError ? err.message : fallback)
  }

  const setOfferStatus = useMutation({
    mutationFn: (input: { id: string; status: 'ACTIVE' | 'CLOSED' }) =>
      api.patch(`/admin/offers/${input.id}/status`, { status: input.status }),
    onSuccess: (_data, input) => {
      setActionError('')
      qc.invalidateQueries({ queryKey: ['admin-offers'] })
      qc.invalidateQueries({ queryKey: ['admin-offer', input.id] })
    },
    onError: (err) => reportActionError(err, 'Holatni o‘zgartirib bo‘lmadi'),
  })
  const deleteOffer = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/offers/${id}`),
    onSuccess: (_data, id) => {
      setActionError('')
      qc.setQueryData<RideOfferRow[]>(['admin-offers'], (prev) => prev?.filter((o) => o.id !== id))
      qc.invalidateQueries({ queryKey: ['admin-offers'] })
      qc.invalidateQueries({ queryKey: ['admin-offer', id] })
    },
    onError: (err) => reportActionError(err, 'O‘chirib bo‘lmadi'),
  })
  const setOrderStatus = useMutation({
    mutationFn: (input: { orderId: number; status: 'OPEN' | 'CLOSED' }) =>
      api.patch(`/admin/bot-orders/${input.orderId}/status`, { status: input.status }),
    onSuccess: (_data, input) => {
      setActionError('')
      qc.invalidateQueries({ queryKey: ['admin-bot-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-bot-order', input.orderId] })
    },
    onError: (err) => reportActionError(err, 'Holatni o‘zgartirib bo‘lmadi'),
  })
  const deleteOrder = useMutation({
    mutationFn: (orderId: number) => api.delete(`/admin/bot-orders/${orderId}`),
    onSuccess: (_data, orderId) => {
      setActionError('')
      qc.setQueryData<BotOrderRow[]>(['admin-bot-orders'], (prev) => prev?.filter((o) => o.orderId !== orderId))
      qc.invalidateQueries({ queryKey: ['admin-bot-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-bot-order', orderId] })
    },
    onError: (err) => reportActionError(err, 'O‘chirib bo‘lmadi'),
  })

  const rows = useMemo<ListingRow[]>(() => {
    const offerRows: ListingRow[] = (offers ?? []).map((o) => ({ kind: 'offer', ...o }))
    const orderRows: ListingRow[] = (orders ?? []).map((o) => ({ kind: 'order', ...o }))
    return [...offerRows, ...orderRows].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )
  }, [offers, orders])

  const isLoading = offersLoading || ordersLoading

  const columns: Column<ListingRow>[] = [
    {
      header: 'Turi',
      cell: (r) =>
        r.kind === 'offer' ? (
          <Badge tone="pink">Haydovchi eloni</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            <Badge tone="gray">Yo‘lovchi eloni</Badge>
            <OrderAudienceBadge womenOnly={r.womenOnly} femaleOnly={r.femaleOnly} gender={r.passengerGender} />
          </div>
        ),
    },
    {
      header: 'Yo‘nalish',
      cell: (r) =>
        r.kind === 'offer' ? `${r.fromLabel} → ${r.toLabel}` : `${r.fromRegion}, ${r.fromDistrict} → ${r.toRegion}, ${r.toDistrict}`,
    },
    {
      header: 'Kim',
      cell: (r) => (r.kind === 'offer' ? displayName(r.driver.user) : r.passengerName || r.passengerPhone),
    },
    {
      header: 'Sana',
      cell: (r) =>
        r.kind === 'offer' ? (
          <WhenCell iso={r.departAt} />
        ) : (
          <WhenCell iso={r.createdAt} whenText={r.whenText} />
        ),
    },
    { header: 'Narx', cell: (r) => (r.kind === 'offer' ? formatSom(r.pricePerSeat) : '—') },
    {
      header: 'Holat',
      cell: (r) =>
        r.kind === 'offer' ? (
          <Badge tone={OFFER_TONE[r.status]}>{OFFER_LABEL[r.status]}</Badge>
        ) : (
          <Badge tone={ORDER_STATUS_TONE[r.status]}>{ORDER_STATUS_LABEL[r.status]}</Badge>
        ),
    },
    {
      header: 'Amallar',
      interactive: true,
      cell: (r) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Tahrirlash"
            onClick={() => (r.kind === 'offer' ? setEditingOffer(r) : setEditingOrder(r))}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {r.kind === 'offer' ? (
            r.status === 'ACTIVE' || r.status === 'CLOSED' ? (
              <button
                type="button"
                onClick={() => setOfferStatus.mutate({ id: r.id, status: r.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE' })}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink"
              >
                {r.status === 'ACTIVE' ? 'Yopish' : 'Nashr qilish'}
              </button>
            ) : null
          ) : r.status === 'OPEN' || r.status === 'CLOSED' ? (
            <button
              type="button"
              onClick={() => setOrderStatus.mutate({ orderId: r.orderId, status: r.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink"
            >
              {r.status === 'OPEN' ? 'Yopish' : 'Nashr qilish'}
            </button>
          ) : null}
          <button
            type="button"
            title="O‘chirish"
            disabled={deleteOffer.isPending || deleteOrder.isPending}
            onClick={() => {
              if (!confirm('Elon bazadan butunlay o‘chiriladi. Bog‘liq bronlar ham o‘chadi. Davom etasizmi?')) return
              if (r.kind === 'offer') deleteOffer.mutate(r.id)
              else deleteOrder.mutate(r.orderId)
            }}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Elonlar"
        subtitle={rows.length ? `${rows.length} ta elon · har 7 soniyada yangilanadi` : undefined}
      />

      {actionError || offersError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {actionError || (offersError instanceof ApiError ? offersError.message : 'Haydovchi elonlarini yuklab bo‘lmadi')}
        </div>
      ) : null}

      {isLoading ? (
        <SkeletonTable />
      ) : !rows.length ? (
        <EmptyState icon={Radio} title="Elonlar topilmadi" />
      ) : (
        <Table
          columns={columns}
          rows={rows}
          getRowId={(r) => `${r.kind}-${r.kind === 'offer' ? r.id : r.orderId}`}
          onRowClick={(r) => navigate(r.kind === 'offer' ? `/offers/${r.id}` : `/bot-orders/${r.orderId}`)}
        />
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CancellationList title="Ko‘p bekor qilgan haydovchilar" items={cancellations?.drivers ?? []} />
        <CancellationList title="Ko‘p bekor qilgan yo‘lovchilar" items={cancellations?.riders ?? []} />
      </div>

      <OfferEditModal open={!!editingOffer} offer={editingOffer} onClose={() => setEditingOffer(null)} />
      <OrderEditModal open={!!editingOrder} order={editingOrder} onClose={() => setEditingOrder(null)} />
    </div>
  )
}
