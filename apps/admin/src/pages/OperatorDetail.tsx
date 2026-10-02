import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Monitor, PhoneCall, ShieldOff, Target, Users } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { KpiBar } from '../components/ui/KpiBar'
import { RevealSecret } from '../components/ui/RevealSecret'
import { SkeletonTable } from '../components/ui/EmptyState'
import { StatCard } from '../components/ui/StatCard'
import { displayName, formatDateTime, formatPhoneUz, formatSom, isCompletePhoneUz, localPhoneDigitsUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import { ACTIVITY_LABEL, STAFF_LABEL, STAFF_TONE, TICKET_STATUS_LABEL, TICKET_STATUS_TONE } from '../lib/labels'
import type { KpiPeriod, SessionRow, StaffDetail, StaffKind } from '../types'

const PERIODS = [
  { value: 'DAY', label: 'Bugun' },
  { value: 'WEEK', label: 'Hafta' },
  { value: 'MONTH', label: 'Oy' },
]

export default function OperatorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [period, setPeriod] = useState<KpiPeriod>('DAY')
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(true)
  const [kind, setKind] = useState<StaffKind>('SALES')
  const [active, setActive] = useState(true)

  const [newUsers, setNewUsers] = useState('10')
  const [newDrivers, setNewDrivers] = useState('3')
  const [bookings, setBookings] = useState('8')
  const [calls, setCalls] = useState('20')
  const [revenue, setRevenue] = useState('1000000')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff-detail', id],
    queryFn: () => api.get<StaffDetail>(`/admin/staff/${id}`),
  })

  useEffect(() => {
    if (!data) return
    setName(data.name || '')
    setPhone(localPhoneDigitsUz(data.phone))
    setKind(data.staffKind)
    setActive(data.staffActive)
  }, [data])

  useEffect(() => {
    if (!data) return
    const slice = data.kpis.find((k) => k.period === period) ?? data.kpis[0]
    if (slice) {
      setNewUsers(String(slice.target.newUsers || 0))
      setNewDrivers(String(slice.target.newDrivers || 0))
      setBookings(String(slice.target.bookings || 0))
      setCalls(String(slice.target.calls || 0))
      setRevenue(String(slice.target.revenue || 0))
    }
  }, [data, period])

  const slice = useMemo(() => data?.kpis.find((k) => k.period === period), [data, period])

  const save = useMutation({
    mutationFn: () => {
      if (!isCompletePhoneUz(phone)) throw new Error('Telefon raqamini to‘liq kiriting')
      const trimmedName = name.trim()
      return api.patch(`/admin/staff/${id}`, {
        phone: toE164Uz(phone),
        kind,
        staffActive: active,
        ...(trimmedName.length >= 2 ? { name: trimmedName } : {}),
        ...(password.trim() ? { password: password.trim() } : {}),
      })
    },
    onSuccess: () => {
      setPassword('')
      setFormError('')
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['admin-staff-detail', id] })
      qc.invalidateQueries({ queryKey: ['admin-staff'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => setFormError(err instanceof ApiError || err instanceof Error ? err.message : 'Xatolik'),
  })

  const saveKpi = useMutation({
    mutationFn: () =>
      api.post(`/admin/staff/${id}/kpi`, {
        period,
        newUsers: Number(newUsers) || 0,
        newDrivers: Number(newDrivers) || 0,
        bookings: Number(bookings) || 0,
        calls: Number(calls) || 0,
        revenue: Number(revenue) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-staff-detail', id] })
      qc.invalidateQueries({ queryKey: ['admin-staff-kpis'] })
    },
  })

  function onSave(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  if (isLoading || !data) return <SkeletonTable />

  const isSales = data.staffKind === 'SALES'
  const isSupport = data.staffKind === 'SUPPORT'

  return (
    <div>
      <PageHeader
        title={displayName(data)}
        subtitle={`${STAFF_LABEL[data.staffKind]} · ${formatPhoneUz(data.phone)}`}
        onBack={() => navigate('/operators')}
        backLabel="Operatorlar"
        action={
          <div className="flex gap-2">
            <Badge tone={data.online ? (data.busy ? 'amber' : 'green') : 'gray'}>
              {data.online ? (data.busy ? 'Band' : 'Onlayn') : 'Oflayn'}
            </Badge>
            <Badge tone={data.staffActive ? 'green' : 'gray'}>{data.staffActive ? 'Faol' : 'O‘chirilgan'}</Badge>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Users} label="Mijozlar bilan aloqa" value={String(data.contacts.customers)} />
        <StatCard icon={Users} label="Haydovchilar bilan aloqa" value={String(data.contacts.drivers)} tone="amber" />
        <StatCard icon={PhoneCall} label="Qo‘ng‘iroqlar" value={String(data.contacts.calls)} />
        <StatCard
          icon={Target}
          label={isSupport ? 'Yechilgan murojaat' : 'Bronlar'}
          value={String(isSupport ? data.contacts.ticketsResolved : data.contacts.bookings)}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 p-5 xl:col-span-1">
          <h2 className="text-sm font-bold text-ink">Kirish ma’lumotlari</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Telefon</dt>
              <dd className="font-semibold">{formatPhoneUz(data.phone)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted">Parol</dt>
              <dd>
                <RevealSecret value={data.loginPassword} empty="O‘rnatib saqlang" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Lavozim</dt>
              <dd>
                <Badge tone={STAFF_TONE[data.staffKind]}>{STAFF_LABEL[data.staffKind]}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Qo‘shilgan</dt>
              <dd className="font-semibold">{formatDateTime(data.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Oxirgi kirish</dt>
              <dd className="font-semibold">{formatDateTime(data.lastSeenAt)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            Parol saqlang — darhol shu yerda Ko‘rsat orqali ko‘rinadi. Ism bo‘sh bo‘lsa ham telefon va parol saqlanadi.
          </p>
          <form onSubmit={onSave} className="space-y-3 border-t border-line pt-4">
            <Field label="Ism">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Masalan: Ali"
              />
            </Field>
            <Field label="Telefon">
              <div className={`${inputClass} flex items-center gap-2`}>
                <span className="text-sm font-bold">+998</span>
                <input
                  value={maskLocalPhoneUz(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            </Field>
            <Field label="Yangi parol">
              <div className="flex gap-2">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  minLength={6}
                  placeholder="Bo‘sh — o‘zgarmaydi"
                  className={inputClass}
                  autoComplete="new-password"
                />
                <button type="button" className="shrink-0 text-xs font-bold text-brand" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? 'Yashirish' : 'Ko‘rsat'}
                </button>
              </div>
            </Field>
            <Field label="Lavozim">
              <select value={kind} onChange={(e) => setKind(e.target.value as StaffKind)} className={inputClass}>
                <option value="SALES">Sotuv operatori</option>
                <option value="SUPPORT">Texnik operator</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Faol
            </label>
            {formError ? <p className="text-sm font-semibold text-red-500">{formError}</p> : null}
            {saved ? <p className="text-sm font-semibold text-emerald-600">Saqlandi</p> : null}
            <Button type="submit" disabled={save.isPending} className="w-full">
              {save.isPending ? 'Saqlanmoqda…' : 'Ma’lumotlarni saqlash'}
            </Button>
          </form>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <SessionsCard operatorId={data.id} />

          {isSales && slice ? (
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink">KPI</h2>
                <FilterPills options={PERIODS} value={period} onChange={(v) => setPeriod(v as KpiPeriod)} />
              </div>
              <div className="space-y-3">
                <KpiBar label="Yangi mijozlar" actual={slice.actual.newUsers} target={slice.target.newUsers} />
                <KpiBar label="Yangi haydovchilar" actual={slice.actual.newDrivers} target={slice.target.newDrivers} />
                <KpiBar label="Bronlar" actual={slice.actual.bookings} target={slice.target.bookings} />
                <KpiBar label="Qo‘ng‘iroqlar" actual={slice.actual.calls} target={slice.target.calls} />
                <KpiBar label="Daromad" actual={slice.actual.revenue} target={slice.target.revenue} suffix=" so‘m" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Field label="Reja: mijozlar">
                  <input value={newUsers} onChange={(e) => setNewUsers(e.target.value)} type="number" className={inputClass} />
                </Field>
                <Field label="Reja: haydovchilar">
                  <input value={newDrivers} onChange={(e) => setNewDrivers(e.target.value)} type="number" className={inputClass} />
                </Field>
                <Field label="Reja: bronlar">
                  <input value={bookings} onChange={(e) => setBookings(e.target.value)} type="number" className={inputClass} />
                </Field>
                <Field label="Reja: qo‘ng‘iroqlar">
                  <input value={calls} onChange={(e) => setCalls(e.target.value)} type="number" className={inputClass} />
                </Field>
                <div className="col-span-2">
                  <Field label="Reja: daromad (so‘m)">
                    <input value={revenue} onChange={(e) => setRevenue(e.target.value)} type="number" className={inputClass} />
                  </Field>
                </div>
              </div>
              <Button className="mt-4" disabled={saveKpi.isPending} onClick={() => saveKpi.mutate()}>
                {saveKpi.isPending ? 'Saqlanmoqda…' : 'KPI rejasini saqlash'}
              </Button>
            </Card>
          ) : null}

          {isSupport ? (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Texnik xizmat</h2>
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <MiniStat label="Biriktirilgan" value={data.contacts.ticketsAssigned} />
                <MiniStat label="Ochiq" value={data.contacts.ticketsOpen} />
                <MiniStat label="Yechilgan" value={data.contacts.ticketsResolved} />
                <MiniStat label="Yaratgan" value={data.contacts.ticketsCreated} />
              </div>
              {data.assignedTickets.length === 0 ? (
                <p className="text-sm text-muted">Murojaat yo‘q</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.assignedTickets.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2.5 text-left"
                        onClick={() => navigate(`/tickets/${t.id}`)}
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            #{t.ticketNo} {t.subject}
                          </p>
                          <p className="text-xs text-muted">
                            {t.requesterName || t.requesterPhone || 'Mijoz'} · {formatDateTime(t.createdAt)}
                          </p>
                        </div>
                        <Badge tone={TICKET_STATUS_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Harakatlar jurnali</h2>
            {data.activities.length === 0 ? (
              <p className="text-sm text-muted">
                {isSales ? 'KPI yozuvlari hali yo‘q' : 'Sotuv KPI yozuvlari yo‘q — texnik ish murojaatlar orqali yuritiladi'}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.activities.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-ink">{a.title}</p>
                      <p className="text-xs text-muted">
                        {ACTIVITY_LABEL[a.kind]} · {formatDateTime(a.createdAt)}
                      </p>
                      {a.note ? <p className="mt-0.5 text-xs text-muted">{a.note}</p> : null}
                    </div>
                    {a.amount ? <span className="text-sm font-bold">{formatSom(a.amount)}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function SessionsCard({ operatorId }: { operatorId: string }) {
  const qc = useQueryClient()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['staff-sessions', operatorId],
    queryFn: () => api.get<SessionRow[]>(`/admin/staff/${operatorId}/sessions`),
  })

  const revoke = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/admin/staff/${operatorId}/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-sessions', operatorId] }),
  })

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Monitor className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-bold text-ink">Faol sessiyalar</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted">Yuklanmoqda…</p>
      ) : !sessions?.length ? (
        <p className="text-sm text-muted">Faol sessiya yo‘q</p>
      ) : (
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{s.userAgent || 'Noma’lum qurilma'}</p>
                <p className="text-xs text-muted">
                  {s.ip || 'IP noma’lum'} · {formatDateTime(s.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke.mutate(s.id)}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
              >
                <ShieldOff className="h-3.5 w-3.5" />
                Chiqarish
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-extrabold text-ink">{value}</p>
    </div>
  )
}
