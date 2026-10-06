import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Headset, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { FilterPills, SearchInput } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Field, inputClass } from '../components/ui/Chart'
import { RevealSecret } from '../components/ui/RevealSecret'
import { cn, displayName, formatPhoneUz, isCompletePhoneUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import { STAFF_LABEL, STAFF_TONE } from '../lib/labels'
import type { StaffKind, StaffKpiRow, StaffRow } from '../types'

const KINDS = [
  { value: '', label: 'Barchasi' },
  { value: 'SALES', label: 'Sotuv' },
  { value: 'SUPPORT', label: 'Texnik' },
  { value: 'ADMIN', label: 'Admin' },
]

export default function Operators() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff', kind, q],
    queryFn: () => {
      const params = new URLSearchParams()
      if (kind) params.set('kind', kind)
      if (q) params.set('q', q)
      return api.get<StaffRow[]>(`/admin/staff?${params}`)
    },
    refetchInterval: 20_000,
  })

  const { data: kpis } = useQuery({
    queryKey: ['admin-staff-kpis', 'DAY'],
    queryFn: () => api.get<StaffKpiRow[]>('/admin/staff/kpis?period=DAY'),
  })

  const kpiById = new Map((kpis ?? []).map((row) => [row.operator.id, row]))

  const columns: Column<StaffRow>[] = [
    {
      header: 'Operator',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              u.online ? (u.busy ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-300',
            )}
            title={u.online ? (u.busy ? 'Band' : 'Onlayn') : 'Oflayn'}
          />
          <div>
            <p className="font-semibold text-ink">{displayName(u)}</p>
            <p className="text-xs text-muted">{formatPhoneUz(u.phone)}</p>
          </div>
        </div>
      ),
    },
    { header: 'Lavozim', cell: (u) => <Badge tone={STAFF_TONE[u.staffKind]}>{STAFF_LABEL[u.staffKind]}</Badge> },
    {
      header: 'Parol',
      cell: (u) => <RevealSecret value={u.loginPassword} empty="O‘rnatilmagan" />,
    },
    {
      header: 'KPI (bugun)',
      cell: (u) => {
        const row = kpiById.get(u.id)
        if (u.staffKind !== 'SALES') return <span className="text-muted">—</span>
        if (!row) return <span className="font-bold text-ink">0%</span>
        const avg = Math.round(
          (row.progress.newUsers + row.progress.newDrivers + row.progress.bookings + row.progress.calls) / 4,
        )
        return <span className="font-bold text-ink">{avg}%</span>
      },
    },
    {
      header: 'Holat',
      cell: (u) => (u.staffActive ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">O‘chirilgan</Badge>),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Operatorlar"
        subtitle="Xodimni bosing — parol, KPI va mijoz/haydovchi bilan aloqalar ochiladi"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Operator qo‘shish
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Ism yoki telefon" className="sm:w-72" />
        <FilterPills value={kind} onChange={setKind} options={KINDS} />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={Headset} title="Operator yo‘q" text="Admin yangi sotuv yoki texnik operator yarata oladi." />
      ) : (
        <Table columns={columns} rows={data} onRowClick={(u) => navigate(`/operators/${u.id}`)} />
      )}
      <CreateOperatorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          qc.invalidateQueries({ queryKey: ['admin-staff'] })
        }}
      />
    </div>
  )
}

function CreateOperatorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(true)
  const [kind, setKind] = useState<Exclude<StaffKind, 'ADMIN'> | 'ADMIN'>('SALES')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/admin/staff', {
        phone: toE164Uz(phone),
        name,
        password,
        kind,
      }),
    onSuccess: onCreated,
    onError: (err) => setError(err instanceof Error ? err.message : 'Xatolik'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!isCompletePhoneUz(phone)) {
      setError('Telefon raqamini to‘liq kiriting')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} title="Yangi operator" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Ism">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Telefon raqami">
          <div className={`${inputClass} flex items-center gap-2`}>
            <span className="text-sm font-bold">+998</span>
            <input
              value={maskLocalPhoneUz(phone)}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="87 735 36 36"
              type="tel"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
        </Field>
        <Field label="Parol">
          <div className="flex gap-2">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPass ? 'text' : 'password'}
              required
              minLength={6}
              className={inputClass}
            />
            <button
              type="button"
              className="shrink-0 text-xs font-bold text-brand-dark"
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? 'Yashirish' : 'Ko‘rsat'}
            </button>
          </div>
        </Field>
        <Field label="Lavozim">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={inputClass}>
            <option value="SALES">Sotuv operatori</option>
            <option value="SUPPORT">Texnik operator</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </Field>
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Yaratish'}
        </Button>
      </form>
    </Modal>
  )
}
