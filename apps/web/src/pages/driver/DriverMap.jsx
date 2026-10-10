import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { formatSom } from '../../lib/utils'
import { BaseTiles } from '../../components/map/BaseTiles'
import { driverDotIcon, pinIcon } from '../../components/trip/LiveOrderMap'
import { useRateSheet } from '../../components/ui/RateSheet'
import { DriverHeader, RouteStops, StatusBadge } from './ui'
import { mergeDriverOrders, isActiveStatus, filterByWorkRegions } from './orders'
import 'leaflet/dist/leaflet.css'
import { t } from '../../i18n'

const UZ_CENTER = [41.3, 64.6]
const PASSENGER_TAGS = ['Xushmuomala', 'Vaqtida chiqdi', 'Toza va ozoda']

// Refitting on every 5s poll / GPS tick would fight a driver panning the map to look around —
// only refit when the driver's GPS readiness or the *set* of pinned order ids actually
// changes (fitKey); marker positions still update live on every render regardless.
function FitToPins({ points, fitKey }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(timer)
  }, [map])
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [48, 48] })
    else if (points.length === 1) map.setView(points[0], 14)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map])
  return null
}

export default function DriverMap() {
  const queryClient = useQueryClient()
  const { gpsFix, watchUserLocation, stopWatchingLocation, workRegions } = useApp()
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    watchUserLocation()
    return () => stopWatchingLocation()
  }, [watchUserLocation, stopWatchingLocation])

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
    () => filterByWorkRegions(mergeDriverOrders(bookings, botOrders), workRegions).filter((o) => isActiveStatus(o.status)),
    [bookings, botOrders, workRegions],
  )
  const pinned = useMemo(() => orders.filter((o) => typeof o.pickupLat === 'number' && typeof o.pickupLng === 'number'), [orders])
  const unpinned = useMemo(() => orders.filter((o) => !(typeof o.pickupLat === 'number' && typeof o.pickupLng === 'number')), [orders])
  const selected = orders.find((o) => o.id === selectedId) || null
  const myActiveOrder = orders.find((o) => o.status === 'ACCEPTED' || o.status === 'ONGOING') || null

  // Landing here right after accepting (from the orders list / nearby card) should open the
  // management sheet immediately, not require hunting for the pin — but only when nothing is
  // already selected, so it never yanks focus away from a driver who tapped something else.
  useEffect(() => {
    if (selectedId == null && myActiveOrder) setSelectedId(myActiveOrder.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, myActiveOrder?.id])

  const driverPos = gpsFix?.lat && gpsFix?.lng ? { lat: gpsFix.lat, lng: gpsFix.lng } : null
  const points = useMemo(() => {
    const pts = []
    if (driverPos) pts.push([driverPos.lat, driverPos.lng])
    for (const o of pinned) pts.push([o.pickupLat, o.pickupLng])
    return pts
  }, [driverPos, pinned])

  // Same "nothing visibly happened" gap as the order-detail page — a toast plus a spinner
  // makes every tap on this sheet visibly register instead of silently waiting for the next
  // poll to relabel something.
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return undefined
    const timerId = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timerId)
  }, [toast])
  const notify = (type, text) => setToast({ type, text })
  const { openRating, sheet: ratingSheet } = useRateSheet()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['driver-bot-orders'] })
    queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
  }
  const onErr = () => notify('error', t('Xatolik yuz berdi, qaytadan urinib ko‘ring'))

  const accept = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/accept`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma qabul qilindi'))
    },
    onError: onErr,
  })
  const claim = useMutation({
    mutationFn: (id) => api.post(`/bot-orders/driver/${id}/claim`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma qabul qilindi'))
    },
    onError: onErr,
  })
  const start = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/start`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Yo‘lovchiga xabar yuborildi: siz yo‘lga chiqdingiz'))
    },
    onError: onErr,
  })
  const complete = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/complete`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Safar yakunlandi'))
      setSelectedId(null)
    },
    onError: onErr,
  })
  const enroute = useMutation({
    mutationFn: (id) => api.post(`/bot-orders/driver/${id}/enroute`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Yo‘lovchiga xabar yuborildi: siz yo‘lga chiqdingiz'))
    },
    onError: onErr,
  })
  const finishBot = useMutation({
    mutationFn: (id) => api.post(`/bot-orders/driver/${id}/complete`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Safar yakunlandi'))
      setSelectedId(null)
    },
    onError: onErr,
  })
  const cancelBooking = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/cancel`, { reason: 'Haydovchi tomonidan bekor qilindi' }),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma bekor qilindi'))
      setSelectedId(null)
    },
    onError: onErr,
  })
  const cancelBot = useMutation({
    mutationFn: (id) => api.post(`/bot-orders/driver/${id}/cancel`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma bekor qilindi'))
      setSelectedId(null)
    },
    onError: onErr,
  })

  const busy = accept.isPending || claim.isPending || start.isPending || complete.isPending || enroute.isPending || finishBot.isPending
  const cancelling = cancelBooking.isPending || cancelBot.isPending

  function onAccept(order) {
    if (order.kind === 'bot') claim.mutate(order.botId)
    else accept.mutate(order.id)
  }

  // Bot-order completions already get a Telegram rating prompt DMed straight to the driver
  // (see taxiline-bot's perform_complete) — only native webapp bookings need it prompted here.
  function promptRatePassenger(order) {
    openRating({
      title: t('Yo‘lovchini baholang'),
      subtitle: order.rider?.name || order.rider?.phone || t('Yo‘lovchi'),
      tagOptions: PASSENGER_TAGS,
      onSubmit: ({ stars, tags, comment }) => api.post(`/bookings/${order.id}/rating`, { stars, tags, comment }),
    })
  }

  function onPrimary(order) {
    if (order.kind === 'bot') {
      if (order.status === 'ACCEPTED') enroute.mutate(order.botId)
      else finishBot.mutate(order.botId)
      return
    }
    if (order.status === 'ACCEPTED') start.mutate(order.id)
    else if (order.status === 'ONGOING') complete.mutate(order.id, { onSuccess: () => promptRatePassenger(order) })
  }

  function onCancel(order) {
    if (order.kind === 'bot') cancelBot.mutate(order.botId)
    else cancelBooking.mutate(order.id)
  }

  const primaryLabelFor = (order) =>
    order.status === 'ACCEPTED' || (order.kind === 'bot' && !order.confirmed) ? t('Yo‘lda ketdim') : t('Safarni yakunlash')

  return (
    <div className="flex h-svh flex-col bg-white">
      <DriverHeader title={t('Xarita')} />

      <div className="relative min-h-[320px] flex-1">
        <MapContainer center={driverPos ? [driverPos.lat, driverPos.lng] : UZ_CENTER} zoom={driverPos ? 14 : 6} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <BaseTiles />
          <FitToPins points={points} fitKey={`${driverPos ? 1 : 0}|${pinned.map((o) => o.id).join(',')}`} />
          {driverPos ? <Marker position={[driverPos.lat, driverPos.lng]} icon={driverDotIcon()} /> : null}
          {pinned.map((o) => (
            <Marker
              key={o.id}
              position={[o.pickupLat, o.pickupLng]}
              icon={pinIcon(selectedId === o.id ? '#1c1c28' : '#00c7d4', `#${o.code}`, selectedId === o.id ? 34 : 28)}
              eventHandlers={{ click: () => setSelectedId(o.id) }}
            />
          ))}
        </MapContainer>

        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold shadow-sm">
          {pinned.length > 0 ? t('{0} ta jonli manzil xaritada', pinned.length) : t('Hozircha jonli manzil yo‘q')}
        </div>
      </div>

      {unpinned.length > 0 ? (
        <div className="max-h-40 overflow-y-auto border-t border-line bg-white px-4 py-2">
          <p className="mb-1.5 text-[11px] font-bold text-muted">{t('Manzili aniq bo‘lmagan faol buyurtmalar')}</p>
          <div className="space-y-1.5">
            {unpinned.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedId(o.id)}
                className="flex w-full items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-left"
              >
                <span className="text-xs font-extrabold">#{o.code}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                  {o.from} → {o.to}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selected
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <button type="button" className="absolute inset-0 bg-ink/45" aria-label={t('Yopish')} onClick={() => setSelectedId(null)} />
              <div className="absolute inset-x-0 bottom-0 z-10 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.28)]">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-extrabold">#{selected.code}</p>
                  <StatusBadge status={selected.status} />
                </div>
                <RouteStops from={selected.from} fromHint={selected.fromHint} to={selected.to} toHint={selected.toHint} whenText={selected.whenText} />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-muted">
                    {selected.rider?.name || t('Yo‘lovchi')}
                    {selected.rider?.phone ? ` · ${selected.rider.phone}` : ''}
                  </p>
                  <p className="text-sm font-extrabold">{selected.price != null ? formatSom(selected.price) : t('{0} yo‘lovchi', selected.seats || 1)}</p>
                </div>
                {selected.status === 'PENDING' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAccept(selected)}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('Qabul qilish')}
                  </button>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={cancelling || busy}
                      onClick={() => onCancel(selected)}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-bold disabled:opacity-50"
                    >
                      {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} {t('Bekor qilish')}
                    </button>
                    <button
                      type="button"
                      disabled={busy || cancelling}
                      onClick={() => onPrimary(selected)}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {primaryLabelFor(selected)}
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      <div
        className={`pointer-events-none fixed inset-x-4 z-[10001] flex justify-center transition-all duration-300 ${
          toast ? 'bottom-24 opacity-100' : 'bottom-16 opacity-0'
        }`}
      >
        {toast ? (
          <div
            className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-ink'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {t(toast.text)}
          </div>
        ) : null}
      </div>

      {ratingSheet}
    </div>
  )
}
