import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  ChevronRight,
  Flag,
  Loader2,
  Maximize2,
  Minimize2,
  PersonStanding,
  Send,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api, ApiError } from '../lib/api'
import { CARS } from '../data/cars'
import {
  PARTY_OPTIONS,
  RIDE_ACCENTS,
  buildOrderPayload,
  dayLabel,
  isSlotBookable,
  makePoint,
  partyLabel,
  pointFor,
  priceLabel,
  seatsComplete,
  seatsRequired,
  seatsSummary,
} from '../lib/ride'
import { cn } from '../lib/utils'
import { RegionPicker } from '../components/ui/SearchPickers'
import { RideRouteMap } from '../components/ride/RideRouteMap'
import { useRideRoute } from '../components/ride/useRideRoute'
import { DateTimeSheet } from '../components/ride/DateTimeSheet'
import { SeatSheet } from '../components/ride/SeatSheet'
import { FareSheet } from '../components/ride/FareSheet'
import { LandmarkSheet, LuggageSheet, SentSheet } from '../components/ride/OptionSheets'
import { t } from '../i18n'

const ANY_CAR = { id: '', tier: 'Istalgan avtomobil', title: 'Farqi yo‘q', photo: '/landing/taxi-car-sm.webp' }
const CAR_OPTIONS = [ANY_CAR, ...CARS]

const card = 'rounded-[22px] bg-white shadow-[0_6px_20px_rgba(16,42,67,0.05)]'
// Room for the pin badges, the back button and (on phones) the panel's rounded overlap.
const MAP_PADDING = { topLeft: [56, 76], bottomRight: [72, 60] }

function RouteCard({ search, onFrom, onTo, onLandmark }) {
  return (
    <div className={card}>
      <div className="flex items-center gap-1 pl-4 pr-3">
        <button type="button" onClick={onFrom} className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 text-left">
          <PersonStanding className="h-6 w-6 shrink-0 text-ink" strokeWidth={2.2} />
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-extrabold leading-tight text-ink">
              {search.fromRegion ? t(search.fromRegion) : t('Qayerdan?')}
            </span>
            {search.fromPlace ? <span className="block truncate text-[13.5px] text-muted">{search.fromPlace}</span> : null}
          </span>
        </button>
        <button
          type="button"
          onClick={onLandmark}
          className={cn(
            'h-10 shrink-0 rounded-full px-4 text-[14px] font-bold',
            search.landmark ? 'bg-ink text-white' : 'bg-canvas text-ink',
          )}
        >
          {t('Mo‘ljal')}
        </button>
      </div>
      <div className="ml-[58px] mr-4 h-px bg-line" />
      <button type="button" onClick={onTo} className="flex w-full items-center gap-3.5 py-3.5 pl-4 pr-4 text-left">
        <Flag className="h-6 w-6 shrink-0 text-ink" strokeWidth={2.2} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-extrabold leading-tight text-ink">
            {search.toRegion ? t(search.toRegion) : t('Qayerga?')}
          </span>
          {search.toPlace ? <span className="block truncate text-[13.5px] text-muted">{search.toPlace}</span> : null}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
      </button>
    </div>
  )
}

function PartyPicker({ passengers, wholeCar, onChange }) {
  const options = [...PARTY_OPTIONS.map((n) => ({ id: n, active: !wholeCar && passengers === n })), { id: 'car', active: wholeCar }]
  return (
    <div className={cn(card, 'p-1.5')}>
      <div className="flex rounded-[18px] bg-canvas p-1" role="radiogroup" aria-label={t('Yo‘lovchilar')}>
        {options.map(({ id, active }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              'h-11 whitespace-nowrap rounded-[14px] px-1.5 text-[15px] font-bold transition',
              id === 'car' ? 'flex-[2.4]' : active ? 'flex-[1.6]' : 'flex-1',
              active ? 'bg-white text-ink shadow-[0_2px_8px_rgba(16,42,67,0.1)]' : 'text-muted',
            )}
          >
            {id === 'car' ? t('Bo‘sh mashina') : active ? t('{0} kishi', id) : id}
          </button>
        ))}
      </div>
    </div>
  )
}

function CarPicker({ value, accent, onChange }) {
  return (
    <div className={cn(card, 'py-2.5')}>
      <div className="no-scrollbar flex snap-x gap-2.5 overflow-x-auto px-2.5">
        {CAR_OPTIONS.map((car) => {
          const active = car.id === (value || '')
          return (
            <button
              key={car.id || 'any'}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(car.id)}
              className={cn(
                'w-[152px] shrink-0 snap-start rounded-[18px] border-2 px-3 pb-2.5 pt-2 text-left transition',
                active ? cn('bg-white', accent.border) : 'border-transparent bg-canvas',
              )}
            >
              <span className="flex h-[62px] items-center justify-center">
                <img src={car.photo} alt="" loading="lazy" className="max-h-[62px] w-full object-contain" />
              </span>
              <span className={cn('mt-1 block truncate text-[12.5px] font-semibold', active ? accent.softText : 'text-muted')}>
                {t(car.tier)}
              </span>
              <span className="block truncate text-[15px] font-extrabold leading-tight text-ink">{t(car.title)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// The steps the main button walks through, in order.
function nextStep({ routeReady, dateReady, seatsReady, priceReady }) {
  if (!routeReady) return 'route'
  if (!dateReady) return 'date'
  if (!seatsReady) return 'seats'
  if (!priceReady) return 'fare'
  return 'send'
}

// The time and the fare are the long ones; a seat summary is short.
const CHIP_WIDTH = { date: 'flex-[1.3]', seats: 'flex-1', fare: 'flex-[1.15]' }

const STEP_LABEL = {
  route: 'Manzilni tanlang',
  date: 'Sanani tanlang',
  seats: 'O‘rindiq tanlang',
  fare: 'Narxni belgilang',
  send: 'Haydovchiga yuborish',
}

// "Taxi chaqirish": the trip on a map and one panel that collects everything a driver needs —
// who travels, which car, when, which seats and for how much — then sends the request to
// drivers (POST /bot-orders/mine). Phones get the map above a bottom panel; from `lg` up the
// map sits beside it.
export default function RideSearch() {
  const { search, setSearch, paymentMethod } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(null)
  const [mapOnly, setMapOnly] = useState(false)
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState(null)

  const women = search.service === 'women'
  const accent = women ? RIDE_ACCENTS.women : RIDE_ACCENTS.brand
  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))

  const fromPoint = pointFor(search.fromPoint, search.from)
  const toPoint = pointFor(search.toPoint, search.to)
  const { from, to, route } = useRideRoute({
    fromLat: fromPoint?.lat,
    fromLng: fromPoint?.lng,
    fromRegion: search.fromRegion,
    fromPlace: search.fromPlace,
    toLat: toPoint?.lat,
    toLng: toPoint?.lng,
    toRegion: search.toRegion,
    toPlace: search.toPlace,
  })

  const party = { passengers: search.passengers, wholeCar: search.wholeCar }
  // "Ayollar uchun Taxi" carries women only, whatever was marked before the switch.
  const seats = women ? search.seats.map((s) => ({ ...s, gender: 'FEMALE' })) : search.seats
  const required = seatsRequired(party)
  const routeReady = Boolean(search.fromRegion && search.toRegion)
  // A slot chosen a while ago may have passed since.
  const dateReady = search.dateChosen && isSlotBookable(search.date, search.time)
  const seatsReady = seatsComplete({ ...party, seats })
  const priceReady = Boolean(search.priceMode)
  const step = nextStep({ routeReady, dateReady, seatsReady, priceReady })

  const send = useMutation({
    mutationFn: () => api.post('/bot-orders/mine', buildOrderPayload({ ...search, seats }, { paymentMethod, routeKm: route?.km, to })),
    onSuccess: (data) => {
      setResult(data)
      // The request is out — the next one starts with fresh time, seats and fare.
      update({ dateChosen: false, seats: [], price: null, priceMode: '', landmark: '' })
      queryClient.invalidateQueries({ queryKey: ['bot-orders', 'mine'] })
    },
    onError: (err) => setNotice(err instanceof ApiError ? err.message : t('Xatolik yuz berdi, qayta urinib ko‘ring')),
  })

  function openStep(next) {
    setNotice('')
    if (next === 'route') setOpen(search.fromRegion ? 'to' : 'from')
    else if (next === 'send') send.mutate()
    else setOpen(next)
  }

  function setParty(id) {
    const wholeCar = id === 'car'
    const passengers = wholeCar ? search.passengers : id
    if (wholeCar === search.wholeCar && passengers === search.passengers) return
    update({
      wholeCar,
      passengers,
      seats: search.seats.slice(0, wholeCar ? search.seats.length : seatsRequired({ passengers, wholeCar })),
      // An offered fare was for the old party — ask again.
      ...(search.priceMode === 'offer' ? { price: null, priceMode: '' } : {}),
    })
  }

  const seatsText = search.wholeCar
    ? [t('Bo‘sh mashina'), seatsSummary(seats)].filter(Boolean).join(' · ')
    : seatsSummary(seats)
  const chips = [
    dateReady ? { id: 'date', icon: CalendarClock, label: `${dayLabel(search.date)}, ${search.time}`, cls: cn(accent.soft, accent.softText) } : null,
    dateReady && seatsReady && seatsText ? { id: 'seats', label: seatsText, cls: cn(accent.soft, accent.softText) } : null,
    priceReady ? { id: 'fare', label: priceLabel(search.priceMode === 'offer' ? search.price : null), cls: 'bg-emerald-50 text-emerald-700' } : null,
  ].filter(Boolean)

  const mapButton = 'flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(16,42,67,0.14)]'

  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden bg-canvas lg:h-[calc(100svh-7rem)] lg:flex-row lg:gap-5 lg:overflow-visible">
      <div className="relative min-h-[150px] flex-1 lg:min-h-0 lg:overflow-hidden lg:rounded-[32px] lg:shadow-[0_10px_40px_rgba(16,42,67,0.06)]">
        <RideRouteMap from={from} to={to} route={route} accent={accent.hex} className="absolute inset-0" padding={MAP_PADDING} />
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className={cn(mapButton, 'absolute left-4 top-[max(14px,env(safe-area-inset-top))] z-[500] lg:top-4')}
          aria-label={t('Orqaga')}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={() => setMapOnly((v) => !v)}
          className={cn(mapButton, 'absolute bottom-10 right-4 z-[500] lg:hidden')}
          aria-label={mapOnly ? t('Panelni ochish') : t('Xaritani kattalashtirish')}
          aria-pressed={mapOnly}
        >
          {mapOnly ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>

      <section className="relative z-10 -mt-6 flex max-h-[76svh] shrink-0 flex-col rounded-t-[28px] bg-canvas shadow-[0_-10px_30px_rgba(16,42,67,0.08)] lg:mt-0 lg:max-h-none lg:w-[430px] lg:rounded-none lg:bg-transparent lg:shadow-none">
        <div className="mx-auto mb-1 mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 lg:hidden" />
        <div className="no-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-2 pt-2 lg:px-0 lg:pt-0">
          {women ? (
            <div className="flex items-center gap-2 rounded-2xl bg-[#fde7f1] dark:bg-[#33192a] px-4 py-2.5 text-[13px] font-semibold text-[#c2185b]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{t('Ayollar uchun Taxi · avval ayol haydovchilarga')}</span>
              <button type="button" onClick={() => update({ service: 'all', seats: [] })} className="shrink-0 font-bold underline underline-offset-2">
                {t('Oddiy taxiga o‘tish')}
              </button>
            </div>
          ) : null}

          <RouteCard search={search} onFrom={() => setOpen('from')} onTo={() => setOpen('to')} onLandmark={() => setOpen('landmark')} />

          {mapOnly ? null : (
            <>
              <PartyPicker passengers={search.passengers} wholeCar={search.wholeCar} onChange={setParty} />
              <CarPicker value={search.car} accent={accent} onChange={(car) => update({ car })} />
            </>
          )}

          {chips.length ? (
            <div className={cn(card, 'flex gap-2 p-1.5')}>
              {chips.map(({ id, icon: Icon, label, cls }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openStep(id)}
                  className={cn('flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[14px] px-1.5 text-[13.5px] font-bold', CHIP_WIDTH[id], cls)}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {notice ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">
              {t(notice)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2.5 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 lg:px-0 lg:pb-0">
          <button
            type="button"
            onClick={() => navigate('/payment')}
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-600"
            aria-label={t('To‘lov usuli')}
          >
            <Banknote className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => openStep(step)}
            disabled={send.isPending}
            className={cn(
              'flex h-[60px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[22px] px-2 text-[16px] font-extrabold transition active:scale-[0.99] disabled:opacity-70',
              accent.solid,
              accent.glow,
            )}
          >
            {send.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : step === 'send' ? <Send className="h-5 w-5" /> : null}
            <span className="truncate">{send.isPending ? t('Yuborilmoqda…') : t(STEP_LABEL[step])}</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen('luggage')}
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[20px] bg-white text-ink shadow-[0_6px_20px_rgba(16,42,67,0.05)]"
            aria-label={t('Bagaj hajmi')}
          >
            <SlidersHorizontal className="h-6 w-6" />
          </button>
        </div>
      </section>

      <RegionPicker
        variant="headless"
        kind="from"
        label={t('Qayerdan')}
        forceSheet
        region={search.fromRegion}
        place={search.fromPlace}
        onChange={({ region, place, label, lat, lng }) =>
          update({ fromRegion: region, fromPlace: place, from: label, fromPoint: makePoint(lat, lng, label) })
        }
        open={open === 'from'}
        onToggle={() => setOpen((cur) => (cur === 'from' ? null : 'from'))}
        onClose={() => setOpen(null)}
      />
      <RegionPicker
        variant="headless"
        kind="to"
        label={t('Qayerga')}
        forceSheet
        region={search.toRegion}
        place={search.toPlace}
        origin={search.fromRegion ? { region: search.fromRegion, place: search.fromPlace } : null}
        onEditOrigin={() => setOpen('from')}
        onChange={({ region, place, label, lat, lng }) =>
          update({ toRegion: region, toPlace: place, to: label, toPoint: makePoint(lat, lng, label) })
        }
        open={open === 'to'}
        onToggle={() => setOpen((cur) => (cur === 'to' ? null : 'to'))}
        onClose={() => setOpen(null)}
      />

      <LandmarkSheet
        open={open === 'landmark'}
        onClose={() => setOpen(null)}
        accent={accent}
        value={search.landmark}
        onConfirm={(landmark) => {
          update({ landmark })
          setOpen(null)
        }}
      />
      <LuggageSheet
        open={open === 'luggage'}
        onClose={() => setOpen(null)}
        accent={accent}
        value={search.luggage}
        onChange={(luggage) => update({ luggage })}
      />
      <DateTimeSheet
        open={open === 'date'}
        onClose={() => setOpen(null)}
        accent={accent}
        date={search.date}
        time={search.dateChosen ? search.time : ''}
        party={partyLabel(party)}
        onConfirm={({ date, time }) => {
          update({ date, time, dateChosen: true })
          // Carry straight on to whatever is still missing.
          setOpen(!seatsReady ? 'seats' : !priceReady ? 'fare' : null)
        }}
      />
      <SeatSheet
        open={open === 'seats'}
        onClose={() => setOpen(null)}
        accent={accent}
        seats={seats}
        required={required}
        wholeCar={search.wholeCar}
        womenOnly={women}
        onConfirm={(picked) => {
          update({ seats: picked })
          setOpen(!priceReady ? 'fare' : null)
        }}
      />
      <FareSheet
        open={open === 'fare'}
        onClose={() => setOpen(null)}
        accent={accent}
        from={from}
        to={to}
        routeKm={route?.km}
        passengers={search.passengers}
        wholeCar={search.wholeCar}
        price={search.price}
        priceMode={search.priceMode}
        onConfirm={(fare) => {
          update(fare)
          setOpen(null)
        }}
      />
      <SentSheet
        result={result}
        womenOnly={women}
        accent={accent}
        onClose={() => setResult(null)}
        onDone={() => {
          setResult(null)
          navigate('/history')
        }}
      />
    </div>
  )
}
