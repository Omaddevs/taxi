import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, ChevronRight, EyeOff, FileText, Flower2, MapPin, Navigation, Phone, Shirt, ShoppingBag, Smartphone, Utensils } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, formatPhoneUz, formatSom } from '../../lib/utils'
import { googleMapsUrl } from '../../lib/geo'
import { cargoTypes, cargoVehicles } from '../../data/mock'
import { DriverHeader, DriverSheet, RouteStops, StatusBadge } from './ui'

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
const vehicleById = Object.fromEntries(cargoVehicles.map((v) => [v.id, v]))

// CargoOrder.status -> the label set StatusBadge already understands.
const STATUS_MAP = { NEW: 'NEW', CLAIMED: 'ACCEPTED', DELIVERED: 'COMPLETED', CANCELLED: 'CANCELLED' }

function ago(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daq oldin`
  if (mins < 1440) return `${Math.floor(mins / 60)} soat oldin`
  return `${Math.floor(mins / 1440)} kun oldin`
}

function tel(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`
}

export default function DriverCargo() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('open')
  const [error, setError] = useState('')
  // ?id=<cargoOrderId> — the "🌐 Saytda ochish" button in Telegram lands straight on the order.
  const openId = params.get('id')
  const setOpenId = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('id', id)
    else next.delete('id')
    setParams(next, { replace: !id })
  }

  const { data: open = [], isLoading: openLoading } = useQuery({
    queryKey: ['driver-cargo-open'],
    queryFn: () => api.get('/drivers/me/cargo-orders/open'),
    refetchInterval: 10_000,
  })
  const { data: mine = [], isLoading: mineLoading } = useQuery({
    queryKey: ['driver-cargo-mine'],
    queryFn: () => api.get('/drivers/me/cargo-orders/mine'),
    refetchInterval: 10_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-cargo-open'] })
    queryClient.invalidateQueries({ queryKey: ['driver-cargo-mine'] })
    queryClient.invalidateQueries({ queryKey: ['driver-cargo', openId] })
  }
  const onError = (err) => setError(err?.message || 'Xatolik yuz berdi')

  const claim = useMutation({
    mutationFn: (id) => api.post(`/drivers/me/cargo-orders/${id}/claim`),
    onMutate: () => setError(''),
    onSuccess: () => {
      invalidate()
      setTab('mine')
    },
    onError,
  })
  const complete = useMutation({
    mutationFn: (id) => api.post(`/drivers/me/cargo-orders/${id}/complete`),
    onMutate: () => setError(''),
    onSuccess: () => {
      invalidate()
      setOpenId(null)
    },
    onError,
  })
  const release = useMutation({
    mutationFn: (id) => api.post(`/drivers/me/cargo-orders/${id}/release`, {}),
    onMutate: () => setError(''),
    onSuccess: () => {
      invalidate()
      setOpenId(null)
    },
    onError,
  })

  const active = useMemo(() => mine.filter((o) => o.status === 'CLAIMED'), [mine])
  const history = useMemo(() => mine.filter((o) => o.status !== 'CLAIMED'), [mine])
  const list = tab === 'open' ? open : [...active, ...history]
  const loading = tab === 'open' ? openLoading : mineLoading
  const busy = claim.isPending || complete.isPending || release.isPending

  const TABS = [
    { id: 'open', label: 'Ochiq', count: open.length },
    { id: 'mine', label: 'Mening yuklarim', count: active.length },
  ]

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader title="Yuklar" />

      <div className="grid grid-cols-2 gap-1 border-b border-line px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 truncate border-b-2 pb-2.5 text-center text-[13px] font-bold outline-none ${
              tab === t.id ? 'border-brand text-ink' : 'border-transparent text-muted'
            }`}
          >
            {t.label}
            {t.count ? <span className="rounded-full bg-brand px-1.5 text-[10px] font-extrabold text-white">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3 px-4 pb-4">
        {error && !openId ? <p className="rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">{error}</p> : null}
        {loading ? (
          [0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center">
            <Box className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-ink">{tab === 'open' ? 'Hozircha ochiq yuklar yo‘q' : 'Sizda hali yuklar yo‘q'}</p>
            <p className="mt-1 text-xs text-muted">
              {tab === 'open' ? 'Yangi yuk kelganda shu yerda va Telegramda ko‘rasiz.' : '«Ochiq» bo‘limidan yuk qabul qiling.'}
            </p>
          </div>
        ) : (
          list.map((order) => <CargoCard key={order.id} order={order} onOpen={() => setOpenId(order.id)} />)
        )}
      </div>

      {openId ? (
        <CargoDetail
          id={openId}
          known={[...open, ...mine].find((o) => o.id === openId)}
          busy={busy}
          error={error}
          onClose={() => {
            setOpenId(null)
            setError('')
          }}
          onClaim={() => claim.mutate(openId)}
          onComplete={() => complete.mutate(openId)}
          onRelease={() => {
            if (window.confirm('Yukdan voz kechasizmi? U boshqa haydovchilarga qayta ochiladi.')) release.mutate(openId)
          }}
        />
      ) : null}
    </div>
  )
}

function CargoCard({ order, onOpen }) {
  const type = typeById[order.cargoType]
  const vehicle = order.vehicleType ? vehicleById[order.vehicleType] : null
  const Icon = icons[type?.icon] || Box

  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-2xl bg-white p-4 text-left shadow-[0_8px_30px_rgba(28,28,40,0.04)] active:scale-[0.99]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-brand">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{[type?.title || order.cargoType, order.weightLabel, vehicle?.title].filter(Boolean).join(' · ')}</span>
        </div>
        <StatusBadge status={STATUS_MAP[order.status] || 'PENDING'} />
      </div>

      <div className="mt-3">
        <RouteStops from={order.fromLabel} to={order.toLabel} compact />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">{ago(order.createdAt)}</span>
        <span className="flex items-center gap-1 text-[15px] font-extrabold text-ink">
          {formatSom(order.price)}
          <ChevronRight className="h-4 w-4 text-brand" />
        </span>
      </div>
    </button>
  )
}

function CargoDetail({ id, known, busy, error, onClose, onClaim, onComplete, onRelease }) {
  const { data: fetched } = useQuery({
    queryKey: ['driver-cargo', id],
    queryFn: () => api.get(`/drivers/me/cargo-orders/${id}`),
    enabled: !known,
  })
  const order = known || fetched
  const type = order ? typeById[order.cargoType] : null
  const vehicle = order?.vehicleType ? vehicleById[order.vehicleType] : null
  const mineActive = order?.status === 'CLAIMED' && !order.contactsHidden

  const footer = !order ? null : order.status === 'NEW' ? (
    <button
      type="button"
      disabled={busy}
      onClick={onClaim}
      className="flex h-13 w-full items-center justify-center rounded-2xl bg-brand text-[15px] font-extrabold text-white shadow-[0_8px_20px_rgba(0,199,212,0.35)] disabled:opacity-50"
    >
      ✅ Qabul qilish · {formatSom(order.price)}
    </button>
  ) : mineActive ? (
    <div className="grid grid-cols-3 gap-2">
      <button type="button" disabled={busy} onClick={onRelease} className="h-12 rounded-2xl border border-line text-[13px] font-bold text-muted disabled:opacity-50">
        Voz kechish
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onComplete}
        className="col-span-2 h-12 rounded-2xl bg-brand text-[14px] font-extrabold text-white disabled:opacity-50"
      >
        ✅ Yetkazildi
      </button>
    </div>
  ) : null

  return (
    <DriverSheet title="Yuk tafsilotlari" onClose={onClose} footer={footer}>
      {!order ? (
        <p className="py-10 text-center text-sm text-muted">Yuklanmoqda…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <StatusBadge status={STATUS_MAP[order.status] || 'PENDING'} />
            <span className="text-[12px] text-muted">{ago(order.createdAt)}</span>
          </div>

          <div className="rounded-2xl border border-line p-3">
            <Stop dot="bg-brand" label="Olib ketish" text={order.fromLabel} lat={order.fromLat} lng={order.fromLng} />
            <div className="ml-[5px] h-4 border-l-2 border-dashed border-line" />
            <Stop dot="bg-slate-400" label="Yetkazish" text={order.toLabel} lat={order.toLat} lng={order.toLng} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Fact label="Yuk" value={type?.title || order.cargoType} />
            <Fact label="Og‘irlik" value={order.weightLabel} />
            <Fact label="Transport" value={vehicle?.title || '—'} />
          </div>
          {order.note ? <p className="rounded-2xl bg-canvas p-3 text-[13px] text-ink">📝 {order.note}</p> : null}

          {order.contactsHidden ? (
            <p className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-[12px] font-semibold text-amber-800">
              <EyeOff className="h-4 w-4 shrink-0" /> Jo‘natuvchi va qabul qiluvchi telefonlari yukni qabul qilganingizdan keyin ochiladi.
            </p>
          ) : (
            <div className="space-y-2">
              <Contact role="Jo‘natuvchi" name={order.rider?.name || 'Mijoz'} phone={order.rider?.phone} />
              <Contact role="Qabul qiluvchi" name={order.recipientName} phone={order.recipientPhone} />
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
            <span className="text-[13px] font-semibold text-white/70">To‘lov</span>
            <span className="text-lg font-extrabold">{formatSom(order.price)}</span>
          </div>
          {error ? <p className="rounded-2xl bg-red-50 p-3 text-center text-xs font-semibold text-red-500">{error}</p> : null}
        </div>
      )}
    </DriverSheet>
  )
}

function Stop({ dot, label, text, lat, lng }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', dot)} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
        <p className="text-[14px] font-semibold text-ink">{text}</p>
      </div>
      {lat != null && lng != null ? (
        <a
          href={googleMapsUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"
          aria-label={`${label}: xaritada ochish`}
        >
          <Navigation className="h-4 w-4" />
        </a>
      ) : (
        <MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
      )}
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl bg-canvas px-2 py-2.5">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-bold text-ink">{value}</p>
    </div>
  )
}

function Contact({ role, name, phone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase text-muted">{role}</p>
        <p className="truncate text-[14px] font-bold text-ink">{name}</p>
        <p className="text-[12px] text-muted">{formatPhoneUz(phone)}</p>
      </div>
      {phone ? (
        <a href={tel(phone)} className="flex h-11 items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-bold text-white">
          <Phone className="h-4 w-4" /> Qo‘ng‘iroq
        </a>
      ) : null}
    </div>
  )
}
