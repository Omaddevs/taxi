import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  Bike,
  Bot,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CalendarClock,
  Car,
  CarFront,
  ClipboardCheck,
  FileSpreadsheet,
  Gift,
  Headset,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  LogOut,
  MapPinned,
  Megaphone,
  Menu,
  MessageSquareText,
  MessagesSquare,
  Newspaper,
  Radio,
  Flower2,
  Route,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  Ticket,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Logo } from '../ui/Logo'
import logoMark from '../../assets/logo.png'
import { BOT_SETTINGS_PAGES } from '../../lib/botSettings'
import type { AnalyticsSummary, StaffDetail } from '../../types'
import type { PanelRole } from '../../lib/tokens'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: 'pending' | 'newLeads' | 'rentals'
  roles: PanelRole[]
  // Sub-pages: shown as a dropdown on hover (desktop) and expand inline on click (touch).
  children?: { to: string; label: string }[]
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
      { to: '/leads', label: 'Lidlar', icon: UserPlus, badge: 'newLeads', roles: ['ADMIN', 'SALES_OPERATOR'] },
      { to: '/giveaway', label: 'Random mijozlar', icon: Gift, roles: ['ADMIN'] },
      { to: '/drivers', label: 'Haydovchilar', icon: Car, end: true, roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
      { to: '/drivers/applications', label: 'Arizalar', icon: ClipboardCheck, badge: 'pending', roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
    ],
  },
  {
    label: 'Safarlar',
    items: [
      { to: '/bookings', label: 'Bronlar', icon: Ticket, roles: ['ADMIN'] },
      { to: '/offers', label: 'Reyslar', icon: Route, roles: ['ADMIN'] },
      { to: '/listings', label: 'Elonlar', icon: Radio, roles: ['ADMIN'] },
      { to: '/women-orders', label: 'Ayol yo‘lovchilar', icon: Flower2, roles: ['ADMIN'] },
      { to: '/ratings', label: 'Reytinglar', icon: Star, roles: ['ADMIN'] },
      { to: '/rentals', label: 'Skuter ijara', icon: Bike, badge: 'rentals', roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
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
      { to: '/news', label: 'Yangiliklar', icon: Newspaper, roles: ['ADMIN'] },
      { to: '/services', label: 'Xizmatlar', icon: Layers, roles: ['ADMIN'] },
      { to: '/cars', label: 'Mashinalar', icon: CarFront, roles: ['ADMIN'] },
      { to: '/map-places', label: 'Xarita joylari', icon: MapPinned, roles: ['ADMIN'] },
      { to: '/broadcast', label: 'Xabar yuborish', icon: Megaphone, roles: ['ADMIN'] },
      { to: '/integrations', label: 'Integratsiyalar', icon: Link2, roles: ['ADMIN'] },
      { to: '/settings', label: 'Sozlamalar', icon: Settings, roles: ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] },
    ],
  },
  {
    label: 'Telegram bot',
    items: [
      {
        to: '/bot-settings',
        label: 'Bot sozlamalari',
        icon: Bot,
        roles: ['ADMIN'],
        children: BOT_SETTINGS_PAGES.map((page) => ({ to: page.to ?? `/bot-settings/${page.slug}`, label: page.label })),
      },
      { to: '/groups', label: 'Guruhlar', icon: MessagesSquare, roles: ['ADMIN'] },
    ],
  },
]

const ROLE_BADGE: Record<PanelRole, string> = {
  ADMIN: 'Admin',
  SALES_OPERATOR: 'Sotuv',
  SUPPORT_OPERATOR: 'Texnik',
}

function isChildActive(pathname: string, to: string) {
  const path = to.split('?')[0]
  return pathname === path || pathname.startsWith(`${path}/`)
}

const canHover = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover)').matches)

// A nav entry with sub-pages ("Bot sozlamalari"). Hovering opens a dropdown beside the sidebar
// (portaled to <body> so neither the nav's scroll box nor the collapsed rail clips it); a click
// expands the list inline instead, which is what touch screens and the mobile drawer get.
function NavDropdown({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const children = item.children ?? []
  const active = children.some((child) => isChildActive(pathname, child.to))
  // Open by default while one of its pages is showing; a click overrides that either way.
  const [toggled, setToggled] = useState<boolean | null>(null)
  const expanded = toggled ?? active
  const [flyout, setFlyout] = useState<{ top: number; left: number } | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const anchor = useRef<HTMLButtonElement>(null)

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  function openFlyout() {
    window.clearTimeout(closeTimer.current)
    if (!canHover() || !anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    setFlyout({ top: r.top, left: r.right + 6 })
  }

  function closeFlyout() {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setFlyout(null), 150)
  }

  const showInline = expanded && !collapsed
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'block rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
      isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink hover:bg-canvas',
    )

  return (
    <div onMouseEnter={openFlyout} onMouseLeave={closeFlyout}>
      <button
        ref={anchor}
        type="button"
        onClick={() => setToggled(!expanded)}
        aria-expanded={showInline}
        aria-label={item.label}
        className={cn(
          'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          collapsed && 'lg:justify-center lg:px-0',
          active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
        )}
      >
        <item.icon className={cn('shrink-0', collapsed ? 'h-4 w-4 lg:h-5 lg:w-5' : 'h-4 w-4')} />
        <span className={cn('flex-1 truncate text-left', collapsed && 'lg:hidden')}>{item.label}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', showInline && 'rotate-180', collapsed && 'lg:hidden')} />
      </button>
      {showInline ? (
        <div className="mt-0.5 ml-5 space-y-0.5 border-l border-white/10 pl-3">
          {children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={() =>
                cn(
                  'block truncate rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
                  isChildActive(pathname, child.to) ? 'bg-brand text-ink' : 'text-white/60 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      ) : null}
      {flyout && !showInline
        ? createPortal(
            <div
              className="fixed z-50 w-60 rounded-2xl border border-line bg-white p-2 shadow-xl"
              style={{ top: flyout.top, left: flyout.left }}
              onMouseEnter={openFlyout}
              onMouseLeave={closeFlyout}
            >
              <p className="px-3 pt-1 pb-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{item.label}</p>
              {children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={() => {
                    setFlyout(null)
                    onNavigate?.()
                  }}
                  className={() => linkClass({ isActive: isChildActive(pathname, child.to) })}
                >
                  {child.label}
                </NavLink>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

// Hover label for the collapsed rail. Rendered `fixed` so the nav's own scroll box can't clip it.
function RailTooltip({ tip }: { tip: { label: string; top: number } | null }) {
  if (!tip) return null
  return (
    <span
      className="pointer-events-none fixed left-[84px] z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
      style={{ top: tip.top }}
    >
      {tip.label}
    </span>
  )
}

function SidebarNav({
  role,
  pending,
  newLeads,
  pendingRentals,
  collapsed,
  onNavigate,
}: {
  role: PanelRole
  pending: number
  newLeads: number
  pendingRentals: number
  collapsed: boolean
  onNavigate?: () => void
}) {
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null)
  const counts = { pending, newLeads, rentals: pendingRentals }
  return (
    <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden py-2', collapsed ? 'space-y-3 px-3 lg:px-2.5' : 'space-y-5 px-3')}>
      <RailTooltip tip={collapsed ? tip : null} />
      {NAV.map((group) => {
        const items = group.items.filter((item) => item.roles.includes(role))
        if (!items.length) return null
        return (
          <div key={group.label}>
            {collapsed ? (
              <div className="mx-auto mb-2 hidden h-px w-8 bg-white/10 lg:block" />
            ) : null}
            <p className={cn('mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase', collapsed && 'lg:hidden')}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) =>
                item.children ? (
                  <NavDropdown key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  aria-label={item.label}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    setTip({ label: item.label, top: r.top + r.height / 2 })
                  }}
                  onMouseLeave={() => setTip(null)}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      collapsed && 'lg:justify-center lg:px-0',
                      isActive ? 'bg-brand text-ink font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <item.icon className={cn('shrink-0', collapsed ? 'h-4 w-4 lg:h-5 lg:w-5' : 'h-4 w-4')} />
                  {collapsed && item.badge && counts[item.badge] > 0 ? (
                    <span className="absolute right-1.5 top-1.5 hidden h-2 w-2 rounded-full bg-amber-400 ring-2 ring-sidebar lg:block" />
                  ) : null}
                  <span className={cn('flex-1 truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                  {collapsed ? null : item.badge === 'pending' && pending > 0 ? (
                    <span className="min-w-5 rounded-full bg-white/20 px-1.5 text-center text-[11px] font-bold">
                      {pending}
                    </span>
                  ) : null}
                  {collapsed ? null : item.badge === 'rentals' && pendingRentals > 0 ? (
                    <span className="min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-[11px] font-bold text-ink" title="Moderatsiyada">
                      {pendingRentals}
                    </span>
                  ) : null}
                  {collapsed ? null : item.badge === 'newLeads' && newLeads > 0 ? (
                    <span className="min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-bold text-ink" title="Yangi arizalar">
                      {newLeads}
                    </span>
                  ) : null}
                </NavLink>
                ),
              )}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function BusyToggle({ compact = false }: { compact?: boolean }) {
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
      title={busy ? 'Band — bosib Faol qiling' : 'Faol — bosib Band qiling'}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
        compact && 'lg:justify-center lg:px-0',
        busy ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', busy ? 'bg-amber-400' : 'bg-emerald-400')} />
      <span className={cn(compact && 'lg:hidden')}>{busy ? 'Band' : 'Faol'}</span>
    </button>
  )
}

const COLLAPSE_KEY = 'admin:sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  // Desktop only: the sidebar folds into an icon rail (remembered per browser). Ctrl/⌘+B toggles.
  const [collapsed, setCollapsed] = useState(readCollapsed)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // storage blocked — the toggle still works for this tab
    }
  }, [collapsed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setCollapsed((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { data } = useQuery({
    queryKey: ['analytics-summary', 'badges'],
    queryFn: () => api.get<AnalyticsSummary>('/admin/analytics/summary'),
    refetchInterval: 30_000,
    enabled: user?.role === 'ADMIN',
  })

  // Arizalar yonidagi raqam operatorlar uchun: analytics/summary faqat adminga ochiq.
  const { data: pendingApps } = useQuery({
    queryKey: ['admin-driver-applications', 'pending-badge'],
    queryFn: () => api.get<{ id: string }[]>('/admin/drivers/applications?status=PENDING&blocked=false'),
    refetchInterval: 30_000,
    enabled: Boolean(user) && user?.role !== 'ADMIN',
  })

  // Lidlar yonidagi raqam: sayt formasi va boshqa manbalardan kelgan, hali ishlanmagan (NEW) arizalar.
  const { data: leadsBadge } = useQuery({
    queryKey: ['leads', 'new-badge'],
    queryFn: () => api.get<{ id: string }[]>('/admin/leads?status=NEW'),
    refetchInterval: 30_000,
    enabled: user?.role === 'ADMIN' || user?.role === 'SALES_OPERATOR',
  })

  // Skuter ijara yonidagi raqam: saytdan kelgan, moderatsiyani kutayotgan e’lonlar.
  const { data: rentalsBadge } = useQuery({
    queryKey: ['admin-rentals', 'pending-badge'],
    queryFn: () => api.get<{ id: string }[]>('/admin/rentals?status=PENDING'),
    refetchInterval: 60_000,
    enabled: Boolean(user),
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

  const pending = (user.role === 'ADMIN' ? data?.pendingApplications : pendingApps?.length) ?? 0
  const newLeads = leadsBadge?.length ?? 0
  const pendingRentals = rentalsBadge?.length ?? 0

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
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-sidebar transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          collapsed && 'lg:w-[76px]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('relative flex items-center justify-between px-5 py-5', collapsed && 'lg:justify-center lg:px-0')}>
          <div className={cn('flex items-center gap-2', collapsed && 'lg:hidden')}>
            <Logo light />
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white/70 uppercase">
              {ROLE_BADGE[user.role]}
            </span>
          </div>
          {collapsed ? <img src={logoMark} alt="TaxiLine" className="hidden h-9 w-9 object-contain lg:block" /> : null}
          <button type="button" className="rounded-lg p-1 text-white/70 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
          {/* Desktop fold/unfold handle on the sidebar's edge. */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Menyuni ochish (Ctrl+B)' : 'Menyuni yig‘ish (Ctrl+B)'}
            aria-label={collapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish'}
            aria-expanded={!collapsed}
            className="absolute -right-3.5 top-6 hidden h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink shadow-md transition hover:scale-110 hover:bg-brand lg:flex"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <SidebarNav
          role={user.role}
          pending={pending}
          newLeads={newLeads}
          pendingRentals={pendingRentals}
          collapsed={collapsed}
          onNavigate={() => setOpen(false)}
        />
        <div className={cn('border-t border-white/10 px-3 py-4', collapsed && 'lg:px-2.5')}>
          <div className={cn('mb-2 truncate px-3 text-xs font-semibold text-white/50', collapsed && 'lg:hidden')}>{user.name || user.phone}</div>
          <div className="mb-2">
            <BusyToggle compact={collapsed} />
          </div>
          <button
            onClick={logout}
            title="Chiqish"
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-white/5',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Chiqish</span>
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
