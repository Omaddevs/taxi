import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlarmClock, PhoneCall, Trophy, Users } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { KpiBar } from '../components/ui/KpiBar'
import { SkeletonGrid } from '../components/ui/EmptyState'
import { formatDateTime, formatSom } from '../lib/utils'
import { ACTIVITY_LABEL } from '../lib/labels'
import { useAuth } from '../context/AuthContext'
import { PeopleSearch } from '../components/people/PeopleSearch'
import type { ActivityKind, KpiPeriod, LeadRow, SalesDashboard } from '../types'

const PERIODS = [
  { value: 'DAY', label: 'Bugun' },
  { value: 'WEEK', label: 'Hafta' },
  { value: 'MONTH', label: 'Oy' },
]

export default function SalesDashboard() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [period, setPeriod] = useState<KpiPeriod>('DAY')
  const [kind, setKind] = useState<ActivityKind>('CALL')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sales-dashboard', period],
    queryFn: () => api.get<SalesDashboard>(`/admin/staff/me/dashboard?period=${period}`),
    refetchInterval: 20_000,
  })

  const { data: dueLeads } = useQuery({
    queryKey: ['leads', 'due'],
    queryFn: () => api.get<LeadRow[]>('/admin/leads?dueOnly=true'),
    refetchInterval: 60_000,
  })

  const log = useMutation({
    mutationFn: () =>
      api.post('/admin/staff/me/activities', {
        kind,
        title: title || ACTIVITY_LABEL[kind],
        note: note || undefined,
        amount: amount ? Number(amount) : 0,
      }),
    onSuccess: () => {
      setTitle('')
      setAmount('')
      setNote('')
      qc.invalidateQueries({ queryKey: ['sales-dashboard'] })
    },
  })

  function onLog(e: FormEvent) {
    e.preventDefault()
    log.mutate()
  }

  return (
    <div>
      <PageHeader
        title="Sotuv paneli"
        subtitle={`${user?.name || user?.phone} · KPI rejimi`}
        action={<FilterPills options={PERIODS} value={period} onChange={(v) => setPeriod(v as KpiPeriod)} />}
      />

      <PeopleSearch />

      {dueLeads?.length ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
              <AlarmClock className="h-4 w-4" />
              Bugungi eslatmalar ({dueLeads.length})
            </div>
            <Link to="/leads" className="text-xs font-bold text-amber-700 underline">
              Barcha lidlar
            </Link>
          </div>
          <ul className="space-y-1.5">
            {dueLeads.slice(0, 5).map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">{lead.name || lead.phone}</span>
                <span className="text-xs text-amber-700">{formatDateTime(lead.followUpAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {isLoading || !data ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-5">
              <h2 className="text-sm font-bold text-ink">Reja bajarilishi</h2>
              <KpiBar label="Yangi mijozlar" actual={data.actual.newUsers} target={data.target.newUsers} />
              <KpiBar label="Yangi haydovchilar" actual={data.actual.newDrivers} target={data.target.newDrivers} />
              <KpiBar label="Bronlar" actual={data.actual.bookings} target={data.target.bookings} />
              <KpiBar label="Qo‘ng‘iroqlar" actual={data.actual.calls} target={data.target.calls} />
              <KpiBar label="Daromad" actual={data.actual.revenue} target={data.target.revenue} suffix=" so‘m" />
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Natija kiritish</h2>
              <form onSubmit={onLog} className="space-y-3">
                <Field label="Tur">
                  <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className={inputClass}>
                    {(Object.keys(ACTIVITY_LABEL) as ActivityKind[]).map((k) => (
                      <option key={k} value={k}>
                        {ACTIVITY_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sarlavha">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Qarshi mijoz" className={inputClass} />
                </Field>
                {kind === 'REVENUE' || kind === 'BOOKING' ? (
                  <Field label="Summa (so‘m)">
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" className={inputClass} />
                  </Field>
                ) : null}
                <Field label="Izoh">
                  <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
                </Field>
                <Button type="submit" disabled={log.isPending} className="w-full">
                  <PhoneCall className="h-4 w-4" />
                  {log.isPending ? 'Saqlanmoqda…' : 'KPI ga yozish'}
                </Button>
              </form>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-2">
              <h2 className="px-5 py-4 text-sm font-bold text-ink">Bugungi harakatlar</h2>
              <ul className="divide-y divide-line">
                {data.activities.length === 0 ? (
                  <li className="px-5 py-8 text-sm text-muted">Hali yozuv yo‘q — qo‘ng‘iroq yoki mijozni kiriting</li>
                ) : (
                  data.activities.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{a.title}</p>
                        <p className="text-xs text-muted">
                          {ACTIVITY_LABEL[a.kind]} · {formatDateTime(a.createdAt)}
                        </p>
                      </div>
                      {a.amount ? <span className="text-sm font-bold">{formatSom(a.amount)}</span> : <Badge>{ACTIVITY_LABEL[a.kind]}</Badge>}
                    </li>
                  ))
                )}
              </ul>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-brand-dark" />
                <h2 className="text-sm font-bold text-ink">Reyting</h2>
              </div>
              <ol className="space-y-2">
                {data.leaderboard.map((row, i) => (
                  <li key={row.id} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2">
                    <span className="w-5 text-sm font-extrabold text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.name || row.phone}</p>
                      <p className="text-[11px] text-muted">{row.actual.bookings} bron · {row.actual.calls} chaqiruv</p>
                    </div>
                    {row.id === user?.id ? <Users className="h-4 w-4 text-brand-dark" /> : null}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
