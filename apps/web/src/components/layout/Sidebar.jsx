import {
  Bell,
  Fuel,
  Gift,
  Headset,
  Heart,
  HelpCircle,
  Home,
  Map,
  Package,
  Settings,
  Siren,
  Star,
  UserRound,
  Wallet,
  Wrench,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { BrandMark } from '../ui/Logo'
import { LanguageRow } from '../ui/LanguagePicker'
import { useApp } from '../../context/AppContext'

const items = [
  { to: '/', icon: Home, label: 'Bosh sahifa' },
  { to: '/history', icon: Star, label: 'Safarlarim' },
  { to: '/cargo', icon: Package, label: 'Yetkazish' },
  { to: '/roadside', icon: Siren, label: 'Yo‘lda yordam' },
  { to: '/map', icon: Map, label: 'Smart xarita' },
  { to: '/fuel', icon: Fuel, label: 'Yoqilg‘i' },
  { to: '/hub/auto-service', icon: Wrench, label: 'Avtoservis' },
  { to: '/drivers', icon: UserRound, label: 'Haydovchilar' },
  { to: '/favorites', icon: Heart, label: 'Sevimlilar' },
  { to: '/wallet', icon: Wallet, label: 'To‘lovlar' },
  { to: '/notifications', icon: Bell, label: 'Xabarnomalar', badge: 3 },
  { to: '/promo', icon: Gift, label: 'Promo kodlar' },
  { to: '/help', icon: HelpCircle, label: 'Yordam' },
  { to: '/settings', icon: Settings, label: 'Sozlamalar' },
]

export function Sidebar({ embedded = false }) {
  const { setDrawerOpen } = useApp()

  return (
    <aside className={`flex h-full w-[260px] flex-col bg-white px-4 py-5 ${embedded ? '' : 'border-r border-line'}`}>
      {embedded ? null : <BrandMark />}

      <nav className="mt-7 flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-brand text-white shadow-sm shadow-brand/20' : 'text-slate-600 hover:bg-canvas'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${isActive ? 'bg-white text-brand' : 'bg-red-500 text-white'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-white">
        <p className="text-sm font-bold">Haydovchi bo‘lish</p>
        <p className="mt-1 text-xs text-white/80">Daromadingizni oshiring</p>
        <NavLink
          to="/become-driver"
          onClick={() => setDrawerOpen(false)}
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          Boshlash
        </NavLink>
      </div>

      <LanguageRow className="mt-4" />
      <a href="tel:+998877353636" className="mt-3 flex items-center gap-2 px-1 text-xs text-muted">
        <Headset className="h-4 w-4 text-brand" />
        24/7 Yordam · +998 87 735 36 36
      </a>
    </aside>
  )
}
