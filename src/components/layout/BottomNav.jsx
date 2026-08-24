import { Bookmark, Home, MessageCircle, Search, User } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

const items = [
  { to: '/', icon: Home, label: 'Bosh sahifa' },
  { to: '/favorites', icon: Bookmark, label: 'Saqlash' },
  { to: '/messages', icon: MessageCircle, label: 'Xabarlar' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const searchActive = pathname.startsWith('/ride')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <div className="relative mx-auto flex max-w-lg items-end justify-between">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <div className="w-16" />
        {items.slice(2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <button
          type="button"
          onClick={() => navigate('/ride')}
          className={`absolute left-1/2 top-[-22px] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 ${searchActive ? 'ring-4 ring-brand/25' : ''}`}
          aria-label="Taxi qidirish"
        >
          <Search className="h-7 w-7" strokeWidth={2.4} />
        </button>
      </div>
    </nav>
  )
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex w-16 flex-col items-center gap-1 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-slate-400'}`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}
