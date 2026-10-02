import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { LifeBuoy, MessageSquareText, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { Table, type Column } from '../components/ui/Table'
import { FilterPills, SearchInput } from '../components/ui/Filters'
import { EmptyState, SkeletonGrid, SkeletonTable } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Field, inputClass } from '../components/ui/Chart'
import { formatDateTime, displayName } from '../lib/utils'
import { TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL, TICKET_STATUS_TONE } from '../lib/labels'
import { PeopleSearch } from '../components/people/PeopleSearch'
import type { TicketCategory, TicketPriority, TicketRow, TicketStats } from '../types'

export default function SupportDashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get<TicketStats>('/admin/tickets/stats'),
    refetchInterval: 20_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', status, q],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (q) params.set('q', q)
      return api.get<TicketRow[]>(`/admin/tickets?${params}`)
    },
  })

  const columns: Column<TicketRow>[] = [
    { header: '№', cell: (t) => <span className="font-bold">#{t.ticketNo}</span> },
    {
      header: 'Mavzu',
      cell: (t) => (
        <div>
          <p className="font-semibold text-ink">{t.subject}</p>
          <p className="text-xs text-muted">{t.requesterName || t.requesterPhone || '—'}</p>
        </div>
      ),
    },
    { header: 'Kategoriya', cell: (t) => TICKET_CATEGORY_LABEL[t.category] },
    { header: 'Ustuvorlik', cell: (t) => TICKET_PRIORITY_LABEL[t.priority] },
    { header: 'Holat', cell: (t) => <Badge tone={TICKET_STATUS_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge> },
    {
      header: 'SLA',
      cell: (t) =>
        t.status === 'RESOLVED' || t.status === 'CLOSED' ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <Badge tone={t.slaBreached ? 'red' : 'gray'}>{t.slaBreached ? 'Muddat o‘tdi' : 'Muddatida'}</Badge>
        ),
    },
    { header: 'Mas’ul', cell: (t) => (t.assignee ? displayName(t.assignee) : '—') },
    { header: 'Sana', cell: (t) => formatDateTime(t.createdAt) },
  ]

  return (
    <div>
      <PageHeader
        title="Texnik xizmat"
        subtitle="Murojaatlar navbati va yechimlar"
        action={
          <div className="flex gap-2">
            <Link to="/canned-responses">
              <Button variant="outline">
                <MessageSquareText className="h-4 w-4" />
                Shablonlar
              </Button>
            </Link>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Murojaat
            </Button>
          </div>
        }
      />

      <PeopleSearch />

      {statsLoading || !stats ? (
        <SkeletonGrid count={4} />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={LifeBuoy} label="Ochiq" value={String(stats.open)} />
          <StatCard icon={LifeBuoy} label="Shoshilinch" value={String(stats.urgent)} tone="amber" />
          <StatCard icon={LifeBuoy} label="Bugun yechilgan" value={String(stats.resolvedToday)} tone="success" />
          <StatCard icon={LifeBuoy} label="O‘rtacha yechim" value={`${stats.avgResolveHours} soat`} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Mavzu yoki telefon" className="sm:w-72" />
        <FilterPills
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'Barchasi' },
            { value: 'OPEN', label: 'Yangi' },
            { value: 'IN_PROGRESS', label: 'Jarayonda' },
            { value: 'WAITING', label: 'Kutilmoqda' },
            { value: 'RESOLVED', label: 'Hal qilindi' },
          ]}
        />
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={LifeBuoy} title="Murojaat yo‘q" />
      ) : (
        <Table columns={columns} rows={data} onRowClick={(t) => navigate(`/tickets/${t.id}`)} />
      )}

      <CreateTicketModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(id) => {
          setOpen(false)
          qc.invalidateQueries({ queryKey: ['tickets'] })
          qc.invalidateQueries({ queryKey: ['ticket-stats'] })
          navigate(`/tickets/${id}`)
        }}
      />
    </div>
  )
}

function CreateTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('TECHNICAL')
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [requesterName, setRequesterName] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post<TicketRow>('/admin/tickets', {
        subject,
        description,
        category,
        priority,
        requesterPhone: requesterPhone || undefined,
        requesterName: requesterName || undefined,
      }),
    onSuccess: (row) => onCreated(row.id),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal open={open} title="Yangi murojaat" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Mavzu">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Tavsif">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className={`${inputClass} h-auto py-2`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategoriya">
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className={inputClass}>
              {(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((k) => (
                <option key={k} value={k}>
                  {TICKET_CATEGORY_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ustuvorlik">
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className={inputClass}>
              {(Object.keys(TICKET_PRIORITY_LABEL) as TicketPriority[]).map((k) => (
                <option key={k} value={k}>
                  {TICKET_PRIORITY_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Mijoz ismi">
          <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Telefon">
          <input value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} className={inputClass} />
        </Field>
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Yaratilmoqda…' : 'Ochish'}
        </Button>
      </form>
    </Modal>
  )
}
