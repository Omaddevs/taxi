import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Route, Wallet, CheckCircle2, Car, Users, ClipboardCheck, Headset, FileSpreadsheet, LifeBuoy, Lock, Globe } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Card, Badge, Button } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { SkeletonGrid } from '../components/ui/EmptyState'
import { SparkBars, StatusMeter } from '../components/ui/Chart'
import { daysAgo, formatShortDay, formatSom, formatDateTime, displayName, startOfToday } from '../lib/utils'
import { BOOKING_LABEL, BOOKING_TONE } from '../lib/labels'
import { PeopleSearch } from '../components/people/PeopleSearch'
import type { AnalyticsSummary, BookingStatus, StaffKpiRow, StaffRow, TicketStats } from '../types'

const RANGES = [
  { value: 'today', label: 'Bugun' },
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
]

function rangeFrom(id: string) {
  if (id === '7d') return daysAgo(6)
  if (id === '30d') return daysAgo(29)
  return startOfToday()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState('today')

  const { data: staff } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get<StaffRow[]>('/admin/staff'),
  })
  const { data: kpis } = useQuery({
    queryKey: ['admin-staff-kpis', 'DAY'],
    queryFn: () => api.get<StaffKpiRow[]>('/admin/staff/kpis?period=DAY'),
  })
  const { data: tickets } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get<TicketStats>('/admin/tickets/stats'),
  })
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-summary', range],
    queryFn: () => {
      const from = rangeFrom(range).toISOString()
      return api.get<AnalyticsSummary>(`/admin/analytics/summary?from=${encodeURIComponent(from)}`)
    },
    refetchInterval: 30_000,
  })

  const seriesItems = useMemo(
    () => (data?.series ?? []).map((d) => ({ key: d.date, label: formatShortDay(d.date), value: d.bookings })),
    [data],
  )

  const statusItems = useMemo(() => {
    const by = data?.bookingsByStatus
    if (!by) return []
    return (Object.keys(BOOKING_LABEL) as BookingStatus[]).map((key) => ({
      key,
      label: BOOKING_LABEL[key],
      value: by[key] ?? 0,
      color:
        key === 'COMPLETED'
          ? 'bg-emerald-500'
          : key === 'CANCELLED'
            ? 'bg-red-400'
            : key === 'PENDING'
              ? 'bg-amber-400'
              : 'bg-brand',
    }))
  }, [data])

  return (
    <div>
      <PageHeader
        title="Boshqaruv paneli"
        subtitle="Jonli ko‘rsatkichlar, operatorlar va hisobotlar"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/operators')}>
              <Headset className="h-4 w-4" />
              Operatorlar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <FilterPills options={RANGES} value={range} onChange={setRange} />
          </div>
        }
      />

      <PeopleSearch />

      <Card className="mt-6 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-ink">Telegram guruhlar</h2>
          <p className="mt-0.5 text-xs text-muted">Botga ulangan yopiq va ochiq guruhlarni shu yerdan boshqaring</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Lock className="h-4 w-4" />
            Yopiq guruh qo‘shish
          </Button>
          <Button variant="outline">
            <Globe className="h-4 w-4" />
            Ochiq guruh qo‘shish
          </Button>
        </div>
      </Card>

      {isLoading || !data ? (
        <SkeletonGrid count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={Route} label="Bronlar" value={String(data.bookingsCount)} hint="Tanlangan davr" />
            <StatCard
              icon={CheckCircle2}
              label="Yakunlangan"
              value={String(data.completedCount)}
              tone="success"
            />
            <StatCard icon={Wallet} label="Daromad" value={formatSom(data.revenue)} tone="amber" />
            <StatCard icon={Car} label="Onlayn haydovchilar" value={String(data.activeDrivers)} />
            <StatCard icon={Users} label="Foydalanuvchilar" value={String(data.usersCount)} tone="slate" />
            <StatCard
              icon={ClipboardCheck}
              label="Kutilayotgan arizalar"
              value={String(data.pendingApplications)}
              tone={data.pendingApplications > 0 ? 'amber' : 'slate'}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <Card className="p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">So‘nggi 7 kundagi bronlar</h2>
                <p className="text-xs text-muted">Telegram: {data.telegramLinkedCount} ta bog‘langan</p>
              </div>
              <SparkBars items={seriesItems} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-bold text-ink">Bron holatlari</h2>
              <StatusMeter items={statusItems} />
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-sm font-bold text-ink">So‘nggi bronlar</h2>
                <button
                  type="button"
                  onClick={() => navigate('/bookings')}
                  className="text-sm font-semibold text-brand-dark hover:underline"
                >
                  Barchasi
                </button>
              </div>
              <ul className="divide-y divide-line">
                {data.recentBookings.length === 0 ? (
                  <li className="px-5 py-8 text-sm text-muted">Hali bronlar yo‘q</li>
                ) : (
                  data.recentBookings.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-canvas/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {b.fromLabel} → {b.toLabel}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {displayName(b.rider)} · {formatDateTime(b.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-bold text-ink">{formatSom(b.totalPrice)}</span>
                          <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_LABEL[b.status]}</Badge>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Arizalar</h2>
                <button
                  type="button"
                  onClick={() => navigate('/drivers/applications')}
                  className="text-sm font-semibold text-brand-dark hover:underline"
                >
                  Ko‘rish
                </button>
              </div>
              {data.recentApplications.length === 0 ? (
                <p className="text-sm text-muted">Kutilayotgan ariza yo‘q</p>
              ) : (
                <ul className="space-y-3">
                  {data.recentApplications.map((app) => (
                    <li key={app.id} className="rounded-xl bg-canvas px-3 py-2.5">
                      <p className="text-sm font-semibold text-ink">{app.fullName}</p>
                      <p className="text-xs text-muted">
                        {app.carModel} · {app.plate}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {data.topRoutes.length > 0 ? (
                <div className="mt-5">
                  <h3 className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Mashhur yo‘nalishlar</h3>
                  <ul className="space-y-1.5">
                    {data.topRoutes.map((r) => (
                      <li key={r.route} className="flex justify-between text-sm">
                        <span className="truncate text-ink">{r.route}</span>
                        <span className="ml-2 font-semibold text-muted">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Sotuv KPI (bugun)</h2>
                <button type="button" onClick={() => navigate('/operators')} className="text-sm font-semibold text-brand-dark hover:underline">
                  Boshqarish
                </button>
              </div>
              {!kpis?.length ? (
                <p className="text-sm text-muted">Sotuv operatori yo‘q. Dashboarddan operator yarating.</p>
              ) : (
                <ul className="space-y-3">
                  {kpis.slice(0, 5).map((row) => (
                    <li key={row.operator.id}>
                      <p className="mb-1 text-sm font-semibold">{displayName(row.operator)}</p>
                      <p className="text-xs text-muted">
                        {row.actual.bookings}/{row.target.bookings || '—'} bron · {row.actual.calls}/{row.target.calls || '—'} chaqiruv
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted">{staff?.length ?? 0} ta operator · {staff?.filter((s) => s.staffKind === 'SALES').length ?? 0} sotuv</p>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <LifeBuoy className="h-4 w-4 text-brand-dark" />
                  Texnik xizmat
                </h2>
                <button type="button" onClick={() => navigate('/support')} className="text-sm font-semibold text-brand-dark hover:underline">
                  Navbat
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-muted">Ochiq</p>
                  <p className="text-lg font-extrabold">{tickets?.open ?? 0}</p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-muted">Shoshilinch</p>
                  <p className="text-lg font-extrabold">{tickets?.urgent ?? 0}</p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-muted">Bugun yechilgan</p>
                  <p className="text-lg font-extrabold">{tickets?.resolvedToday ?? 0}</p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-muted">O‘rtacha</p>
                  <p className="text-lg font-extrabold">{tickets?.avgResolveHours ?? 0} soat</p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
