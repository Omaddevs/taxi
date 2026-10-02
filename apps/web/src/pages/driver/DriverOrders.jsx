import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Filter, Search, ShoppingBag, Play, CheckCircle2, XCircle } from 'lucide-react'
import { RouteMap } from '../../components/trip/RouteMap'
import { api } from '../../lib/api'
import { formatSom } from '../../lib/utils'
import { useApp } from '../../context/AppContext'
import { DriverHeader, DriverSheet, DriverTabs, StatusBadge, RouteStops, SeatChips, remainingSeconds, formatMmSs, timeHm } from './ui'
import { mergeDriverOrders, isActiveStatus, filterByWorkRegions, isToday } from './orders'

const TABS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'active', label: 'Faol' },
  { id: 'done', label: 'Bajarilgan' },
  { id: 'cancel', label: 'Bekor qilingan' },
]

export default function DriverOrders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { workRegions } = useApp()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [todayOnly, setTodayOnly] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const { data: bookings = [] } = useQuery({
    queryKey: ['driver-bookings'],
    queryFn: () => api.get('/bookings?role=driver'),
    refetchInterval: 5000,
  })
  const { data: botOrders } = useQuery({
    queryKey: ['driver-bot-orders'],
    queryFn: () => api.get('/bot-orders/driver'),
    refetchInterval: 5000,
  })

  const orders = useMemo(
    () => filterByWorkRegions(mergeDriverOrders(bookings, botOrders), workRegions),
    [bookings, botOrders, workRegions],
  )
  // /drivers/me/stats only counts bookings tied to the driver's own posted ride offers — it
  // has no idea about bot/Telegram orders, so it undercounts (often to 0) whenever a driver's
  // work comes through that flow. Compute chips from the same merged list the tabs filter
  // against instead, so they always match what's actually shown below.
  const counts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter((o) => isActiveStatus(o.status)).length,
      completed: orders.filter((o) => o.status === 'COMPLETED').length,
      cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    }),
    [orders],
  )

  const filtered = orders.filter((o) => {
    if (tab === 'active' && !isActiveStatus(o.status)) return false
    if (tab === 'done' && o.status !== 'COMPLETED') return false
    if (tab === 'cancel' && o.status !== 'CANCELLED') return false
    if (todayOnly && !isToday(o.createdAt)) return false
    if (q) {
      const hay = `${o.code} ${o.from} ${o.to}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['driver-bot-orders'] })
    queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
  }

  const goToMap = () => {
    invalidate()
    navigate('/driver/map')
  }
  const accept = useMutation({ mutationFn: (id) => api.patch(`/bookings/${id}/accept`), onSuccess: goToMap })
  const reject = useMutation({ mutationFn: (id) => api.patch(`/bookings/${id}/reject`), onSuccess: invalidate })
  const claim = useMutation({ mutationFn: (id) => api.post(`/bot-orders/driver/${id}/claim`), onSuccess: goToMap })

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader
        title="Buyurtmalar"
        right={
          <button
            type="button"
            onClick={() => setTodayOnly((v) => !v)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
              todayOnly ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> {todayOnly ? 'Bugun' : 'Barchasi'}
          </button>
        }
      />

      <DriverTabs>
        {TABS.map((t) => {
          const count = t.id === 'active' ? counts.active : null
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`truncate border-b-2 pb-2.5 text-center text-[13px] font-bold outline-none ${active ? 'border-brand text-ink' : 'border-transparent text-muted'}`}
            >
              {t.label}
              {count ? ` (${count})` : ''}
            </button>
          )
        })}
      </DriverTabs>

      <div className="mt-3 flex gap-2 px-4">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl bg-slate-100 px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buyurtma raqami yoki manzil"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="relative flex h-11 items-center gap-1 rounded-2xl bg-white px-3 text-sm font-bold shadow-sm"
        >
          <Filter className="h-4 w-4" /> Filtr
          {todayOnly ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand" /> : null}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 px-4">
        <StatChip icon={ShoppingBag} color="bg-brand-soft text-brand" value={counts.all} label="Barchasi" />
        <StatChip icon={Play} color="bg-emerald-50 text-emerald-600" value={counts.active} label="Faol" />
        <StatChip icon={CheckCircle2} color="bg-sky-50 text-sky-600" value={counts.completed} label="Bajarilgan" />
        <StatChip icon={XCircle} color="bg-orange-50 text-orange-500" value={counts.cancelled} label="Bekor qilingan" />
      </div>

      <div className="mt-3 space-y-3 px-4 pb-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Buyurtmalar yo‘q.</p>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDetails={() => navigate(`/driver/orders/${order.id}`)}
              onAccept={() => (order.kind === 'bot' ? claim.mutate(order.botId) : accept.mutate(order.id))}
              onReject={() => order.kind === 'booking' && reject.mutate(order.id)}
              busy={accept.isPending || reject.isPending || claim.isPending}
            />
          ))
        )}
      </div>

      {filterOpen ? (
        <DriverSheet title="Filtr" onClose={() => setFilterOpen(false)}>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setTodayOnly(false)
                setFilterOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${
                !todayOnly ? 'bg-brand-soft text-brand' : 'bg-canvas'
              }`}
            >
              Barcha kunlar
            </button>
            <button
              type="button"
              onClick={() => {
                setTodayOnly(true)
                setFilterOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${
                todayOnly ? 'bg-brand-soft text-brand' : 'bg-canvas'
              }`}
            >
              Faqat bugun
            </button>
          </div>
        </DriverSheet>
      ) : null}
    </div>
  )
}

function StatChip({ icon: Icon, color, value, label }) {
  return (
    <div className="rounded-2xl bg-white px-1 py-2.5 text-center shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
      <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-sm font-extrabold">{value}</p>
      <p className="text-[9px] font-semibold leading-tight text-muted">{label}</p>
    </div>
  )
}

function OrderCard({ order, onDetails, onAccept, onReject, busy }) {
  const pending = order.status === 'PENDING'
  const completed = order.status === 'COMPLETED'
  const cancelled = order.status === 'CANCELLED'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onDetails()
        }
      }}
      className="cursor-pointer rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(28,28,40,0.04)] outline-none ring-brand/20 focus-visible:ring-2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold">#{order.code}</p>
        <div className="flex items-center gap-1.5">
          {pending ? <StatusBadge status="NEW" /> : null}
          <span className="text-[11px] text-muted">{timeHm(order.createdAt)}</span>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="min-w-0 flex-1">
          <RouteStops from={order.from} fromHint={order.fromHint} to={order.to} toHint={order.toHint} whenText={order.whenText} compact />
        </div>
        {isActiveStatus(order.status) ? <RouteMap className="h-20 w-28 shrink-0" from={order.from} to={order.to} /> : null}
      </div>

      {order.seatChips?.length ? <SeatChips chips={order.seatChips} /> : null}

      {pending ? (
        <PendingActions order={order} onAccept={onAccept} onReject={onReject} busy={busy} />
      ) : completed ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-extrabold">{order.price != null ? formatSom(order.price) : '—'}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDetails()
            }}
            className="rounded-xl border border-brand px-3 py-2 text-xs font-bold text-brand"
          >
            Batafsil
          </button>
        </div>
      ) : cancelled ? (
        <p className="mt-3 text-xs font-semibold text-red-500">
          {order.cancelledBy === 'driver' || order.cancelReason ? 'Haydovchi tomonidan bekor qilingan' : 'Bekor qilingan'}
        </p>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-muted">
          <span>{order.price != null ? formatSom(order.price) : `${order.seats || 1} yo‘lovchi`}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDetails()
            }}
            className="rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white"
          >
            Batafsil
          </button>
        </div>
      )}
    </article>
  )
}

function PendingActions({ order, onAccept, onReject, busy }) {
  const [left, setLeft] = useState(() => remainingSeconds(order.createdAt, 60))
  useEffect(() => {
    const id = setInterval(() => setLeft(remainingSeconds(order.createdAt, 60)), 1000)
    return () => clearInterval(id)
  }, [order.createdAt])

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between text-sm font-extrabold">
        <span>{order.price != null ? formatSom(order.price) : `${order.seats || 1} yo‘lovchi`}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onReject()
          }}
          className="h-11 rounded-2xl border border-line bg-white text-sm font-bold"
        >
          Bekor qilish
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onAccept()
          }}
          className="h-11 rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
        >
          Qabul qilish {left > 0 ? formatMmSs(left) : ''}
        </button>
      </div>
    </div>
  )
}
