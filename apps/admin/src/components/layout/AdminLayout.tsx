import { NavLink, Navigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardCheck,
  Route,
  Tag,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { Logo } from '../ui/Logo'

const NAV = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Foydalanuvchilar', icon: Users },
  { to: '/drivers', label: 'Haydovchilar', icon: Car },
  { to: '/drivers/applications', label: 'Arizalar', icon: ClipboardCheck },
  { to: '/bookings', label: 'Bronlar', icon: Route },
  { to: '/offers', label: 'Reyslar', icon: Route },
  { to: '/services', label: 'Xizmatlar', icon: BarChart3 },
  { to: '/promo', label: 'Promo kodlar', icon: Tag },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
]

export function AdminLayout() {
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <Logo />
          <span className="text-sm font-bold text-muted">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-canvas',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-4">
          <div className="mb-2 truncate px-3 text-xs font-semibold text-muted">{user.phone}</div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
