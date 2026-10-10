import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Banknote, CheckCircle2, Clock, Loader2, MapPin, MessageCircle, Navigation, Phone, Play, Route, Wallet, X } from 'lucide-react'
import { LiveOrderMap } from '../../components/trip/LiveOrderMap'
import { useRateSheet } from '../../components/ui/RateSheet'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { avatarOrFallback } from '../../lib/adapters'
import { formatPhoneUz, formatSom } from '../../lib/utils'
import { googleMapsDirUrl, haversineKm, yandexMapsDirUrl } from '../../lib/geo'
import { findCity } from '../../data/uzCities'
import { DriverHeader, RouteStops, SeatChips } from './ui'
import { bookingToDriverOrder, mergeDriverOrders } from './orders'
import { OrderAudience } from '../../components/trip/OrderAudience'
import { t } from '../../i18n'

const PASSENGER_TAGS = ['Xushmuomala', 'Vaqtida chiqdi', 'Toza va ozoda']

export default function DriverOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { gpsFix, gpsStatus, requestUserLocation, watchUserLocation } = useApp()

  const { data: bookings = [] } = useQuery({
    queryKey: ['driver-bookings'],
    queryFn: () => api.get('/bookings?role=driver'),
    refetchInterval: 4000,
  })
  const { data: botOrders } = useQuery({
    queryKey: ['driver-bot-orders'],
    queryFn: () => api.get('/bot-orders/driver'),
    refetchInterval: 4000,
  })

  const orders = useMemo(() => mergeDriverOrders(bookings, botOrders), [bookings, botOrders])
  const order = orders.find((o) => o.id === id) || (id && !id.startsWith('bot-') ? bookingToDriverOrder(bookings.find((b) => b.id === id) || {}) : null)

  // Only keep the GPS watch running once location is already granted (e.g. the driver went
  // online earlier) — a first-time visitor must tap "Manzilini ko'rish" below to trigger the
  // permission prompt explicitly, rather than being asked the moment this page opens.
  useEffect(() => {
    if (gpsStatus === 'granted') watchUserLocation()
  }, [gpsStatus, watchUserLocation])

  function handleRequestLocation() {
    requestUserLocation().then((res) => {
      if (res.ok) watchUserLocation()
    })
  }

  // The backend action (and the client's SMS/Telegram notification) succeeds immediately, but
  // without this the driver's own screen gave no sign anything happened — same button, same
  // label, no spinner — until the next poll quietly relabeled it a few seconds later. A toast
  // plus an inline spinner makes each tap visibly register.
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])
  const notify = (type, text) => setToast({ type, text })
  const { openRating, sheet: ratingSheet } = useRateSheet()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['driver-bot-orders'] })
    queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
  }
  const onErr = () => notify('error', t('Xatolik yuz berdi, qaytadan urinib ko‘ring'))

  const reject = useMutation({
    mutationFn: (oid) => api.patch(`/bookings/${oid}/reject`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma bekor qilindi'))
    },
    onError: onErr,
  })
  const accept = useMutation({
    mutationFn: (oid) => api.patch(`/bookings/${oid}/accept`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma qabul qilindi'))
    },
    onError: onErr,
  })
  const claim = useMutation({
    mutationFn: (oid) => api.post(`/bot-orders/driver/${oid}/claim`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma qabul qilindi'))
    },
    onError: onErr,
  })
  const start = useMutation({
    mutationFn: (oid) => api.patch(`/bookings/${oid}/start`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Yo‘lovchiga xabar yuborildi: siz yo‘lga chiqdingiz'))
    },
    onError: onErr,
  })
  const complete = useMutation({
    mutationFn: (oid) => api.patch(`/bookings/${oid}/complete`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Safar yakunlandi'))
      promptRatePassenger()
    },
    onError: onErr,
  })
  const enroute = useMutation({
    mutationFn: (oid) => api.post(`/bot-orders/driver/${oid}/enroute`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Yo‘lovchiga xabar yuborildi: siz yo‘lga chiqdingiz'))
    },
    onError: onErr,
  })
  const finishBot = useMutation({
    mutationFn: (oid) => api.post(`/bot-orders/driver/${oid}/complete`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Safar yakunlandi'))
    },
    onError: onErr,
  })
  // Once a booking is past PENDING, /reject 409s (it only accepts PENDING) — cancelling an
  // already-accepted booking needs the separate /cancel endpoint instead.
  const cancelBooking = useMutation({
    mutationFn: (oid) => api.patch(`/bookings/${oid}/cancel`, { reason: 'Haydovchi tomonidan bekor qilindi' }),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma bekor qilindi'))
    },
    onError: onErr,
  })
  const cancelBot = useMutation({
    mutationFn: (oid) => api.post(`/bot-orders/driver/${oid}/cancel`),
    onSuccess: () => {
      invalidate()
      notify('success', t('Buyurtma bekor qilindi'))
    },
    onError: onErr,
  })

  if (!order?.from) {
    return (
      <div className="p-8 text-center text-sm text-muted">
        {t('Buyurtma topilmadi.')}
        <button type="button" className="mt-3 block w-full font-bold text-brand" onClick={() => navigate('/driver/orders')}>
          {t('Ro‘yxatga qaytish')}
        </button>
      </div>
    )
  }

  const origin = findCity(order.from)
  const dest = findCity(order.to)
  const driverPos = gpsFix?.lat && gpsFix?.lng ? { lat: gpsFix.lat, lng: gpsFix.lng } : null
  const pickupPos =
    typeof order.pickupLat === 'number' && typeof order.pickupLng === 'number'
      ? { lat: order.pickupLat, lng: order.pickupLng }
      : origin
  const km =
    driverPos && pickupPos
      ? haversineKm(driverPos, pickupPos)
      : origin && dest
        ? haversineKm(origin, dest)
        : null
  const eta = km ? Math.max(4, Math.round((km / 28) * 60)) : null
  const riderName = order.rider?.name || order.rider?.phone || t('Yo‘lovchi')
  const phone = order.rider?.phone
  const goingToDropoff = order.status === 'ONGOING' || (order.kind === 'bot' && order.confirmed)
  const navTo = goingToDropoff ? dest : pickupPos || dest
  const navQuery = goingToDropoff
    ? [order.to, order.toHint].filter(Boolean).join(', ')
    : [order.from, order.fromHint].filter(Boolean).join(', ')
  const mapsArgs = { from: driverPos, to: navTo, query: navQuery }

  function onPrimary() {
    if (order.status === 'PENDING') {
      if (order.kind === 'bot') claim.mutate(order.botId)
      else accept.mutate(order.id)
      return
    }
    if (order.kind === 'bot') {
      if (order.status === 'ACCEPTED') enroute.mutate(order.botId)
      else finishBot.mutate(order.botId)
      return
    }
    if (order.status === 'ACCEPTED') start.mutate(order.id)
    else if (order.status === 'ONGOING') complete.mutate(order.id)
  }

  const primaryLabel =
    order.status === 'PENDING'
      ? t('Qabul qilish')
      : order.status === 'ACCEPTED' || (order.kind === 'bot' && !order.confirmed)
        ? t('Yo‘lda ketdim')
        : t('Safarni yakunlash')
  const busy =
    accept.isPending ||
    claim.isPending ||
    start.isPending ||
    complete.isPending ||
    enroute.isPending ||
    finishBot.isPending
  const cancelling = reject.isPending || cancelBooking.isPending || cancelBot.isPending
  // A still-OPEN bot order isn't claimed by this driver yet — there's nothing of theirs to
  // cancel until they've actually accepted it.
  const canCancel =
    order.kind === 'bot'
      ? order.status === 'ACCEPTED' || order.status === 'ONGOING'
      : order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'ONGOING'

  // Bot-order completions already get a Telegram rating prompt DMed straight to the driver
  // (see taxiline-bot's perform_complete) — this only covers native webapp bookings, which
  // have no Telegram touchpoint at all.
  function promptRatePassenger() {
    if (order.kind === 'bot') return
    openRating({
      title: t('Yo‘lovchini baholang'),
      subtitle: riderName,
      tagOptions: PASSENGER_TAGS,
      onSubmit: ({ stars, tags, comment }) => api.post(`/bookings/${order.id}/rating`, { stars, tags, comment }),
    })
  }

  function onCancel() {
    if (!canCancel) return
    if (order.kind === 'bot') cancelBot.mutate(order.botId)
    else if (order.status === 'PENDING') reject.mutate(order.id)
    else cancelBooking.mutate(order.id)
  }

  return (
    <div className="overflow-x-clip bg-white">
      <DriverHeader
        title={t('Buyurtma #{0}', order.code)}
        right={
          <div className="flex gap-1">
            {phone ? (
              <a href={`tel:${phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas" aria-label={t('Qo‘ng‘iroq')}>
                <Phone className="h-4 w-4" />
              </a>
            ) : null}
            {order.conversationId ? (
              <button
                type="button"
                onClick={() => navigate(`/driver/messages/${order.conversationId}`)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white"
                aria-label={t('Chat')}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        }
      />

      {goingToDropoff && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' ? (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
          <Navigation className="h-4 w-4" /> {t('Yo‘lda — yo‘lovchiga xabar berildi')}
        </div>
      ) : null}

      <OrderAudience order={order} className="mx-4 mb-3" />

      <div className="grid grid-cols-4 gap-2 px-4">
        <Metric icon={Wallet} color="bg-brand-soft text-brand" label={t('Yo‘l haqi')} value={order.price != null ? formatSom(order.price) : '—'} />
        <Metric icon={Route} color="bg-sky-50 text-sky-600" label={t('Masofa')} value={km ? `${km.toFixed(1)} km` : '—'} />
        <Metric icon={Clock} color="bg-emerald-50 text-emerald-600" label={t('Kutilgan vaqt')} value={eta ? `${eta} daq` : '—'} />
        <Metric icon={Banknote} color="bg-amber-50 text-amber-600" label={t('To‘lov turi')} value="Naqd" />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 px-4">
        <div className="min-w-0 flex-1">
          <RouteStops from={order.from} fromHint={order.fromHint} to={order.to} toHint={order.toHint} whenText={order.whenText} />
          <SeatChips chips={order.seatChips} />
        </div>
        <div className="flex w-[92px] shrink-0 flex-col gap-1.5">
          <a
            href={yandexMapsDirUrl(mapsArgs)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-xl bg-[#FC3F1D] px-2 py-2 text-center text-[10px] font-extrabold leading-tight text-white"
          >
            {t('Yandex Map')}
          </a>
          <a
            href={googleMapsDirUrl(mapsArgs)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-xl bg-[#1A73E8] px-2 py-2 text-center text-[10px] font-extrabold leading-tight text-white"
          >
            {t('Google Map')}
          </a>
        </div>
      </div>

      <div className="relative mt-4 px-4">
        {driverPos ? (
          <div className="relative">
            <LiveOrderMap order={order} driverPos={driverPos} className="h-64" interactive />
            {km != null ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <span className="rounded-full bg-ink/90 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg">
                  {t('Sizdan')}{' '}{goingToDropoff ? t('manzilgacha') : t('mijozgacha')} ≈ {km.toFixed(1)} {t('km')}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-canvas p-5 text-center">
            <MapPin className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-2 text-sm font-extrabold">{t('Manzilini ko‘rish')}</p>
            <p className="mx-auto mt-1 max-w-[280px] text-xs text-muted">
              {t('Yo‘lovchigacha bo‘lgan masofani xaritada ko‘rish uchun joylashuvingizni yoqing')}
            </p>
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={gpsStatus === 'pending'}
              className="mx-auto mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {gpsStatus === 'pending' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {gpsStatus === 'denied' || gpsStatus === 'timeout' || gpsStatus === 'error' ? t('Qayta urinish') : t('Joylashuvni yoqish')}
            </button>
            {gpsStatus === 'denied' ? (
              <p className="mt-2 text-[11px] font-semibold text-red-500">
                {t('Brauzer sozlamalaridan geolokatsiyaga ruxsat bering')}
              </p>
            ) : gpsStatus === 'unsupported' ? (
              <p className="mt-2 text-[11px] font-semibold text-red-500">{t('Qurilmangiz geolokatsiyani qo‘llamaydi')}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-line p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{t('Mijoz')}</p>
        <div className="flex items-center gap-3">
          <img
            src={avatarOrFallback(order.rider?.avatarUrl, riderName)}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{riderName}</p>
            {phone ? (
              <a href={`tel:${phone}`} className="mt-0.5 block text-[15px] font-bold text-brand">
                {formatPhoneUz(phone)}
              </a>
            ) : (
              <p className="mt-0.5 text-xs text-muted">{t('Telefon raqami ko‘rsatilmagan')}</p>
            )}
          </div>
          {phone ? (
            <a href={`tel:${phone}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm shadow-brand/30" aria-label={t('Qo‘ng‘iroq qilish')}>
              <Phone className="h-4 w-4" />
            </a>
          ) : null}
          {order.conversationId ? (
            <button
              type="button"
              onClick={() => navigate(`/driver/messages/${order.conversationId}`)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas"
              aria-label={t('Chat')}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <PassengerDetails details={order.details} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 px-4">
        <button
          type="button"
          disabled={!canCancel || cancelling || busy}
          onClick={onCancel}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-bold disabled:opacity-50"
        >
          {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} {t('Bekor qilish')}
        </button>
        <button
          type="button"
          disabled={busy || cancelling || order.status === 'COMPLETED' || order.status === 'CANCELLED'}
          onClick={onPrimary}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />} {primaryLabel}
        </button>
      </div>

      <div
        className={`pointer-events-none fixed inset-x-4 z-50 flex justify-center transition-all duration-300 ${
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

function PassengerDetails({ details }) {
  if (!details) return null
  const rows = [
    details.passengers ? ['Yo‘lovchilar', `${details.passengers} kishi`] : null,
    details.seat ? ['O‘rindiq', details.seat] : null,
    details.luggage ? ['Bagaj', details.luggage] : null,
    details.car ? ['Mashina', details.car] : null,
    details.source ? ['Manba', details.source] : null,
  ].filter(Boolean)
  if (!rows.length && !details.note) return null
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-[11px] font-semibold text-muted">{t(label)}</p>
            <p className="truncate text-sm font-bold">{value}</p>
          </div>
        ))}
      </div>
      {details.note ? (
        <div className="mt-2 rounded-xl bg-canvas px-3 py-2">
          <p className="text-[11px] font-semibold text-muted">{t('Izoh')}</p>
          <p className="whitespace-pre-line text-sm">{t(details.note)}</p>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ icon: Icon, color, label, value }) {
  return (
    <div className="rounded-2xl bg-canvas px-2 py-2.5 text-center">
      <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="truncate text-[10px] font-semibold text-muted">{t(label)}</p>
      <p className="truncate text-[11px] font-extrabold">{value}</p>
    </div>
  )
}
