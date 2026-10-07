import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Flower2, Radio, UserRound } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Card } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { Table, type Column } from '../components/ui/Table'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { displayName, formatDate, formatPhoneUz } from '../lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '../lib/labels'
import { OrderAudienceBadge } from '../components/listings/OrderAudienceBadge'
import type { BotOrderRow, DriverRow } from '../types'

// "Ayol yo'lovchilar": every passenger order where a woman travels — the women-only
// "Ayollar uchun taxi" service plus ordinary taxi orders with a female passenger — and the
// female drivers who serve them. Orders live in the bot (served through /admin/bot-orders).
type Tab = 'all' | 'women' | 'female'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'women', label: '🌸 Ayollar uchun taxi' },
  { id: 'female', label: '👩 Oddiy taxi, ayol yo‘lovchi' },
]

export default function WomenOrders() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-bot-orders', 'women'],
    queryFn: async () => {
      const raw = await api.get<Array<Omit<BotOrderRow, 'id' | 'orderId'> & { id: number }>>('/admin/bot-orders?women=1')
      return raw.map((o) => ({ ...o, id: String(o.id), orderId: o.id }) as BotOrderRow)
    },
    refetchInterval: 10_000,
  })
  const { data: drivers } = useQuery({
    queryKey: ['admin-drivers', 'women-panel'],
    queryFn: () => api.get<DriverRow[]>('/admin/drivers?approved=true'),
    refetchInterval: 60_000,
  })

  const all = orders ?? []
  const rows = useMemo(
    () => all.filter((o) => (tab === 'women' ? o.womenOnly : tab === 'female' ? !o.womenOnly : true)),
    [all, tab],
  )

  const womenOnly = all.filter((o) => o.womenOnly)
  const open = all.filter((o) => o.status === 'OPEN').length
  const completed = all.filter((o) => o.status === 'COMPLETED').length
  // Women-only orders still waiting for a driver — the ones operators should watch.
  const waitingWomen = womenOnly.filter((o) => o.status === 'OPEN').length

  const femaleDrivers = (drivers ?? []).filter((d) => d.user.gender === 'FEMALE')
  const unknownGender = (drivers ?? []).filter((d) => !d.user.gender).length

  const columns: Column<BotOrderRow>[] = [
    { header: 'Xizmat', cell: (r) => <OrderAudienceBadge womenOnly={r.womenOnly} femaleOnly={r.femaleOnly} gender={r.passengerGender ?? 'FEMALE'} /> },
    {
      header: 'Yo‘nalish',
      cell: (r) => (
        <span className="font-semibold text-ink">
          {r.fromRegion} → {r.toRegion}
        </span>
      ),
    },
    {
      header: 'Yo‘lovchi',
      cell: (r) => (
        <div className="leading-tight">
          <p className="font-semibold text-ink">{r.passengerName || '—'}</p>
          <p className="text-xs text-muted">{formatPhoneUz(r.passengerPhone)}</p>
        </div>
      ),
    },
    {
      header: 'Vaqt',
      cell: (r) => (
        <div className="leading-tight">
          <p className="font-semibold text-ink">{formatDate(r.createdAt)}</p>
          <p className="text-xs text-muted">{r.whenText}</p>
        </div>
      ),
    },
    {
      header: 'Haydovchi',
      cell: (r) =>
        r.assignedDriver ? (
          <span className="text-sm">
            {r.assignedDriver.gender === 'FEMALE' ? '👩 ' : ''}
            {r.assignedDriver.name}
          </span>
        ) : (
          <span className="text-xs text-muted">Biriktirilmagan</span>
        ),
    },
    {
      header: 'Holat',
      cell: (r) => <Badge tone={ORDER_STATUS_TONE[r.status]}>{ORDER_STATUS_LABEL[r.status]}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Ayol yo‘lovchilar"
        subtitle="«Ayollar uchun taxi» va ayol yo‘lovchilar buyurtmalari · har 10 soniyada yangilanadi"
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Flower2} label="Ayollar uchun taxi" value={String(womenOnly.length)} hint={`${waitingWomen} ta kutmoqda`} />
        <StatCard icon={Radio} label="Ochiq buyurtmalar" value={String(open)} tone="amber" />
        <StatCard icon={CheckCircle2} label="Bajarilgan" value={String(completed)} tone="success" />
        <StatCard icon={UserRound} label="Ayol haydovchilar" value={String(femaleDrivers.length)} tone="slate" hint="tasdiqlangan" />
      </div>

      {unknownGender > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {unknownGender} ta tasdiqlangan haydovchining jinsi belgilanmagan — ularga «Ayollar uchun taxi» buyurtmalari
            bormaydi.
          </span>
          <Link to="/drivers" className="font-bold underline underline-offset-2">
            Haydovchilarga o‘tish
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`h-9 rounded-full px-4 text-sm font-semibold transition ${
                  tab === t.id ? 'bg-[#f5559a] text-white' : 'bg-white text-ink hover:bg-canvas'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <SkeletonTable />
          ) : !rows.length ? (
            <EmptyState icon={Flower2} title="Buyurtmalar yo‘q" />
          ) : (
            <Table columns={columns} rows={rows} onRowClick={(r) => navigate(`/bot-orders/${r.orderId}`)} />
          )}
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">👩 Ayol haydovchilar</h2>
          {femaleDrivers.length === 0 ? (
            <p className="text-sm text-muted">
              Hozircha ayol haydovchi belgilanmagan. Haydovchi sahifasida «Jinsi» bo‘limidan belgilang.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {femaleDrivers.slice(0, 12).map((d) => (
                <li key={d.id}>
                  <Link to={`/drivers/${d.id}`} className="flex items-center justify-between gap-3 rounded-lg hover:bg-canvas">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{displayName(d.user)}</p>
                      <p className="truncate text-xs text-muted">
                        {d.carModel} · {d.plate}
                      </p>
                    </div>
                    {d.online ? <Badge tone="green">Onlayn</Badge> : <Badge tone="gray">Oflayn</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
