import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BellRing, Home, MessageCircle, Send, UserRound, Volume2, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LogoPin } from '../../components/ui/Logo'
import { api } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { useNewOrderAlerts } from './useNewOrderAlerts'

export function DriverLayout() {
  const { user } = useApp()
  const { pathname } = useLocation()
  const chatOpen = /^\/driver\/messages\/[^/]+$/.test(pathname)

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm font-semibold text-muted">Yuklanmoqda…</div>
    )
  }

  return (
    <div className="min-h-svh overflow-x-clip overscroll-x-none bg-canvas">
      <NewOrderBanner />
      <div className="mx-auto min-h-svh max-w-lg overflow-x-clip bg-white shadow-[0_0_80px_rgba(28,28,40,0.06)]">
        <main className={chatOpen ? 'overflow-x-clip' : 'overflow-x-clip pb-[calc(88px+env(safe-area-inset-bottom))]'}>
          <Outlet />
        </main>
      </div>
      {chatOpen ? null : <DriverNav />}
    </div>
  )
}

function NewOrderBanner() {
  const navigate = useNavigate()
  const { alert, dismiss, soundBlocked, enableSound } = useNewOrderAlerts()
  if (!alert) return null
  const { order, count } = alert
  const canAskPermission = typeof Notification !== 'undefined' && Notification.permission === 'default'

  return (
    <div className="fixed inset-x-0 top-0 z-[60] px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div
        className={`mx-auto max-w-lg animate-[slideDown_.3s_ease-out] rounded-2xl p-3 text-white shadow-2xl ${
          order.womenOnly ? 'bg-gradient-to-br from-[#d6337f] to-[#f5559a]' : 'bg-ink'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${order.womenOnly ? 'bg-white/25' : 'bg-brand'}`}>
            {order.womenOnly ? <span className="text-lg">🌸</span> : <BellRing className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">
              {order.womenOnly ? 'Ayollar uchun taxi — yangi buyurtma!' : 'TaxiLine — yangi mijoz!'}
              {count > 1 ? ` (+${count - 1})` : ''}
            </p>
            <p className="truncate text-sm text-white/80">
              {order.from} → {order.to}
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Yopish" className="rounded-full p-1 text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              dismiss()
              navigate(`/driver/orders/${order.id}`)
            }}
            className={`h-9 flex-1 rounded-xl px-3 text-sm font-extrabold ${order.womenOnly ? 'bg-white text-[#d6337f]' : 'bg-brand'}`}
          >
            Ko‘rish
          </button>
          {soundBlocked ? (
            <button type="button" onClick={enableSound} className="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-bold">
              <Volume2 className="h-4 w-4" /> Ovozni yoqish
            </button>
          ) : null}
          {canAskPermission ? (
            <button
              type="button"
              onClick={() => Notification.requestPermission().catch(() => {})}
              className="h-9 rounded-xl bg-white/10 px-3 text-sm font-bold"
            >
              Bildirishnomani yoqish
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DriverNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
  })
  const unread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0)
  const orderActive = pathname.startsWith('/driver/orders')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="relative mx-auto flex max-w-lg items-end justify-between">
        <NavItem to="/driver" icon={Home} label="Bosh sahifa" end />
        <NavItem to="/driver/post" icon={Send} label="Safar" />
        <div className="w-16" />
        <NavItem to="/driver/messages" icon={MessageCircle} label="Xabarlar" badge={unread} />
        <NavItem to="/driver/settings" icon={UserRound} label="Profil" />
        <button
          type="button"
          onClick={() => navigate('/driver/orders')}
          className={`absolute left-1/2 top-[-22px] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-lg shadow-brand/40 ${
            orderActive ? 'ring-4 ring-brand/25' : ''
          }`}
          aria-label="Buyurtma"
        >
          <LogoPin size={40} />
        </button>
      </div>
    </nav>
  )
}

function NavItem({ to, icon: Icon, label, end, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex w-16 flex-col items-center gap-1 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-slate-400'}`
      }
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge ? (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      {label}
    </NavLink>
  )
}
