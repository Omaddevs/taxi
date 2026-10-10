import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, ChevronRight, House, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { Field, Input } from '../components/ui/Input'
import { RegionPicker } from '../components/ui/SearchPickers'
import { useApp } from '../context/AppContext'
import { cargoTypes, cargoVehicles } from '../data/mock'
import { formatPlace, isRegionActive, matchRegion } from '../data/uzbekistan'
import { api } from '../lib/api'
import { CargoDetailSheet } from '../components/cargo/CargoDetailSheet'
import { MONTHS, cn, formatSom, isCompletePhoneUz, localPhoneDigitsUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import { lockScroll } from '../lib/scrollLock'

function formatAmount(n) {
  if (!n) return ''
  return new Intl.NumberFormat('uz-UZ').format(n).replace(/,/g, ' ')
}

function parseAmount(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits.slice(0, 9))
}

function formatWhen(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}, ${hh}:${mm}`
}

const weights = ['1 kg', '5 kg', '10 kg', '20 kg+']
const typeById = Object.fromEntries(cargoTypes.map((t) => [t.id, t]))

const STATUS = {
  NEW: { label: 'Kuryer qidirilmoqda', className: 'bg-amber-50 text-amber-700' },
  CLAIMED: { label: 'Haydovchi yo‘lda', className: 'bg-sky-50 text-sky-700' },
  DELIVERED: { label: 'Yetkazildi', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Bekor qilindi', className: 'bg-rose-50 text-rose-600' },
}

const BASE_BY_WEIGHT = { '1 kg': 15000, '5 kg': 25000, '10 kg': 40000, '20 kg+': 60000 }
const VEHICLE_FACTOR = { moto: 1, car: 1.6, van: 2.6 }

function SectionTitle({ title, action, onAction }) {
  return (
    <div className="mb-2.5 mt-5 flex items-center justify-between">
      <h2 className="text-[17px] font-extrabold text-ink">{title}</h2>
      {action ? (
        <button type="button" onClick={onAction} className="flex items-center gap-0.5 text-sm font-semibold text-brand">
          {action}
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function AddressRow({ dotClass, title, value, mapIcon: MapIcon, onPick, onMap }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={cn('relative z-10 h-3.5 w-3.5 shrink-0 rounded-full', dotClass)} />
      <button type="button" onClick={onPick} className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-bold text-ink">{title}</span>
        <span className={cn('mt-0.5 block truncate text-sm', value ? 'font-medium text-ink/80' : 'text-muted')}>
          {value || 'Manzilni kiriting'}
        </span>
      </button>
      <button
        type="button"
        onClick={onMap}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-soft px-3 text-sm font-bold text-brand-dark"
      >
        <MapIcon className="h-4 w-4" />
        Xarita
      </button>
    </div>
  )
}

function ChoiceCard({ item, active, onClick, className, imageClassName = 'w-14' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 flex-col items-center rounded-2xl border bg-white px-2 pb-2.5 pt-3 text-center shadow-[0_4px_16px_rgba(28,28,40,0.04)] transition',
        active ? 'border-brand bg-brand-soft/60' : 'border-transparent',
        className,
      )}
    >
      {item.image ? (
        // multiply: rasmlarning oq foni tanlangan kartaning rangli fonida ko‘rinmasligi uchun.
        <img src={item.image} alt="" className={cn('h-14 object-contain mix-blend-multiply', imageClassName)} loading="lazy" />
      ) : (
        <span className="text-[30px] leading-none" aria-hidden>
          {item.emoji}
        </span>
      )}
      <span className="mt-2 text-[13px] font-bold text-ink">{item.title}</span>
      <span className={cn('mt-0.5 text-[10.5px] leading-tight', active ? 'text-brand-dark' : 'text-muted')}>
        {item.hint}
      </span>
    </button>
  )
}

function RecentOrder({ order, onOpen }) {
  const type = typeById[order.cargoType]
  const status = STATUS[order.status] || STATUS.NEW
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_4px_16px_rgba(28,28,40,0.04)]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-[28px]" aria-hidden>
        {type?.image ? (
          <img src={type.image} alt="" className="h-12 w-12 object-contain mix-blend-multiply" loading="lazy" />
        ) : (
          type?.emoji || '📦'
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-ink">{type?.title || order.cargoType}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{order.fromLabel}</span>
        <span className="block truncate text-[13px] text-muted">{order.toLabel}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', status.className)}>{status.label}</span>
        <span className="mt-1 text-[11px] text-muted">{formatWhen(order.createdAt)}</span>
        <span className="mt-0.5 text-[15px] font-extrabold text-ink">{formatSom(order.price)}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-brand" />
    </button>
  )
}

function PromoBanner() {
  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-soft via-[#eaf8f6] to-[#d3f0eb] p-5">
      <div className="relative max-w-[60%]">
        <p className="text-lg font-extrabold leading-snug text-ink">
          Nimaligidan qat’i nazar,
          <br />
          Biz yetkazib beramiz!
        </p>
        <p className="mt-2 text-[13px] font-semibold text-brand-dark">Tezkor • Xavfsiz • Ishonchli</p>
      </div>
      <img
        src="/cargo/banner.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute bottom-2 right-3 h-[92px] w-auto max-w-[42%] object-contain object-right-bottom mix-blend-multiply"
      />
    </div>
  )
}

function OrderSheet({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return
    return lockScroll()
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.18)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Buyurtma tafsilotlari</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default function Cargo() {
  const { openLocationPicker } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // { region, place, label, lat?, lng? } — region is always one of the active REGIONS names.
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [addrOpen, setAddrOpen] = useState(null)
  const [addrNotice, setAddrNotice] = useState('')
  const [type, setType] = useState('parcel')
  const [vehicle, setVehicle] = useState('moto')
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [weight, setWeight] = useState('5 kg')
  const [amount, setAmount] = useState(0)
  const [recipientName, setRecipientName] = useState('')
  // Local 9 digits only ("87 735 36 36"); +998 is fixed in front of the input.
  const [recipientPhone, setRecipientPhone] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [note, setNote] = useState('')
  const [ok, setOk] = useState(false)

  const { data: orders = [] } = useQuery({
    queryKey: ['cargo-orders', 'mine'],
    queryFn: () => api.get('/cargo-orders/mine'),
  })
  const recent = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 2),
    [orders],
  )

  const sameCity = !from?.region || !to?.region || from.region === to.region
  const suggested = useMemo(() => {
    const base = BASE_BY_WEIGHT[weight] * VEHICLE_FACTOR[vehicle]
    const total = sameCity ? base : base + 40000
    return Math.round(total / 1000) * 1000
  }, [weight, vehicle, sameCity])

  const quick = useMemo(() => {
    const opts = [suggested - 5000, suggested, suggested + 5000, suggested + 10000].filter((n) => n >= 5000)
    return [...new Set(opts)]
  }, [suggested])

  const submit = useMutation({
    mutationFn: () =>
      api.post('/cargo-orders', {
        fromLabel: from.label,
        toLabel: to.label,
        fromRegion: from.region,
        toRegion: to.region,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
        cargoType: type,
        vehicleType: vehicle,
        weightLabel: weight,
        recipientName: recipientName.trim(),
        recipientPhone: toE164Uz(recipientPhone),
        note: note.trim() || undefined,
        price: amount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo-orders', 'mine'] })
      setSheetOpen(false)
      setRecipientPhone('')
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    },
  })

  const pickFrom = () => setAddrOpen('from')
  const pickTo = () => setAddrOpen('to')

  const pickOnMap = (side) => {
    setAddrNotice('')
    const current = side === 'from' ? from : to
    openLocationPicker({
      title: side === 'from' ? 'Qayerdan olamiz?' : 'Qayerga yetkazamiz?',
      initial: current?.lat ? current : null,
      onPick: (loc) => {
        const region = matchRegion(loc.state, loc.city, loc.label)
        if (!region || !isRegionActive(region)) {
          setAddrNotice(
            region
              ? `${region} — tez orada ishga tushadi. Hozircha Toshkent, Andijon va Samarqand.`
              : 'Bu manzil hududini aniqlab bo‘lmadi. Ro‘yxatdan tanlang.',
          )
          return
        }
        const next = { region, place: loc.label, label: formatPlace(region, loc.label), lat: loc.lat, lng: loc.lng }
        if (side === 'from') setFrom(next)
        else setTo(next)
      },
    })
  }

  const startOrder = () => {
    if (!from) return pickFrom()
    if (!to) return pickTo()
    if (!amount) setAmount(suggested)
    setSheetOpen(true)
  }

  const phoneOk = isCompletePhoneUz(recipientPhone)
  const canSubmit = from && to && amount >= 1000 && recipientName.trim() && phoneOk && !submit.isPending

  const visibleTypes = showAllTypes ? cargoTypes : cargoTypes.slice(0, 5)

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Yetkazib berish</h1>
          <p className="mt-0.5 text-[13px] text-muted">Yuklaringizni tez va ishonchli manzilga yetkazamiz</p>
        </div>
        <Link
          to="/history?tab=cargo"
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-soft px-3.5 text-sm font-bold text-brand-dark"
        >
          <CalendarCheck className="h-[18px] w-[18px]" />
          Buyurtmalarim
        </Link>
      </header>

      <div className="relative mt-4 rounded-2xl bg-white px-4 py-1 shadow-[0_6px_24px_rgba(28,28,40,0.06)]">
        {/* Dashed connector between the two route dots. */}
        <span className="absolute left-[22px] top-[38px] bottom-[38px] border-l-2 border-dashed border-brand/60" aria-hidden />
        <AddressRow dotClass="bg-brand ring-4 ring-brand/15" title="Qayerdan olamiz?" value={from?.label} mapIcon={House} onPick={pickFrom} onMap={() => pickOnMap('from')} />
        <div className="ml-7 h-px bg-line" />
        <AddressRow dotClass="bg-slate-400 ring-4 ring-slate-200" title="Qayerga yetkazamiz?" value={to?.label} mapIcon={MapPin} onPick={pickTo} onMap={() => pickOnMap('to')} />
      </div>
      {addrNotice ? (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{addrNotice}</p>
      ) : null}

      <RegionPicker
        variant="headless"
        forceSheet
        kind="from"
        label="Qayerdan"
        region={from?.region}
        place={from?.place}
        onChange={(next) => {
          setAddrNotice('')
          setFrom(next)
          if (!to) setAddrOpen('to')
        }}
        open={addrOpen === 'from'}
        onClose={() => setAddrOpen(null)}
      />
      <RegionPicker
        variant="headless"
        forceSheet
        kind="to"
        label="Qayerga"
        region={to?.region}
        place={to?.place}
        origin={from}
        onEditOrigin={() => setAddrOpen('from')}
        onChange={(next) => {
          setAddrNotice('')
          setTo(next)
        }}
        open={addrOpen === 'to'}
        onClose={() => setAddrOpen(null)}
      />

      <SectionTitle
        title="Yuk turi"
        action={showAllTypes ? 'Yig‘ish' : 'Barchasi'}
        onAction={() => setShowAllTypes((v) => !v)}
      />
      <div className={cn(showAllTypes ? 'grid grid-cols-4 gap-2 sm:grid-cols-5' : 'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1')}>
        {visibleTypes.map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            active={type === item.id}
            onClick={() => setType(item.id)}
            className={showAllTypes ? '' : 'w-[104px]'}
          />
        ))}
      </div>

      <SectionTitle title="Transport turi" />
      <div className="grid grid-cols-3 gap-2">
        {cargoVehicles.map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            active={vehicle === item.id}
            onClick={() => setVehicle(item.id)}
            imageClassName="w-20"
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={startOrder}
          className="h-14 flex-1 rounded-2xl bg-brand text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(0,199,212,0.28)] transition active:scale-[0.99]"
        >
          Buyurtma berish
        </button>
        <button
          type="button"
          onClick={() => {
            if (!amount) setAmount(suggested)
            setSheetOpen(true)
          }}
          className="flex h-14 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"
          aria-label="Qo‘shimcha sozlamalar"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>
      {ok ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-success">
          Buyurtma qabul qilindi — kuryer qidirilmoqda
        </p>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionTitle title="So‘nggi buyurtmalar" action="Barchasi" onAction={() => navigate('/history?tab=cargo')} />
          <div className="space-y-2">
            {recent.map((order) => (
              <RecentOrder key={order.id} order={order} onOpen={() => setDetailId(order.id)} />
            ))}
          </div>
        </>
      ) : null}

      <PromoBanner />
      <CargoDetailSheet orderId={detailId} onClose={() => setDetailId(null)} />

      <OrderSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-canvas p-3 text-sm">
            <p className="truncate">
              <span className="font-semibold text-muted">Qayerdan: </span>
              <button type="button" onClick={pickFrom} className="font-bold text-ink">
                {from?.label || 'Tanlang'}
              </button>
            </p>
            <p className="mt-1 truncate">
              <span className="font-semibold text-muted">Qayerga: </span>
              <button type="button" onClick={pickTo} className="font-bold text-ink">
                {to?.label || 'Tanlang'}
              </button>
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-muted">
              {typeById[type]?.image ? (
                <img
                  src={typeById[type].image}
                  alt=""
                  aria-hidden
                  className="h-7 w-7 shrink-0 object-contain mix-blend-multiply"
                />
              ) : (
                <span aria-hidden>{typeById[type]?.emoji}</span>
              )}
              <span className="min-w-0 truncate">
                {typeById[type]?.title} · {cargoVehicles.find((v) => v.id === vehicle)?.title}
              </span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">Og‘irlik</p>
            <div className="grid grid-cols-4 gap-2">
              {weights.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeight(w)}
                  className={cn('rounded-xl py-2 text-sm font-semibold', weight === w ? 'bg-brand text-white' : 'bg-canvas')}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <Field label="Qabul qiluvchi ismi">
            <Input placeholder="Ism familiya" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </Field>
          <Field label="Qabul qiluvchi telefoni">
            <div
              className={cn(
                'flex h-12 items-center gap-2 rounded-2xl border bg-white px-4 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15',
                recipientPhone && !phoneOk ? 'border-amber-300' : 'border-line',
              )}
            >
              <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-bold text-ink">🇺🇿 +998</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="87 735 36 36"
                value={maskLocalPhoneUz(recipientPhone)}
                onChange={(e) => setRecipientPhone(localPhoneDigitsUz(e.target.value))}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
            </div>
            {recipientPhone && !phoneOk ? (
              <p className="mt-1 text-[12px] font-semibold text-amber-600">Raqamni to‘liq kiriting: 9 ta raqam</p>
            ) : null}
          </Field>
          <Field label="Izoh">
            <Input placeholder="Yuk haqida qisqacha" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div>
            <p className="text-xs font-medium text-muted">Sizning narxingiz</p>
            <label className="mt-2 flex items-end gap-2 rounded-2xl bg-canvas px-4 py-3 ring-1 ring-transparent focus-within:bg-white focus-within:ring-brand/25">
              <input
                value={formatAmount(amount)}
                onChange={(e) => setAmount(parseAmount(e.target.value))}
                inputMode="numeric"
                placeholder="0"
                aria-label="Yetkazish narxi"
                className="min-w-0 flex-1 bg-transparent text-[26px] font-extrabold leading-none tracking-tight text-ink outline-none placeholder:text-slate-300"
              />
              <span className="mb-0.5 shrink-0 text-sm font-bold text-muted">so‘m</span>
            </label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {quick.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAmount(n)}
                  className={cn(
                    'rounded-2xl px-3 py-2 text-[12px] font-bold',
                    amount === n ? 'bg-brand text-white' : n === suggested ? 'bg-brand-soft text-brand' : 'bg-canvas text-ink',
                  )}
                >
                  {n === suggested ? `Taklif ${formatSom(n)}` : formatAmount(n)}
                </button>
              ))}
            </div>
          </div>

          {submit.isError ? (
            <p className="text-center text-sm font-semibold text-danger">
              {submit.error?.message || 'Xatolik yuz berdi, qaytadan urinib ko‘ring'}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
            className="h-14 w-full rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50"
          >
            {submit.isPending ? 'Yuborilmoqda…' : `${formatSom(amount || 0)} · tasdiqlash`}
          </button>
        </div>
      </OrderSheet>
    </div>
  )
}
