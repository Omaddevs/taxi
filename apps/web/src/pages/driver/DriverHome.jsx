import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Bell,
  Box,
  ChevronRight,
  CreditCard,
  Gift,
  History,
  Menu,
  Plus,
  Power,
  Settings,
  Star,
  Wallet,
} from 'lucide-react'
import { LogoPin, Wordmark } from '../../components/ui/Logo'
import { LiveOrderMap } from '../../components/trip/LiveOrderMap'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { avatarOrFallback } from '../../lib/adapters'
import { driverCode, formatPhoneUz, formatSom } from '../../lib/utils'
import { Toggle, RouteStops, remainingSeconds, formatMmSs } from './ui'
import { mergeDriverOrders, isActiveStatus, latestPendingOrder, filterByWorkRegions } from './orders'
import { ONLINE_PAYMENTS } from '../../lib/features'
import { SoonBadge } from '../../components/ui/SoonBadge'
import { REFERRAL_ENABLED } from '../../lib/features'
import { OrderAudience, WOMEN_CARD_CLASS } from '../../components/trip/OrderAudience'

export default function DriverHome() {
  const { user, gpsFix, watchUserLocation, stopWatchingLocation, autoAccept, workRegions, notifsEnabled } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: () => api.get('/drivers/me/stats'),
    retry: false,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['driver-bookings'],
    queryFn: () => api.get('/bookings?role=driver'),
    refetchInterval: 2000,
  })

  const { data: botOrders } = useQuery({
    queryKey: ['driver-bot-orders'],
    queryFn: () => api.get('/bot-orders/driver'),
    refetchInterval: 2000,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
  })

  const orders = useMemo(
    () => filterByWorkRegions(mergeDriverOrders(bookings, botOrders), workRegions),
    [bookings, botOrders, workRegions],
  )
  const nearby = useMemo(() => latestPendingOrder(orders), [orders])
  const extraPending = orders.filter((o) => o.status === 'PENDING' && o.id !== nearby?.id).length
  const activeCount = orders.filter((o) => isActiveStatus(o.status)).length
  const unreadNotifs = notifsEnabled ? notifications.filter((n) => !n.readAt).length : 0

  const online = stats?.online ?? user?.driver?.online ?? false
  const approved = stats?.approved ?? user?.driver?.approved ?? false

  const toggleOnline = useMutation({
    mutationFn: (next) => api.patch('/drivers/me/status', { online: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-stats'] }),
  })

  const claimBot = useMutation({
    mutationFn: (id) => api.post(`/bot-orders/driver/${id}/claim`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-bot-orders'] }),
  })
  const acceptBooking = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
    },
  })

  useEffect(() => {
    if (!online) {
      stopWatchingLocation()
      return undefined
    }
    watchUserLocation()
    const tick = () => {
      if (gpsFix?.lat && gpsFix?.lng) {
        api.patch('/drivers/me/location', { lat: gpsFix.lat, lng: gpsFix.lng }).catch(() => {})
      }
    }
    tick()
    const id = setInterval(tick, 20000)
    return () => {
      clearInterval(id)
      stopWatchingLocation()
    }
  }, [online, gpsFix?.lat, gpsFix?.lng, watchUserLocation, stopWatchingLocation])

  // 0 alongside 0 ratings means "no real ratings yet" — never a fabricated default.
  const rating = stats?.ratingAvg ?? user?.driver?.ratingAvg ?? 0
  const trips = stats?.ratingCount ?? user?.driver?.ratingCount ?? 0
  const todayEarnings = stats?.todayEarnings ?? 0
  const todayTrips = stats?.todayTrips ?? 0
  const balance = stats?.balance ?? user?.balance ?? 0
  const name = stats?.name || user?.name || user?.phone
  const avatar = avatarOrFallback(user?.avatarUrl, name)

  // Auto-accept fires silently in the background and must not yank the driver to another
  // screen — only a deliberate tap on "Qabul qilish" navigates to the map afterward.
  function onAcceptNearby(goToMap = false) {
    if (!nearby) return
    const onSuccess = goToMap ? () => navigate('/driver/map') : undefined
    if (nearby.kind === 'bot') claimBot.mutate(nearby.botId, { onSuccess })
    else acceptBooking.mutate(nearby.id, { onSuccess })
  }

  const autoTried = useRef(new Set())
  useEffect(() => {
    if (!autoAccept || !nearby || nearby.status !== 'PENDING') return
    if (autoTried.current.has(nearby.id)) return
    autoTried.current.add(nearby.id)
    onAcceptNearby(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, nearby?.id])

  return (
    <div className="overflow-x-clip bg-canvas">
      <header className="flex items-center gap-3 overflow-x-clip bg-white px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-canvas"
          aria-label="Menyu"
        >
          <Menu className="h-5 w-5" />
          {unreadNotifs ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
              {unreadNotifs}
            </span>
          ) : null}
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <LogoPin size={28} />
          <div>
            <Wordmark className="text-[15px]" />
            <p className="text-[10px] font-semibold text-muted">Haydovchi paneli</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/driver/settings')} className="relative">
          <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
        </button>
      </header>

      <div className="space-y-3 px-4 pb-4 pt-3">
        {!approved ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            Arizangiz ko‘rib chiqilmoqda. Tasdiqlangach buyurtmalar ochiladi.
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-brand to-brand-dark p-4 text-white shadow-lg shadow-brand/25">
          <p className="text-sm font-semibold text-white/80">Bugungi daromad</p>
          <p className="mt-1 text-[28px] font-extrabold leading-none tracking-tight">{formatSom(todayEarnings)}</p>
          <p className="mt-2 text-xs font-semibold text-white/80">{todayTrips} ta buyurtma</p>
          <Link
            to="/driver/stats"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-brand"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Statistika
          </Link>
          <img
            src={stats?.carImageUrl || '/cars/cobalt.png'}
            alt=""
            className="pointer-events-none absolute -bottom-2 -right-4 h-28 w-auto object-contain drop-shadow-lg"
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <p className="text-sm font-extrabold">{online ? 'Onlayn' : 'Oflayn'}</p>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {online ? 'Buyurtmalar qabul qilinyapti' : 'Buyurtmalar kelmaydi'}
            </p>
          </div>
          <Toggle
            on={online}
            disabled={toggleOnline.isPending || !approved}
            onChange={(next) => toggleOnline.mutate(next)}
          />
        </div>

        <Link
          to="/driver/post"
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_30px_rgba(28,28,40,0.04)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Plus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Yangi elon joylash</p>
            <p className="text-[11px] text-muted">Yo‘nalish, o‘rindiqlar va narxni belgilang</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/driver/rating" className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
            <p className="text-xs font-semibold text-muted">Reyting</p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-extrabold">
              {trips > 0 ? Number(rating).toFixed(1) : 'Yangi'} <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </p>
            <p className="text-[11px] text-muted">{trips} ta baho</p>
            <span className="mt-2 inline-flex items-center text-[11px] font-bold text-brand">
              Batafsil <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
          <Link to="/driver/settings" className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted">Balans</p>
                <p className="mt-1 text-lg font-extrabold leading-tight">{formatSom(balance)}</p>
                <p className="text-[11px] text-muted">Hisob raqam</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            {ONLINE_PAYMENTS ? (
              <span className="mt-2 inline-flex items-center text-[11px] font-bold text-brand">To‘ldirish +</span>
            ) : (
              <SoonBadge className="mt-2 inline-block" />
            )}
          </Link>
        </div>

        {nearby ? (
          <NearbyCard
            key={nearby.id}
            order={nearby}
            extraCount={extraPending}
            driverPos={gpsFix?.lat && gpsFix?.lng ? { lat: gpsFix.lat, lng: gpsFix.lng } : null}
            onOpen={() => navigate(`/driver/orders/${nearby.id}`)}
            onAccept={() => onAcceptNearby(true)}
            accepting={claimBot.isPending || acceptBooking.isPending}
          />
        ) : null}

        <div className="grid grid-cols-4 gap-2">
          {[
            { to: '/driver/orders', icon: History, label: 'Buyurtmalar', badge: activeCount },
            { to: '/driver/history', icon: History, label: 'Tarix' },
            { to: '/driver/wallet', icon: CreditCard, label: "To‘lovlar" },
            { to: '/driver/settings', icon: Settings, label: 'Sozlamalar' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-white px-1 py-3 text-center shadow-[0_8px_30px_rgba(28,28,40,0.04)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <item.icon className="h-4 w-4" />
              </span>
              {item.badge ? (
                <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
              <span className="text-[10px] font-bold leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>

        {REFERRAL_ENABLED ? (
          <Link
            to="/driver/refer"
            className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Gift className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">Do‘stingizni taklif qiling</p>
              <p className="text-[11px] text-muted">Har bir tasdiqlangan do‘st uchun bonus oling</p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500" />
          </Link>
        ) : (
          <div aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 opacity-80">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Gift className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink/60">Do‘stingizni taklif qiling</p>
              <p className="text-[11px] text-muted">Taklif bonuslari tez orada ishga tushadi</p>
            </div>
            <SoonBadge />
          </div>
        )}

        <button
          type="button"
          disabled={toggleOnline.isPending || !online}
          onClick={() => toggleOnline.mutate(false)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
        >
          <Power className="h-4 w-4" /> Onlayn rejimdan chiqish
        </button>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="font-extrabold">{name}</p>
                <p className="text-xs text-muted">{formatPhoneUz(user.phone)}</p>
                <p className="text-[11px] font-bold text-brand">{driverCode(user.id)}</p>
              </div>
            </div>
            <div className="mt-6 space-y-1">
              {[
                { to: '/driver/orders', label: 'Buyurtmalar', icon: History },
                { to: '/driver/cargo', label: 'Yuklar', icon: Box },
                { to: '/driver/stats', label: 'Statistika', icon: BarChart3 },
                { to: '/driver/rating', label: 'Reyting', icon: Star },
                ...(REFERRAL_ENABLED ? [{ to: '/driver/refer', label: 'Do‘st taklif qilish', icon: Gift }] : []),
                { to: '/driver/notifications', label: 'Bildirishnomalar', icon: Bell },
                { to: '/driver/settings', label: 'Sozlamalar', icon: Settings },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-semibold hover:bg-canvas"
                >
                  <item.icon className="h-4 w-4 text-brand" /> {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NearbyCard({ order, extraCount = 0, driverPos, onOpen, onAccept, accepting }) {
  const [left, setLeft] = useState(() => remainingSeconds(order.createdAt, 60))
  useEffect(() => {
    const id = setInterval(() => setLeft(remainingSeconds(order.createdAt, 60)), 1000)
    return () => clearInterval(id)
  }, [order.createdAt])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`cursor-pointer rounded-2xl bg-white p-4 text-left shadow-[0_8px_30px_rgba(28,28,40,0.04)] outline-none ring-brand/20 focus-visible:ring-2 ${
        order.womenOnly ? WOMEN_CARD_CLASS : ''
      }`}
    >
      <OrderAudience order={order} className="mb-2" />
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-extrabold">Yaqin buyurtma</p>
        <span className="animate-pulse rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">Yangi</span>
      </div>
      <LiveOrderMap order={order} driverPos={driverPos} className="pointer-events-none h-28" />
      <p className="mt-2 text-xs font-bold text-muted">Masofa yo‘nalish bo‘yicha</p>
      <div className="mt-2">
        <RouteStops from={order.from} fromHint={order.fromHint} to={order.to} toHint={order.toHint} whenText={order.whenText} compact />
      </div>
      <button
        type="button"
        disabled={accepting}
        onClick={(e) => {
          e.stopPropagation()
          onAccept()
        }}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
      >
        Qabul qilish
      </button>
      <p className="mt-1.5 text-center text-[11px] font-bold text-brand">
        {left > 0 ? formatMmSs(left) : 'Yangi buyurtma'}
        {extraCount > 0 ? ` · yana ${extraCount} ta yangi` : ''}
      </p>
    </div>
  )
}
