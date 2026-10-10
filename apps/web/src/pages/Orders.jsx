import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CarFront,
  ChevronRight,
  Clock3,
  FileText,
  MoreVertical,
  Package,
  Phone,
  Search,
  Star,
  X,
} from 'lucide-react'
import { useRateSheet } from '../components/ui/RateSheet'
import { CargoDetailSheet } from '../components/cargo/CargoDetailSheet'
import { useMyBookings } from '../lib/queries'
import { api } from '../lib/api'
import { avatarOrFallback } from '../lib/adapters'
import { shortMonth } from '../lib/utils'
import { t } from '../i18n'

const DRIVER_TAGS = ['Toza salon', 'Xushmuomala', 'Vaqtida keldi', 'Xavfsiz haydash', 'Yoqimli suhbat']
const ACTIVE = new Set(['PENDING', 'ACCEPTED', 'ONGOING'])
const SCHEDULED_AHEAD_MS = 30 * 60 * 1000
const RECENT_LIMIT = 4

const CARGO_STATUS = { NEW: 'PENDING', CLAIMED: 'ONGOING', DELIVERED: 'COMPLETED', CANCELLED: 'CANCELLED' }
const BOT_STATUS = { OPEN: 'PENDING', CLAIMED: 'ACCEPTED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' }

const ACTIVE_LABEL = {
  taxi: { PENDING: 'Tasdiq kutilmoqda', ACCEPTED: 'Haydovchi tasdiqladi', ONGOING: 'Haydovchi yo‘lda' },
  cargo: { PENDING: 'Kuryer qidirilmoqda', ACCEPTED: 'Kuryer topildi', ONGOING: 'Kuryer yo‘lda' },
}

const PAST_BADGE = {
  COMPLETED: { label: 'Bajarildi', className: 'bg-emerald-50 text-emerald-600' },
  CANCELLED: { label: 'Bekor qilingan', className: 'bg-red-50 text-red-500' },
}

const categories = [
  { id: 'all', label: 'Barchasi', icon: FileText },
  { id: 'taxi', label: 'Taxi', icon: CarFront },
  { id: 'cargo', label: 'Yetkazib berish', icon: Package },
  { id: 'scheduled', label: 'Rejalashtirilgan', icon: CalendarClock },
]

const statusTabs = [
  { id: 'active', label: 'Aktiv' },
  { id: 'COMPLETED', label: 'Bajarilgan' },
  { id: 'CANCELLED', label: 'Bekor qilingan' },
  { id: 'all', label: 'Barchasi' },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${shortMonth(d.getMonth(), { lower: true })}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Aktiv buyurtma uchun: "Bugun, 14:30" / "Ertaga, 09:00" / "12 okt, 09:00".
function formatWhen(iso) {
  const d = new Date(iso)
  const today = new Date()
  const dayDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000,
  )
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (dayDiff === 0) return t('Bugun, {0}', time)
  if (dayDiff === 1) return t('Ertaga, {0}', time)
  return formatDate(iso)
}

function formatPrice(value) {
  if (value == null) return null
  return t('{0} so‘m', new Intl.NumberFormat('uz-UZ').format(value).replace(/[, ]/g, ' '))
}

function personOf(driver) {
  if (!driver?.user) return null
  const name = driver.user.name || driver.user.phone || t('Haydovchi')
  return {
    name,
    phone: driver.user.phone,
    avatar: avatarOrFallback(driver.user.avatarUrl, name),
    rating: driver.ratingCount > 0 ? driver.ratingAvg : null,
    ratingCount: driver.ratingCount,
  }
}

function fromBooking(b) {
  return {
    key: `b-${b.id}`,
    id: b.id,
    kind: 'taxi',
    source: 'webapp',
    from: b.fromLabel,
    to: b.toLabel,
    at: b.departAt,
    price: b.totalPrice,
    status: b.status,
    person: personOf(b.rideOffer?.driver),
  }
}

function fromBotOrder(o) {
  return {
    key: `bot-${o.id}`,
    id: o.id,
    kind: 'taxi',
    source: 'bot',
    from: [o.fromRegion, o.fromDistrict].filter(Boolean).join(', '),
    to: [o.toRegion, o.toDistrict].filter(Boolean).join(', '),
    at: o.createdAt,
    price: null,
    status: BOT_STATUS[o.status] || o.status,
    person: null,
    womenOnly: Boolean(o.womenOnly),
  }
}

function fromCargo(c) {
  return {
    key: `c-${c.id}`,
    id: c.id,
    kind: 'cargo',
    source: 'cargo',
    from: c.fromLabel,
    to: c.toLabel,
    at: c.createdAt,
    price: c.price,
    status: CARGO_STATUS[c.status] || c.status,
    person: personOf(c.driver),
  }
}

function isScheduled(item) {
  return ACTIVE.has(item.status) && new Date(item.at).getTime() - Date.now() > SCHEDULED_AHEAD_MS
}

function KindIcon({ kind, large = false }) {
  if (large && kind === 'taxi') {
    return (
      <span className="flex h-[72px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-brand-soft/70">
        <img src="/cars/cobalt.png" alt="" className="w-[76px] object-contain" />
      </span>
    )
  }
  if (large) {
    return (
      <span className="flex h-[72px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-[#fff1e6]">
        <Package className="h-10 w-10 fill-[#e9b27a] text-[#b9773a]" strokeWidth={1.4} />
      </span>
    )
  }
  const Icon = kind === 'taxi' ? CarFront : Package
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
      <Icon className="h-6 w-6 fill-brand/90 text-brand" strokeWidth={1.8} />
    </span>
  )
}

function SectionHeader({ title, onSeeAll }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-[18px] font-extrabold text-ink">{t(title)}</h2>
      {onSeeAll ? (
        <button type="button" onClick={onSeeAll} className="flex items-center gap-1 text-[13px] font-semibold text-brand">
          {t('Barchasini ko‘rish')}{' '}<ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function ActiveCard({ item, onCancel, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const canCancel = item.source === 'webapp' && (item.status === 'PENDING' || item.status === 'ACCEPTED')
  const label = ACTIVE_LABEL[item.kind][item.status]
  const price = formatPrice(item.price)
  // Cargo orders open their detail sheet (progress, driver, cancel).
  const openable = item.kind === 'cargo' && onOpen

  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_30px_rgba(16,42,67,0.06)]">
      <div
        className={openable ? 'flex cursor-pointer gap-3' : 'flex gap-3'}
        onClick={openable ? () => onOpen(item) : undefined}
        role={openable ? 'button' : undefined}
        tabIndex={openable ? 0 : undefined}
        onKeyDown={openable ? (e) => e.key === 'Enter' && onOpen(item) : undefined}
      >
        <KindIcon kind={item.kind} large />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[16px] font-extrabold text-ink">{item.kind === 'taxi' ? (item.womenOnly ? t('🌸 Ayollar uchun taxi') : t('Taxi')) : t('Yetkazib berish')}</p>
            {price ? <p className="shrink-0 text-[16px] font-extrabold text-ink">{price}</p> : null}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
              {item.kind === 'taxi' ? <CarFront className="h-3.5 w-3.5 shrink-0" /> : <Package className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{t(label)}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-slate-600">{formatWhen(item.at)}</span>
          </div>
          <div className="relative mt-2 space-y-1 text-[13.5px] text-slate-600">
            <span className="absolute left-[4.5px] top-[11px] h-[calc(100%-22px)] border-l border-dashed border-brand/60" />
            <p className="flex items-center gap-2.5">
              <span className="relative h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
              <span className="truncate">{item.from}</span>
            </p>
            <p className="flex items-center gap-2.5">
              <span className="relative h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" />
              <span className="truncate">{item.to}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        {item.person ? (
          <>
            <img src={item.person.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-soft" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-[14px] font-bold text-ink">
                {t(item.person.name)}
                {item.person.rating != null ? (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-slate-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {item.person.rating.toFixed(1)}
                    <span className="font-normal text-muted">({item.person.ratingCount})</span>
                  </span>
                ) : null}
              </p>
            </div>
            {item.person.phone ? (
              <a
                href={`tel:${item.person.phone}`}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-4 text-[13px] font-semibold text-brand-dark"
              >
                <Phone className="h-4 w-4 fill-brand-dark" /> {t('Qo‘ng‘iroq')}
              </a>
            ) : null}
          </>
        ) : (
          <p className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-muted">
            <Clock3 className="h-4 w-4 shrink-0 text-brand" />
            {item.kind === 'taxi' ? t('Haydovchi javobini kuting') : t('Kuryer hali biriktirilmagan')}
          </p>
        )}
        {canCancel ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark"
              aria-label={t('Boshqa amallar')}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} />
                <div className="absolute bottom-12 right-0 z-20 w-48 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onCancel(item)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-semibold text-red-500 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" /> {t('Buyurtmani bekor qilish')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PastRow({ item, rated, onRate, onOpen }) {
  const badge = PAST_BADGE[item.status]
  const price = formatPrice(item.price)
  const canRate = item.kind === 'taxi' && item.status === 'COMPLETED' && !rated
  const content = (
    <>
      <KindIcon kind={item.kind} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">{item.kind === 'taxi' ? (item.womenOnly ? t('🌸 Ayollar uchun taxi') : t('Taxi')) : t('Yetkazib berish')}</p>
        <p className="mt-0.5 truncate text-[13px] text-slate-600">
          {item.from} <span className="text-slate-400">→</span> {item.to}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] text-muted">
          {formatDate(item.at)}
          {canRate ? <span className="font-semibold text-brand"> {t('· Baholang')}</span> : null}
          {rated ? <span className="font-semibold text-emerald-600"> {t('· Baholandi')}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {price ? <p className="text-[15px] font-extrabold text-ink">{price}</p> : null}
        {badge ? (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>{t(badge.label)}</span>
        ) : null}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </>
  )
  const className =
    'flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-[0_6px_24px_rgba(16,42,67,0.05)]'
  if (item.kind === 'cargo' && onOpen) {
    return (
      <button type="button" onClick={() => onOpen(item)} className={className}>
        {content}
      </button>
    )
  }
  return canRate ? (
    <button type="button" onClick={() => onRate(item)} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

function EmptyState({ text, cta = false }) {
  return (
    <div className="rounded-[22px] bg-white px-6 py-8 text-center shadow-[0_6px_24px_rgba(16,42,67,0.05)]">
      <p className="text-[13.5px] text-muted">{t(text)}</p>
      {cta ? (
        <Link to="/ride" className="mt-4 inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-bold text-white">
          {t('Taxi chaqirish')}
        </Link>
      ) : null}
    </div>
  )
}

export default function Orders() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [category, setCategory] = useState(() => (searchParams.get('tab') === 'cargo' ? 'cargo' : 'all'))
  const [status, setStatus] = useState('active')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [ratedKeys, setRatedKeys] = useState(() => new Set())

  const { data: bookings = [], isLoading: loadingBookings } = useMyBookings({})
  const { data: botOrders = [] } = useQuery({
    queryKey: ['bot-orders', 'mine'],
    queryFn: () => api.get('/bot-orders/mine').then((res) => res.orders),
  })
  const { data: cargoOrders = [], isLoading: loadingCargo } = useQuery({
    queryKey: ['cargo-orders', 'mine'],
    queryFn: () => api.get('/cargo-orders/mine'),
  })

  const all = useMemo(
    () =>
      [...bookings.map(fromBooking), ...botOrders.map(fromBotOrder), ...cargoOrders.map(fromCargo)].sort(
        (a, b) => new Date(b.at) - new Date(a.at),
      ),
    [bookings, botOrders, cargoOrders],
  )

  const counts = useMemo(
    () => ({
      all: all.length,
      taxi: all.filter((i) => i.kind === 'taxi').length,
      cargo: all.filter((i) => i.kind === 'cargo').length,
      scheduled: all.filter(isScheduled).length,
    }),
    [all],
  )

  const q = query.trim().toLowerCase()
  const filtered = all.filter((item) => {
    if (category === 'taxi' && item.kind !== 'taxi') return false
    if (category === 'cargo' && item.kind !== 'cargo') return false
    if (category === 'scheduled' && !isScheduled(item)) return false
    if (!q) return true
    return [item.from, item.to, item.person?.name].some((v) => v && v.toLowerCase().includes(q))
  })

  // Aktiv birinchi bo‘lib eng yaqin vaqtdagisi turadi.
  const active = filtered.filter((i) => ACTIVE.has(i.status)).sort((a, b) => new Date(a.at) - new Date(b.at))
  const past = filtered.filter((i) => !ACTIVE.has(i.status))
  const showActive = status === 'active' || status === 'all'
  const pastList =
    status === 'active' ? past.slice(0, RECENT_LIMIT) : status === 'all' ? past : past.filter((i) => i.status === status)
  const pastTitle =
    status === 'COMPLETED' ? t('Bajarilgan buyurtmalar') : status === 'CANCELLED' ? t('Bekor qilingan buyurtmalar') : t('So‘nggi buyurtmalar')

  const cancel = useMutation({
    mutationFn: (item) => api.patch(`/bookings/${item.id}/cancel`, { reason: 'Mijoz bekor qildi' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const { openRating, sheet } = useRateSheet()
  const [cargoId, setCargoId] = useState(null)
  const rate = useMutation({
    mutationFn: ({ item, stars, tags, comment }) =>
      item.source === 'bot'
        ? api.post(`/bot-orders/mine/${item.id}/rating`, { stars, tags, comment })
        : api.post(`/bookings/${item.id}/rating`, { stars, tags, comment }),
  })

  function handleCancel(item) {
    if (!window.confirm('Buyurtmani bekor qilmoqchimisiz?')) return
    cancel.mutate(item)
  }

  function handleRate(item) {
    openRating({
      title: t('Haydovchini baholang'),
      subtitle: `${item.from} → ${item.to}`,
      tagOptions: DRIVER_TAGS,
      onSubmit: async ({ stars, tags, comment }) => {
        await rate.mutateAsync({ item, stars, tags, comment })
        setRatedKeys((prev) => new Set(prev).add(item.key))
      },
    })
  }

  const loading = loadingBookings || loadingCargo

  return (
    <div className="mx-auto max-w-2xl pt-[max(0px,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">{t('Buyurtmalar')}</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">{t('Barcha buyurtmalaringiz shu yerda')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => !v)
            setQuery('')
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-[0_6px_20px_rgba(16,42,67,0.08)]"
          aria-label={searchOpen ? t('Qidiruvni yopish') : t('Qidirish')}
        >
          {searchOpen ? <X className="h-5 w-5" strokeWidth={2.4} /> : <Search className="h-5 w-5" strokeWidth={2.4} />}
        </button>
      </header>

      {searchOpen ? (
        <div className="mt-3 flex h-12 items-center gap-2 rounded-2xl bg-white px-4 shadow-[0_6px_20px_rgba(16,42,67,0.06)]">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Manzil yoki haydovchi bo‘yicha qidirish')}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      ) : null}

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map(({ id, label, icon: Icon }) => {
          const on = category === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full pl-3.5 pr-2 text-[13px] font-semibold transition-colors ${
                on ? 'bg-brand text-white shadow-[0_8px_20px_rgba(0,199,212,0.3)]' : 'bg-white text-ink shadow-[0_4px_14px_rgba(16,42,67,0.06)]'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${on ? '' : 'text-slate-600'}`} />
              {t(label)}
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  on ? 'bg-white text-brand' : 'bg-brand-soft text-brand-dark'
                }`}
              >
                {counts[id]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex gap-1.5">
        {statusTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={`h-10 flex-auto whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold transition-colors ${
              status === id ? 'bg-brand-soft text-ink' : 'bg-white text-slate-600'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-6 text-sm text-muted">{t('Yuklanmoqda…')}</p> : null}

      {!loading && showActive ? (
        <>
          <SectionHeader
            title={t('Aktiv buyurtmalar')}
            onSeeAll={status !== 'all' && active.length > 0 ? () => setStatus('all') : null}
          />
          {active.length ? (
            <div className="space-y-3">
              {active.map((item) => (
                <ActiveCard key={item.key} item={item} onCancel={handleCancel} onOpen={(i) => setCargoId(i.id)} />
              ))}
            </div>
          ) : (
            <EmptyState text={t('Hozircha aktiv buyurtma yo‘q.')} cta={status === 'active'} />
          )}
        </>
      ) : null}

      {!loading ? (
        <>
          <SectionHeader
            title={pastTitle}
            onSeeAll={status === 'active' && past.length > RECENT_LIMIT ? () => setStatus('all') : null}
          />
          {pastList.length ? (
            <div className="space-y-2.5">
              {pastList.map((item) => (
                <PastRow key={item.key} item={item} rated={ratedKeys.has(item.key)} onRate={handleRate} onOpen={(i) => setCargoId(i.id)} />
              ))}
            </div>
          ) : (
            <EmptyState text={t('Bu bo‘limda buyurtmalar yo‘q.')} />
          )}
        </>
      ) : null}

      {sheet}
      <CargoDetailSheet orderId={cargoId} onClose={() => setCargoId(null)} />
    </div>
  )
}
