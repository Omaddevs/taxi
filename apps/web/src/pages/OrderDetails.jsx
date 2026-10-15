import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Armchair,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CarFront,
  ChevronRight,
  CircleX,
  LifeBuoy,
  Luggage,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Star,
  Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api, ApiError } from '../lib/api'
import { avatarOrFallback } from '../lib/adapters'
import { BOT_SEAT_LABEL, botOrderStatus, isActiveBotOrder } from '../lib/botOrder'
import {
  LUGGAGE,
  LUGGAGE_BY_CODE,
  RIDE_ACCENTS,
  SEAT_LABEL,
  WHOLE_CAR_SEATS,
  dayLabel,
  durationLabel,
  isoDate,
  makePoint,
  priceLabel,
  seatsRequired,
} from '../lib/ride'
import { cn, formatPhoneUz, shortMonth } from '../lib/utils'
import { CARS } from '../data/cars'
import { formatPlace, matchRegion } from '../data/uzbekistan'
import { RideRouteMap } from '../components/ride/RideRouteMap'
import { useRideRoute } from '../components/ride/useRideRoute'
import { Sheet } from '../components/ride/Sheet'
import { DateTimeSheet } from '../components/ride/DateTimeSheet'
import { SeatSheet } from '../components/ride/SeatSheet'
import { FareSheet } from '../components/ride/FareSheet'
import { LandmarkSheet, LuggageSheet } from '../components/ride/OptionSheets'
import { useRateSheet } from '../components/ui/RateSheet'
import { t } from '../i18n'

const DRIVER_TAGS = ['Toza salon', 'Xushmuomala', 'Vaqtida keldi', 'Xavfsiz haydash', 'Yoqimli suhbat']
const PAYMENT_LABEL = { cash: 'Naqd', click: 'Click', payme: 'Payme', uzum: 'Uzum Bank', wallet: 'Hamyon' }

const STATUS = {
  PENDING: {
    label: 'Haydovchi qidirilmoqda',
    text: 'So‘rovingiz haydovchilarga yuborildi. Haydovchi qabul qilishi bilan sizga xabar beramiz.',
    pill: 'bg-[#fff1e8] dark:bg-[#3a2618] text-[#c2410c]',
    banner: 'bg-[#fff1e8] dark:bg-[#3a2618] text-[#9a3412]',
  },
  ACCEPTED: {
    label: 'Haydovchi topildi',
    text: 'Haydovchi siz bilan telefon orqali bog‘lanadi.',
    pill: 'bg-brand-soft text-brand-dark',
    banner: 'bg-brand-soft text-brand-dark',
  },
  ONGOING: {
    label: 'Haydovchi yo‘lda',
    text: 'Haydovchi sizni olib ketish uchun yo‘lga chiqdi.',
    pill: 'bg-brand-soft text-brand-dark',
    banner: 'bg-brand-soft text-brand-dark',
  },
  COMPLETED: {
    label: 'Safar yakunlandi',
    text: 'TaxiLine bilan safar qilganingiz uchun rahmat!',
    pill: 'bg-emerald-50 text-emerald-700',
    banner: 'bg-emerald-50 text-emerald-800',
  },
  CANCELLED: {
    label: 'Bekor qilingan',
    text: 'Xohlasangiz, shu yo‘nalishga qayta buyurtma bering.',
    pill: 'bg-red-50 text-red-600',
    banner: 'bg-red-50 text-red-700',
  },
}

const card = 'rounded-[22px] bg-white shadow-[0_6px_20px_rgba(16,42,67,0.05)]'
// The bot stores "no preference" with a plain apostrophe.
const ANY_CAR = /^farqi yo.q$/i
const pad = (n) => String(n).padStart(2, '0')
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const stamp = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${shortMonth(d.getMonth(), { lower: true })}, ${hhmm(d)}`
}
// Website requests without a district arrive as "-".
const district = (value) => (value && value !== '-' ? value : '')

function Timeline({ order, status }) {
  const cancelled = status === 'CANCELLED'
  const steps = [
    { label: 'So‘rov yuborildi', done: true, at: order.createdAt },
    {
      label: order.claimedAt || status !== 'PENDING' ? 'Haydovchi topildi' : 'Haydovchi qidirilmoqda…',
      done: Boolean(order.claimedAt) && !cancelled,
      at: order.claimedAt,
    },
    { label: 'Haydovchi yo‘lda', done: Boolean(order.confirmedAt) && !cancelled, at: order.confirmedAt },
    cancelled
      ? { label: 'Buyurtma bekor qilindi', done: true, failed: true, at: order.finishedAt }
      : { label: 'Safar yakunlandi', done: status === 'COMPLETED', at: order.finishedAt },
  ]
  const current = cancelled ? -1 : steps.findIndex((s) => !s.done)

  return (
    <div className={cn(card, 'p-4')}>
      <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{t('Buyurtma holati')}</h2>
      <ol>
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex items-start gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 ? (
              <span aria-hidden className={cn('absolute left-[11px] top-6 h-[calc(100%-22px)] w-0.5', s.done && steps[i + 1].done ? 'bg-brand' : 'bg-slate-200')} />
            ) : null}
            <span
              className={cn(
                'relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                s.failed
                  ? 'border-red-500 bg-red-500 text-white'
                  : s.done
                    ? 'border-brand bg-brand text-white'
                    : i === current
                      ? 'border-brand bg-white'
                      : 'border-slate-300 bg-white',
              )}
            >
              {s.done ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d={s.failed ? 'M3 3l6 6M9 3l-6 6' : 'M2.5 6.2l2.4 2.4 4.6-5'} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : i === current ? (
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              ) : null}
            </span>
            <span className={cn('min-w-0 flex-1 text-[15px]', s.done || i === current ? 'font-extrabold text-ink' : 'font-medium text-muted')}>
              {t(s.label)}
            </span>
            {s.at && s.done ? <span className="shrink-0 pt-0.5 text-[12.5px] text-muted">{stamp(s.at)}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3.5 px-4 py-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
        <Icon className="h-5 w-5" />
      </span>
      <span className="shrink-0 text-[14.5px] text-muted">{t(label)}</span>
      <span className="min-w-0 flex-1 text-right text-[15.5px] font-extrabold text-ink">{value}</span>
    </div>
  )
}

function ActionButton({ icon: Icon, tone = 'plain', className, children, ...props }) {
  const tones = {
    plain: 'bg-white text-brand-dark shadow-[0_6px_20px_rgba(16,42,67,0.05)]',
    outline: 'border-2 border-brand bg-white text-brand-dark',
    danger: 'border border-red-200 bg-red-50 text-red-600',
  }
  return (
    <button
      type="button"
      className={cn('flex min-h-[56px] items-center justify-center gap-2 rounded-[18px] px-3 text-[15px] font-extrabold disabled:opacity-50', tones[tone], className)}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {children}
    </button>
  )
}

const EDITS = [
  ['date', CalendarClock, 'Jo‘nash vaqti'],
  ['seats', Armchair, 'O‘rindiq'],
  ['fare', Banknote, 'Yo‘l haqqi'],
  ['luggage', Luggage, 'Bagaj'],
  ['landmark', MapPin, 'Mo‘ljal'],
]

// One ride request ("Taxi · #10"): its route on the map, where it stands, what was asked for,
// and what the passenger can still do with it — edit while nobody has taken it, cancel until
// the trip is over, order the same route again, rate the driver afterwards.
export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setSearch } = useApp()
  const [open, setOpen] = useState(null)
  const [notice, setNotice] = useState('')
  const [rated, setRated] = useState(false)
  const { openRating, sheet: ratingSheet } = useRateSheet()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['bot-orders', 'mine', id],
    queryFn: () => api.get(`/bot-orders/mine/${id}`).then((res) => res.order),
    refetchInterval: (query) => (query.state.data && !isActiveBotOrder(query.state.data) ? false : 5000),
    retry: false,
  })

  const { from, to, route } = useRideRoute({
    fromLat: order?.pickupLat ?? undefined,
    fromLng: order?.pickupLng ?? undefined,
    fromRegion: order?.fromRegion,
    fromPlace: district(order?.fromDistrict),
    toLat: order?.toLat ?? undefined,
    toLng: order?.toLng ?? undefined,
    toRegion: order?.toRegion,
    toPlace: district(order?.toDistrict),
  })

  const onDone = (data) => {
    setOpen(null)
    setNotice('')
    if (data?.order) queryClient.setQueryData(['bot-orders', 'mine', id], data.order)
    queryClient.invalidateQueries({ queryKey: ['bot-orders', 'mine'] })
  }
  const onError = (err) => {
    setOpen(null)
    setNotice(err instanceof ApiError ? err.message : t('Xatolik yuz berdi, qayta urinib ko‘ring'))
  }
  const patch = useMutation({ mutationFn: (body) => api.patch(`/bot-orders/mine/${id}`, body), onSuccess: onDone, onError })
  const cancel = useMutation({ mutationFn: () => api.post(`/bot-orders/mine/${id}/cancel`), onSuccess: onDone, onError })

  const back = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/history'))}
      className="absolute left-4 top-[max(14px,env(safe-area-inset-top))] z-[500] flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(16,42,67,0.14)] lg:top-4"
      aria-label={t('Orqaga')}
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
    </button>
  )

  if (!order) {
    return (
      <div className="relative mx-auto max-w-2xl px-4 pt-24 text-center">
        {back}
        <p className="text-sm font-semibold text-muted">{isLoading ? t('Yuklanmoqda…') : t('Buyurtma topilmadi.')}</p>
        {isError ? (
          <button type="button" className="mt-3 text-sm font-bold text-brand" onClick={() => navigate('/history')}>
            {t('Buyurtmalarga qaytish')}
          </button>
        ) : null}
      </div>
    )
  }

  const status = botOrderStatus(order)
  const meta = STATUS[status]
  const accent = order.womenOnly ? RIDE_ACCENTS.women : RIDE_ACCENTS.brand
  const departAt = order.departAt ? new Date(order.departAt) : null
  const shownAt = departAt || new Date(order.createdAt)
  const km = route?.km ?? order.routeKm
  const editable = order.status === 'OPEN'
  const cancellable = isActiveBotOrder(order)
  const party = { passengers: order.passengers, wholeCar: order.wholeCar }
  const luggageId = LUGGAGE_BY_CODE[order.luggageSize]
  const seatText = order.wholeCar
    ? t('Butun mashina')
    : order.seatPicks?.length
      ? order.seatPicks.map((s) => `${t(SEAT_LABEL[s.position])} · ${s.gender === 'MALE' ? t('Erkak') : t('Ayol')}`).join(', ')
      : t(BOT_SEAT_LABEL[order.seat] || '')

  function reorder() {
    const fromRegion = matchRegion(order.fromRegion) || order.fromRegion
    const toRegion = matchRegion(order.toRegion) || order.toRegion
    const fromPlace = district(order.fromDistrict)
    const toPlace = district(order.toDistrict)
    const fromLabel = formatPlace(fromRegion, fromPlace)
    const toLabel = formatPlace(toRegion, toPlace)
    setSearch((s) => ({
      ...s,
      service: order.womenOnly ? 'women' : 'all',
      fromRegion,
      fromPlace,
      from: fromLabel,
      fromPoint: makePoint(order.pickupLat, order.pickupLng, fromLabel),
      toRegion,
      toPlace,
      to: toLabel,
      toPoint: makePoint(order.toLat, order.toLng, toLabel),
      landmark: order.pickupText || '',
      passengers: order.wholeCar ? s.passengers : Math.min(order.passengers, WHOLE_CAR_SEATS - 1),
      wholeCar: order.wholeCar,
      luggage: luggageId || s.luggage,
      car: CARS.find((c) => c.title === order.carBrand)?.id || '',
      // A new trip needs its own time, seats and fare.
      dateChosen: false,
      seats: [],
      price: null,
      priceMode: '',
    }))
    navigate('/ride')
  }

  function rate() {
    openRating({
      title: t('Haydovchini baholang'),
      subtitle: `${order.fromRegion} → ${order.toRegion}`,
      tagOptions: DRIVER_TAGS,
      onSubmit: async (body) => {
        await api.post(`/bot-orders/mine/${id}/rating`, body)
        setRated(true)
      },
    })
  }

  const busy = patch.isPending || cancel.isPending

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative h-[40svh] min-h-[240px] overflow-hidden lg:h-[340px] lg:rounded-[28px]">
        <RideRouteMap from={from} to={to} route={route} accent={accent.hex} className="absolute inset-0" padding={{ topLeft: [44, 64], bottomRight: [44, 44] }} />
        {back}
      </div>

      <div className="relative z-10 -mt-5 space-y-3 rounded-t-[28px] bg-canvas px-4 pt-5 lg:mt-4 lg:px-0 lg:pt-0">
        <header className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[14px] text-muted">
              {order.womenOnly ? t('🌸 Ayollar uchun taxi') : t('Taxi')} · #{order.id}
            </p>
            <p className="text-[30px] font-black leading-tight tracking-tight text-ink">{hhmm(shownAt)}</p>
          </div>
          <span className={cn('mt-1 shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold', meta.pill)}>{t(meta.label)}</span>
        </header>

        <div className={cn(card, 'p-4')}>
          <div className="relative space-y-4 pl-8">
            <span aria-hidden className="absolute bottom-6 left-[6px] top-6 border-l-2 border-dashed border-brand/50" />
            <div className="relative">
              <span aria-hidden className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full bg-brand" />
              <p className="text-[18px] font-extrabold leading-tight text-ink">{district(order.fromDistrict) || order.fromRegion}</p>
              {district(order.fromDistrict) ? <p className="text-[13.5px] text-muted">{order.fromRegion}</p> : null}
            </div>
            <div className="relative">
              <span aria-hidden className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-[4px] bg-ink" />
              <p className="text-[18px] font-extrabold leading-tight text-ink">{district(order.toDistrict) || order.toRegion}</p>
              {district(order.toDistrict) ? <p className="text-[13.5px] text-muted">{order.toRegion}</p> : null}
            </div>
          </div>
          {km ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-canvas px-4 py-2.5">
                <p className="text-[17px] font-extrabold text-ink">~{Math.round(km)} {t('km')}</p>
                <p className="text-[12.5px] text-muted">{t('Masofa')}</p>
              </div>
              <div className="rounded-2xl bg-canvas px-4 py-2.5">
                <p className="text-[17px] font-extrabold text-ink">{route?.seconds ? durationLabel(route.seconds) : '—'}</p>
                <p className="text-[12.5px] text-muted">{t('Yo‘lda')}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn('rounded-[22px] px-4 py-3.5', meta.banner)}>
          <p className="text-[15.5px] font-extrabold">{status === 'CANCELLED' ? t('Buyurtma bekor qilingan') : t(meta.label)}</p>
          <p className="mt-0.5 text-[14px] leading-snug opacity-90">{t(meta.text)}</p>
        </div>

        {notice ? (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">
            {t(notice)}
          </p>
        ) : null}

        {order.driver ? (
          <div className={cn(card, 'flex items-center gap-3 p-4')}>
            <img src={avatarOrFallback(null, order.driver.name)} alt="" className="h-12 w-12 shrink-0 rounded-full ring-2 ring-brand-soft" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-extrabold text-ink">{order.driver.name}</p>
              <p className="truncate text-[13px] text-muted">{order.driver.carModel}</p>
              <p className="truncate text-[13px] font-semibold text-ink">
                {[order.driver.plate, formatPhoneUz(order.driver.phone)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <a
              href={`tel:${order.driver.phone}`}
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-[14px] font-bold text-white"
            >
              <Phone className="h-4 w-4 fill-white" /> {t('Qo‘ng‘iroq')}
            </a>
          </div>
        ) : null}

        <Timeline order={order} status={status} />

        <div className={cn(card, 'flex items-center gap-3.5 p-4')}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Banknote className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] text-muted">{t('Yo‘l haqqi')}</p>
            <p className="text-[21px] font-black leading-tight text-ink">{priceLabel(order.price)}</p>
          </div>
          <span className="shrink-0 text-[14px] font-bold text-muted">{t(PAYMENT_LABEL[order.paymentMethod] || 'Naqd')}</span>
        </div>

        <div className={cn(card, 'divide-y divide-line')}>
          <DetailRow icon={CalendarClock} label="Jo‘nash vaqti" value={departAt ? `${dayLabel(isoDate(departAt))}, ${hhmm(departAt)}` : order.whenText} />
          <DetailRow icon={Users} label="Yo‘lovchilar" value={order.wholeCar ? t('Bo‘sh mashina') : t('{0} kishi', order.passengers)} />
          <DetailRow icon={Armchair} label="O‘rindiq" value={seatText} />
          <DetailRow icon={Luggage} label="Bagaj" value={t(LUGGAGE.find((l) => l.id === luggageId)?.title || '')} />
          <DetailRow icon={CarFront} label="Avtomobil" value={ANY_CAR.test(order.carBrand || '') ? t('Farqi yo‘q') : order.carBrand} />
          <DetailRow icon={MapPin} label="Mo‘ljal" value={order.pickupText} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {editable ? (
            <ActionButton icon={Pencil} tone="outline" disabled={busy} onClick={() => setOpen('edit')} className={cancellable ? '' : 'col-span-2'}>
              {t('Tahrirlash')}
            </ActionButton>
          ) : null}
          {cancellable ? (
            <ActionButton
              icon={CircleX}
              tone="danger"
              disabled={busy}
              className={editable ? '' : 'col-span-2'}
              onClick={() => {
                if (window.confirm(t('Buyurtmani bekor qilmoqchimisiz?'))) cancel.mutate()
              }}
            >
              {cancel.isPending ? t('Bekor qilinmoqda…') : t('Bekor qilish')}
            </ActionButton>
          ) : null}
          {status === 'COMPLETED' && order.driver && !rated ? (
            <ActionButton icon={Star} tone="outline" className="col-span-2" onClick={rate}>
              {t('Haydovchini baholang')}
            </ActionButton>
          ) : null}
          <ActionButton icon={RotateCcw} onClick={reorder}>
            {t('Qayta buyurtma')}
          </ActionButton>
          <ActionButton icon={LifeBuoy} onClick={() => navigate('/help')}>
            {t('Yordam')}
          </ActionButton>
        </div>
      </div>

      <Sheet open={open === 'edit'} onClose={() => setOpen(null)} title={t('Tahrirlash')}>
        <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
          {EDITS.map(([key, Icon, label]) => (
            <button key={key} type="button" onClick={() => setOpen(key)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
              <Icon className="h-5 w-5 shrink-0 text-brand-dark" />
              <span className="min-w-0 flex-1 text-[15.5px] font-bold text-ink">{t(label)}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      </Sheet>
      <DateTimeSheet
        open={open === 'date'}
        onClose={() => setOpen(null)}
        accent={accent}
        date={isoDate(shownAt)}
        time={departAt ? hhmm(departAt) : ''}
        party={order.wholeCar ? t('Bo‘sh mashina') : t('{0} kishi', order.passengers)}
        onConfirm={(when) => patch.mutate(when)}
      />
      <SeatSheet
        open={open === 'seats'}
        onClose={() => setOpen(null)}
        accent={accent}
        seats={order.seatPicks || []}
        required={seatsRequired(party)}
        wholeCar={order.wholeCar}
        womenOnly={order.womenOnly}
        onConfirm={(seats) => patch.mutate({ seats })}
      />
      <FareSheet
        open={open === 'fare'}
        onClose={() => setOpen(null)}
        accent={accent}
        from={from}
        to={to}
        routeKm={km}
        passengers={order.passengers}
        wholeCar={order.wholeCar}
        price={order.price}
        priceMode={order.price == null ? 'negotiable' : 'offer'}
        onConfirm={({ price }) => patch.mutate({ price })}
      />
      <LuggageSheet
        open={open === 'luggage'}
        onClose={() => setOpen(null)}
        accent={accent}
        value={luggageId}
        onChange={(luggage) => patch.mutate({ luggage })}
      />
      <LandmarkSheet
        open={open === 'landmark'}
        onClose={() => setOpen(null)}
        accent={accent}
        value={order.pickupText || ''}
        onConfirm={(pickupText) => patch.mutate({ pickupText })}
      />
      {ratingSheet}
    </div>
  )
}
