import { CarFront, Home, MessageSquareText, Package, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', icon: Home, label: 'Bosh sahifa' },
  { to: '/history', icon: CarFront, label: 'Buyurtmalar' },
  { to: '/cargo', icon: Package, label: 'Yetkazib berish' },
  { to: '/messages', icon: MessageSquareText, label: 'Xabarlar' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between rounded-[22px] border border-line/70 bg-white/95 px-0.5 py-2 shadow-[0_8px_30px_rgba(16,42,67,0.12)] backdrop-blur">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
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
        `flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-semibold tracking-tight transition-colors ${
          isActive ? 'text-brand' : 'text-slate-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
          <span className="w-full truncate px-0.5 text-center">{label}</span>
          <span className={`h-1 w-1 rounded-full ${isActive ? 'bg-brand' : 'bg-transparent'}`} />
        </>
      )}
    </NavLink>
  )
}
