import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone,
  CarFront,
  UserRound,
  PhoneCall,
  Headset,
  FileSpreadsheet,
  LifeBuoy,
  Users,
  Bot,
  ArrowUpRight,
  ShieldBan,
  MessagesSquare,
  Car,
  ClipboardCheck,
} from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, Button } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { SkeletonGrid } from '../components/ui/EmptyState'
import { Donut, Legend, MetricTile, MiniBars, ProgressRow, SERIES, StackBar } from '../components/ui/DashCharts'
import { daysAgo, formatShortDay, displayName, startOfToday, initials } from '../lib/utils'
import { PeopleSearch } from '../components/people/PeopleSearch'
import { AdsPeriodStats } from '../components/dashboard/AdsPeriodStats'
import type { AdsStatsReport, AnalyticsSummary, StaffKpiRow, StaffRow, TicketStats } from '../types'

const RANGES = [
  { value: 'today', label: 'Bugun' },
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
]

const RANGE_DAYS: Record<string, number> = { today: 1, '7d': 7, '30d': 30 }

const PREV_LABEL: Record<string, string> = { today: 'kechagiga nisbatan', '7d': 'oldingi 7 kunga', '30d': 'oldingi 30 kunga' }

// Ochiq guruhdagi "yo‘lovchimisiz yoki haydovchi?" so‘rovi natijalari (bot group_ads).
const ROUTED_META: { key: string; label: string; color: string }[] = [
  { key: 'TAKEN', label: 'Haydovchi oldi', color: '#16a34a' },
  { key: 'SENT', label: 'Haydovchilarga yuborildi', color: SERIES.driver },
  { key: 'DRIVER', label: 'Haydovchi (adminga)', color: SERIES.violet },
  { key: 'PENDING', label: 'Javob kutilmoqda', color: SERIES.amber },
  { key: 'EXPIRED', label: 'Javob berilmadi', color: '#9aa0ab' },
  { key: 'CANCELLED', label: 'Bekor qilindi', color: '#ef4444' },
]

const AUTHOR_TINTS = ['#fff1ea', '#eaf3fd', '#fdeef6', '#eafaf3', '#fff7e0', '#f0eefe']

function rangeFrom(id: string) {
  if (id === '7d') return daysAgo(6)
  if (id === '30d') return daysAgo(29)
  return startOfToday()
}

function deltaPct(now: number, prev: number) {
  if (!prev) return now > 0 ? null : 0
  return Math.round(((now - prev) / prev) * 100)
}

const nf = (n: number) => n.toLocaleString('uz-UZ')

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

function CardHead({ title, subtitle, onOpen }: { title: string; subtitle?: string; onOpen?: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Ochish"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-canvas"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState('today')
  const days = RANGE_DAYS[range]

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
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary', range],
    queryFn: () => {
      const from = rangeFrom(range).toISOString()
      return api.get<AnalyticsSummary>(`/admin/analytics/summary?from=${encodeURIComponent(from)}`)
    },
    refetchInterval: 30_000,
  })
  const {
    data: ads,
    isLoading: adsLoading,
    error: adsError,
  } = useQuery({
    queryKey: ['ads-stats', days],
    queryFn: () => api.get<AdsStatsReport>(`/admin/bot-settings/ads-stats?days=${days}`),
    refetchInterval: 60_000,
  })

  const hourItems = useMemo(() => {
    const nowHour = (new Date().getUTCHours() + 5) % 24
    return {
      items: (ads?.hours ?? []).map((v, h) => ({
        key: String(h),
        label: h % 6 === 0 ? String(h).padStart(2, '0') : '',
        tip: `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59`,
        value: v,
      })),
      nowHour: String(nowHour),
      peak: (ads?.hours ?? []).reduce((best, v, h, arr) => (v > arr[best] ? h : best), 0),
    }
  }, [ads])

  const t = ads?.totals
  const groupMax = Math.max(1, ...(ads?.groups ?? []).map((g) => g.ads))
  const routedTotal = ROUTED_META.reduce((s, m) => s + (ads?.routed[m.key] ?? 0), 0)
  const bu = ads?.botUsers
  const siteSources = summary
    ? [
        { key: 'BOT', label: 'Bot orqali', value: summary.usersBySource.BOT, color: SERIES.driver },
        { key: 'GROUP', label: 'Guruhdan', value: summary.usersBySource.GROUP, color: SERIES.passenger },
        { key: 'WEBAPP', label: 'Sayt / ilova', value: summary.usersBySource.WEBAPP, color: SERIES.calls },
      ]
    : []
  const siteSourceMax = Math.max(1, ...siteSources.map((s) => s.value))

  return (
    <div>
      <PageHeader
        title="Boshqaruv paneli"
        subtitle="Telegram guruhlaridagi e’lonlar va foydalanuvchilar statistikasi"
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

      {/* ── Telegram e’lonlari ─────────────────────────────────────────── */}
      <SectionTitle
        title="Telegram e’lonlari"
        subtitle={
          t ? `${t.activeGroups} ta guruhda e’lon bo‘ldi · jami ${ads?.groupsTotal ?? 0} ta guruh ulangan` : 'Guruhlarda tashlangan e’lonlar'
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/groups')}>
              <MessagesSquare className="h-4 w-4" />
              Guruhlar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/driver-ads')}>
              <CarFront className="h-4 w-4" />
              Haydovchilar e’lonlari
            </Button>
          </div>
        }
      />

      {adsError ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-red-600">E’lonlar statistikasini olib bo‘lmadi</p>
          <p className="mt-1 text-xs text-muted">{adsError instanceof Error ? adsError.message : 'Bot xizmati javob bermadi'}</p>
        </Card>
      ) : adsLoading || !ads || !t ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Jami e’lonlar"
              value={nf(t.ads)}
              icon={<Megaphone className="h-4 w-4" />}
              accent="#00838c"
              delta={deltaPct(t.ads, ads.previous.ads)}
              hint={PREV_LABEL[range]}
            />
            <MetricTile
              label="Haydovchi e’lonlari"
              value={nf(t.driver)}
              icon={<CarFront className="h-4 w-4" />}
              accent={SERIES.driver}
              hint={t.ads ? `${Math.round((t.driver / t.ads) * 100)}% ulush` : '—'}
            />
            <MetricTile
              label="Yo‘lovchi e’lonlari"
              value={nf(t.passenger)}
              icon={<UserRound className="h-4 w-4" />}
              accent={SERIES.passenger}
              hint={t.ads ? `${Math.round((t.passenger / t.ads) * 100)}% ulush` : '—'}
            />
            <MetricTile
              label="“Tel qilish” bosildi"
              value={nf(t.calls)}
              icon={<PhoneCall className="h-4 w-4" />}
              accent={SERIES.calls}
              delta={deltaPct(t.calls, ads.previous.calls)}
              hint={PREV_LABEL[range]}
            />
          </div>

          <AdsPeriodStats />

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="p-5">
              <CardHead title="E’lonlar taqsimoti" subtitle="Tanlangan davr" />
              <Donut
                items={[
                  { key: 'driver', label: 'Haydovchi', value: t.driver, color: SERIES.driver },
                  { key: 'passenger', label: 'Yo‘lovchi', value: t.passenger, color: SERIES.passenger },
                  { key: 'unknown', label: 'Aniqlanmagan', value: t.unknown, color: SERIES.other },
                ]}
                center={
                  <>
                    <span className="text-2xl font-extrabold text-ink">{nf(t.ads)}</span>
                    <span className="text-[11px] text-muted">jami e’lon</span>
                  </>
                }
              />
              <div className="mt-5 flex justify-center">
                <Legend
                  items={[
                    { label: 'Haydovchi', color: SERIES.driver, value: t.driver },
                    { label: 'Yo‘lovchi', color: SERIES.passenger, value: t.passenger },
                    ...(t.unknown ? [{ label: 'Aniqlanmagan', color: SERIES.other, value: t.unknown }] : []),
                  ]}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-canvas px-2 py-2">
                  <p className="text-lg font-extrabold text-ink">{nf(t.authors)}</p>
                  <p className="text-[11px] text-muted">muallif</p>
                </div>
                <div className="rounded-xl bg-canvas px-2 py-2">
                  <p className="text-lg font-extrabold text-ink">{nf(t.withPhoto)}</p>
                  <p className="text-[11px] text-muted">rasmli</p>
                </div>
                <div className="rounded-xl bg-canvas px-2 py-2" title="Takroriy e’lon himoyasi o‘chirgan e’lonlar">
                  <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-ink">
                    <ShieldBan className="h-3.5 w-3.5 text-muted" />
                    {nf(t.blocked)}
                  </p>
                  <p className="text-[11px] text-muted">takror o‘chirildi</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <CardHead title="Eng faol mualliflar" subtitle="Ko‘p e’lon tashlaganlar" />
              {ads.topAuthors.length === 0 ? (
                <p className="py-6 text-sm text-muted">Hali muallif yo‘q</p>
              ) : (
                <ul className="space-y-2.5">
                  {ads.topAuthors.map((a, i) => (
                    <li key={a.telegramId} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: AUTHOR_TINTS[i % AUTHOR_TINTS.length] }}>
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: a.role === 'PASSENGER' ? SERIES.passenger : SERIES.driver }}
                      >
                        {initials(a.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{a.name}</p>
                        <p className="truncate text-[11px] text-muted">
                          {a.role === 'PASSENGER' ? 'Yo‘lovchi' : a.role === 'DRIVER' ? 'Haydovchi' : 'Noma’lum'}
                          {a.username ? ` · @${a.username}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-ink">{a.ads}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <CardHead
                title="Ochiq guruh so‘rovlari"
                subtitle={`“Yo‘lovchimisiz yoki haydovchi?” — ${nf(routedTotal)} ta`}
                onOpen={() => navigate('/bot-settings/ads-log')}
              />
              <StackBar items={ROUTED_META.map((m) => ({ ...m, value: ads.routed[m.key] ?? 0 }))} />
              <ul className="mt-4 space-y-2">
                {ROUTED_META.map((m) => {
                  const v = ads.routed[m.key] ?? 0
                  return (
                    <li key={m.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                        {m.label}
                      </span>
                      <span className="font-semibold text-ink">
                        {nf(v)}
                        <span className="ml-1.5 text-xs font-medium text-muted">
                          {routedTotal ? `${Math.round((v / routedTotal) * 100)}%` : ''}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="p-5 xl:col-span-2">
              <CardHead
                title="Guruhlar bo‘yicha"
                subtitle="Eng ko‘p e’lon tashlangan guruhlar"
                onOpen={() => navigate('/groups')}
              />
              {ads.groups.length === 0 ? (
                <p className="py-6 text-sm text-muted">Bu davrda guruhlarda e’lon bo‘lmadi</p>
              ) : (
                <div className="space-y-4">
                  {ads.groups.map((g) => (
                    <div key={g.chatId}>
                      <ProgressRow
                        label={g.title || `Guruh ${g.chatId}`}
                        value={g.ads}
                        max={groupMax}
                        color={g.driver >= g.passenger ? SERIES.driver : SERIES.passenger}
                        right={
                          <span className="flex items-center gap-2">
                            <span className="hidden text-xs sm:inline">
                              {g.driver} haydovchi · {g.passenger} yo‘lovchi
                              {g.calls ? ` · ${g.calls} qo‘ng‘iroq` : ''}
                            </span>
                            <span className="text-line">|</span>
                            <span className="font-bold text-ink">{nf(g.ads)}</span>
                          </span>
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-ink">Faollik soatlari</h3>
                  <p className="mt-0.5 text-xs text-muted">E’lonlar qaysi soatda ko‘p tashlanadi (tanlangan davr)</p>
                </div>
                {t.ads ? (
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
                    Eng qizg‘in: {String(hourItems.peak).padStart(2, '0')}:00
                  </span>
                ) : null}
              </div>
              <MiniBars items={hourItems.items} color="#00a9b5" height={140} highlight={hourItems.nowHour} />
            </Card>
          </div>
        </>
      )}

      {/* ── Foydalanuvchilar ───────────────────────────────────────────── */}
      <SectionTitle title="Foydalanuvchilar" subtitle="Sayt va Telegram bot foydalanuvchilari" />

      {!summary ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Sayt foydalanuvchilari"
              value={nf(summary.usersCount)}
              icon={<Users className="h-4 w-4" />}
              accent="#00838c"
              hint={<span>+{nf(summary.usersNew)} yangi · {nf(summary.usersActive)} faol</span>}
            />
            <MetricTile
              label="Bot foydalanuvchilari"
              value={bu ? nf(bu.total) : '—'}
              icon={<Bot className="h-4 w-4" />}
              accent={SERIES.driver}
              hint={bu ? <span>+{nf(bu.new)} yangi · {nf(bu.active)} faol</span> : 'Bot javob bermadi'}
            />
            <MetricTile
              label="Onlayn haydovchilar"
              value={nf(summary.activeDrivers)}
              icon={<Car className="h-4 w-4" />}
              accent={SERIES.calls}
              hint={`jami ${nf(summary.driversCount)} haydovchi`}
            />
            <MetricTile
              label="Kutilayotgan arizalar"
              value={nf(summary.pendingApplications)}
              icon={<ClipboardCheck className="h-4 w-4" />}
              accent={SERIES.amber}
              hint={
                <button type="button" onClick={() => navigate('/drivers/applications')} className="font-semibold text-brand-dark hover:underline">
                  Ko‘rish →
                </button>
              }
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="p-5">
              <CardHead title="Qayerdan kelgan" subtitle="Sayt foydalanuvchilari manbasi" onOpen={() => navigate('/people')} />
              <div className="space-y-4">
                {siteSources.map((s) => (
                  <ProgressRow
                    key={s.key}
                    label={s.label}
                    value={s.value}
                    max={siteSourceMax}
                    color={s.color}
                    right={
                      <span>
                        <span className="font-bold text-ink">{nf(s.value)}</span>
                        <span className="ml-1.5 text-xs">
                          {summary.usersCount ? `${Math.round((s.value / summary.usersCount) * 100)}%` : ''}
                        </span>
                      </span>
                    }
                  />
                ))}
                <ProgressRow
                  label="Telegram bog‘langan"
                  value={summary.telegramLinkedCount}
                  max={Math.max(1, summary.usersCount)}
                  color={SERIES.violet}
                  right={
                    <span>
                      <span className="font-bold text-ink">{nf(summary.telegramLinkedCount)}</span>
                      <span className="ml-1.5 text-xs">/ {nf(summary.usersCount)}</span>
                    </span>
                  }
                />
              </div>
            </Card>

            <Card className="p-5">
              <CardHead title="Yangi sayt foydalanuvchilari" subtitle="So‘nggi 7 kun" />
              <MiniBars
                color="#00a9b5"
                height={150}
                items={summary.series.map((d) => ({ key: d.date, label: formatShortDay(d.date), value: d.newUsers }))}
              />
            </Card>

            <Card className="p-5">
              <CardHead title="Bot foydalanuvchilari" subtitle={bu ? `Yangi ro‘yxatdan o‘tganlar — so‘nggi ${bu.series.length} kun` : undefined} />
              {bu ? (
                <>
                  <MiniBars
                    color={SERIES.driver}
                    height={96}
                    items={bu.series.map((d) => ({ key: d.date, label: formatShortDay(d.date), value: d.count }))}
                  />
                  <div className="mt-4">
                    <StackBar
                      items={[
                        { key: 'clients', label: 'Mijozlar', value: bu.clients, color: SERIES.passenger },
                        { key: 'drivers', label: 'Haydovchilar', value: bu.drivers, color: SERIES.driver },
                      ]}
                    />
                    <div className="mt-2.5">
                      <Legend
                        items={[
                          { label: 'Mijoz', color: SERIES.passenger, value: nf(bu.clients) },
                          { label: 'Haydovchi', color: SERIES.driver, value: nf(bu.drivers) },
                          ...(bu.blocked ? [{ label: 'Bloklagan', color: SERIES.other, value: nf(bu.blocked) }] : []),
                        ]}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-6 text-sm text-muted">Bot statistikasi mavjud emas</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ── Jamoa ──────────────────────────────────────────────────────── */}
      <SectionTitle title="Jamoa" subtitle="Operatorlar va texnik xizmat" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHead
            title="Sotuv KPI (bugun)"
            subtitle={`${staff?.length ?? 0} ta operator · ${staff?.filter((s) => s.staffKind === 'SALES').length ?? 0} sotuv`}
            onOpen={() => navigate('/operators')}
          />
          {!kpis?.length ? (
            <p className="text-sm text-muted">Sotuv operatori yo‘q. Dashboarddan operator yarating.</p>
          ) : (
            <div className="space-y-4">
              {kpis.slice(0, 5).map((row) => (
                <ProgressRow
                  key={row.operator.id}
                  label={displayName(row.operator)}
                  sub={`${row.actual.calls}/${row.target.calls || '—'} chaqiruv`}
                  value={row.actual.bookings}
                  max={Math.max(row.target.bookings, row.actual.bookings, 1)}
                  color={row.target.bookings && row.actual.bookings >= row.target.bookings ? '#16a34a' : '#00a9b5'}
                  right={
                    <span>
                      <span className="font-bold text-ink">{row.actual.bookings}</span> / {row.target.bookings || '—'} bron
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <LifeBuoy className="h-4 w-4 text-brand-dark" />
              Texnik xizmat
            </h3>
            <button
              type="button"
              onClick={() => navigate('/support')}
              aria-label="Ochish"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line hover:bg-canvas"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Ochiq', value: tickets?.open ?? 0 },
              { label: 'Shoshilinch', value: tickets?.urgent ?? 0 },
              { label: 'Bugun yechilgan', value: tickets?.resolvedToday ?? 0 },
              { label: 'O‘rtacha', value: `${tickets?.avgResolveHours ?? 0} soat` },
            ].map((x) => (
              <div key={x.label} className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs text-muted">{x.label}</p>
                <p className="mt-0.5 text-2xl font-extrabold text-ink">{x.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
