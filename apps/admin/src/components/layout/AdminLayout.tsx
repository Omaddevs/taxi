import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  ClipboardCheck,
  Ticket,
  Route,
  Star,
  Wallet,
  Tag,
  Layers,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  Headset,
  Users,
  FileSpreadsheet,
  LifeBuoy,
  ShieldCheck,
  UserPlus,
  MessageSquareText,
  Link2,
  CalendarClock,
  Radio,
  MessagesSquare,
  type LucideIcon,
  CarFront,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Logo } from '../ui/Logo'
import type { AnalyticsSummary, StaffDetail } from '../../types'
import type { PanelRole } from '../../lib/tokens'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: 'pending'
  roles: PanelRole[]
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Umumiy',
    items: [
      { to: '/', label: 'Boshqaruv paneli', icon: LayoutDashboard, end: true, roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
      { to: '/operators', label: 'Operatorlar', icon: Headset, roles: ['ADMIN'] },
      { to: '/reports', label: 'Hisobotlar', icon: FileSpreadsheet, roles: ['ADMIN'] },
      { to: '/support', label: 'Texnik xizmat', icon: LifeBuoy, roles: ['ADMIN', 'SUPPORT_OPERATOR'] },
      { to: '/canned-responses', label: 'Tayyor javoblar', icon: MessageSquareText, roles: ['ADMIN', 'SUPPORT_OPERATOR'] },
      { to: '/audit', label: 'Audit jurnali', icon: ShieldCheck, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Odamlar',
    items: [
      { to: '/people', label: 'Mijozlar', icon: Users, roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
      { to: '/leads', label: 'Lidlar', icon: UserPlus, roles: ['ADMIN', 'SALES_OPERATOR'] },
      { to: '/drivers', label: 'Haydovchilar', icon: Car, end: true, roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
      { to: '/drivers/applications', label: 'Arizalar', icon: ClipboardCheck, badge: 'pending', roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Safarlar',
    items: [
      { to: '/bookings', label: 'Bronlar', icon: Ticket, roles: ['ADMIN'] },
      { to: '/offers', label: 'Reyslar', icon: Route, roles: ['ADMIN'] },
      { to: '/listings', label: 'Elonlar', icon: Radio, roles: ['ADMIN'] },
      { to: '/ratings', label: 'Reytinglar', icon: Star, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Moliya',
    items: [
      { to: '/finance', label: 'Tranzaksiyalar', icon: Wallet, roles: ['ADMIN'] },
      { to: '/promo', label: 'Promo kodlar', icon: Tag, roles: ['ADMIN'] },
      { to: '/subscription-plans', label: 'Obuna tariflari', icon: CalendarClock, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Kontent',
    items: [
      { to: '/services', label: 'Xizmatlar', icon: Layers, roles: ['ADMIN'] },
      { to: '/cars', label: 'Mashinalar', icon: CarFront, roles: ['ADMIN'] },
      { to: '/groups', label: 'Guruhlar', icon: MessagesSquare, roles: ['ADMIN'] },
      { to: '/broadcast', label: 'Xabar yuborish', icon: Megaphone, roles: ['ADMIN'] },
      { to: '/integrations', label: 'Integratsiyalar', icon: Link2, roles: ['ADMIN'] },
      { to: '/settings', label: 'Sozlamalar', icon: Settings, roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
    ],
  },
]

const ROLE_BADGE: Record<PanelRole, string> = {
  ADMIN: 'Admin',
  SALES_OPERATOR: 'Sotuv',
  SUPPORT_OPERATOR: 'Texnik',
}

function SidebarNav({
  role,
  pending,
  onNavigate,
}: {
  role: PanelRole
  pending: number
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
      {NAV.map((group) => {
        const items = group.items.filter((item) => item.roles.includes(role))
        if (!items.length) return null
        return (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase">{group.label}</p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive ? 'bg-brand text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge === 'pending' && pending > 0 ? (
                    <span className="min-w-5 rounded-full bg-white/20 px-1.5 text-center text-[11px] font-bold">
                      {pending}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function BusyToggle() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['staff-me'],
    queryFn: () => api.get<StaffDetail>('/admin/staff/me'),
  })

  const toggle = useMutation({
    mutationFn: (busy: boolean) => api.patch('/admin/staff/me/busy', { busy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-me'] }),
  })

  const busy = data?.busy ?? false

  return (
    <button
      type="button"
      onClick={() => toggle.mutate(!busy)}
      disabled={toggle.isPending}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
        busy ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', busy ? 'bg-amber-400' : 'bg-emerald-400')} />
      {busy ? 'Band' : 'Faol'}
    </button>
  )
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['analytics-summary', 'badges'],
    queryFn: () => api.get<AnalyticsSummary>('/admin/analytics/summary'),
    refetchInterval: 30_000,
    enabled: user?.role === 'ADMIN',
  })

  // Cheap presence signal: ping every 30s while the panel tab is open so teammates see this
  // account as "online" in the Operators list (see staff.service's 90s online window).
  useEffect(() => {
    if (!user) return
    const ping = () => api.post('/admin/staff/me/heartbeat').catch(() => {})
    ping()
    const id = setInterval(ping, 30_000)
    return () => clearInterval(id)
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  const pending = data?.pendingApplications ?? 0

  return (
    <div className="flex min-h-screen bg-canvas">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Menyuni yopish"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-sidebar transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <Logo light />
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white/70 uppercase">
              {ROLE_BADGE[user.role]}
            </span>
          </div>
          <button type="button" className="rounded-lg p-1 text-white/70 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav role={user.role} pending={pending} onNavigate={() => setOpen(false)} />
        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-2 truncate px-3 text-xs font-semibold text-white/50">{user.name || user.phone}</div>
          <div className="mb-2">
            <BusyToggle />
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" className="rounded-xl p-2 hover:bg-canvas" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
        </header>
        <main className="min-w-0 flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
