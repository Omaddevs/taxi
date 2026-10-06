import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlarmClock, Camera, Globe, MessageCircle, Phone, Send, Trash2, UserPlus } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { Modal } from '../components/ui/Modal'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { cn, formatDateTime, isCompletePhoneUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import { LEAD_CHANNEL_LABEL, LEAD_STATUS_LABEL, LEAD_STATUS_TONE, LEAD_TYPE_LABEL } from '../lib/labels'
import { useAuth } from '../context/AuthContext'
import type { LeadMessageRow, LeadRow, LeadStatus, LeadType } from '../types'

const COLUMNS: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']
const TYPE_TABS: { value: LeadType | 'all'; label: string }[] = [
  { value: 'all', label: 'Barchasi' },
  { value: 'PASSENGER', label: 'Yo‘lovchi' },
  { value: 'DRIVER', label: 'Haydovchi' },
]

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function Leads() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [leadType, setLeadType] = useState<LeadType | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [threadLead, setThreadLead] = useState<LeadRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leads', q, leadType],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (leadType !== 'all') params.set('leadType', leadType)
      return api.get<LeadRow[]>(`/admin/leads?${params}`)
    },
  })

  const { data: dueLeads } = useQuery({
    queryKey: ['leads', 'due'],
    queryFn: () => api.get<LeadRow[]>('/admin/leads?dueOnly=true'),
    refetchInterval: 60_000,
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => api.patch(`/admin/leads/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadRow[]>(COLUMNS.map((s) => [s, []]))
    for (const lead of data ?? []) map.get(lead.status)?.push(lead)
    return map
  }, [data])

  return (
    <div>
      <PageHeader
        title="Lidlar"
        subtitle="Qo‘ng‘iroq, tavsiya va Instagram orqali kelgan potentsial mijozlar bosqichlari"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Yangi lid
          </Button>
        }
      />

      {dueLeads?.length ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-700">
            <AlarmClock className="h-4 w-4" />
            Bugungi eslatmalar ({dueLeads.length})
          </div>
          <ul className="space-y-1.5">
            {dueLeads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">{lead.name || lead.phone || 'Instagram foydalanuvchi'}</span>
                <span className="text-xs text-amber-700">{formatDateTime(lead.followUpAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-canvas p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setLeadType(tab.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                leadType === tab.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Ism yoki telefon" className="sm:w-72" />
      </div>

      {isLoading ? (
        <SkeletonGrid count={5} />
      ) : !data?.length ? (
        <EmptyState icon={UserPlus} title="Lid yo‘q" text="Qo‘ng‘iroq, tavsiya yoki Instagram orqali kelgan mijozlarni shu yerda kuzating." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {COLUMNS.map((status) => (
            <div key={status} className="min-w-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{LEAD_STATUS_LABEL[status]}</p>
                <Badge tone={LEAD_STATUS_TONE[status]}>{byStatus.get(status)?.length ?? 0}</Badge>
              </div>
              <div className="space-y-2.5">
                {(byStatus.get(status) ?? []).map((lead) => (
                  <Card key={lead.id} className="space-y-2 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">
                          {lead.name || lead.igUsername || lead.phone || 'Ism kiritilmagan'}
                        </p>
                        {lead.phone ? (
                          <p className="flex items-center gap-1 text-xs text-muted">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove.mutate(lead.id)}
                        className="shrink-0 rounded-lg p-1 text-muted hover:bg-canvas hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={lead.leadType === 'DRIVER' ? 'amber' : 'gray'}>{LEAD_TYPE_LABEL[lead.leadType]}</Badge>
                      {lead.channel !== 'MANUAL' ? (
                        <Badge tone={lead.channel === 'WEBSITE' ? 'green' : 'pink'} className="gap-1">
                          {lead.channel === 'WEBSITE' ? <Globe className="h-3 w-3" /> : <Camera className="h-3 w-3" />}{' '}
                          {LEAD_CHANNEL_LABEL[lead.channel]}
                        </Badge>
                      ) : null}
                    </div>

                    {lead.adName ? <p className="text-xs text-muted">Reklama: {lead.adName}</p> : null}
                    {lead.note ? <p className="text-xs text-muted">{lead.note}</p> : null}
                    {user?.role === 'ADMIN' ? (
                      <p className="text-[11px] text-muted">Egasi: {lead.owner.name || lead.owner.phone}</p>
                    ) : null}

                    {lead.channel === 'INSTAGRAM_DM' ? (
                      <button
                        type="button"
                        onClick={() => setThreadLead(lead)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-bold text-brand-dark hover:bg-brand-soft"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Yozishmalar
                      </button>
                    ) : null}

                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(lead.followUpAt)}
                      onChange={(e) =>
                        update.mutate({
                          id: lead.id,
                          patch: { followUpAt: e.target.value ? new Date(e.target.value).toISOString() : null },
                        })
                      }
                      className="h-8 w-full rounded-lg border border-line bg-canvas px-2 text-xs outline-none focus:border-brand"
                    />
                    <select
                      value={lead.status}
                      onChange={(e) => update.mutate({ id: lead.id, patch: { status: e.target.value } })}
                      className="h-8 w-full rounded-lg border border-line bg-white px-2 text-xs font-semibold outline-none focus:border-brand"
                    >
                      {COLUMNS.map((s) => (
                        <option key={s} value={s}>
                          {LEAD_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
      <LeadThreadModal lead={threadLead} onClose={() => setThreadLead(null)} />
    </div>
  )
}

function CreateLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [leadType, setLeadType] = useState<LeadType>('PASSENGER')
  const [source, setSource] = useState('')
  const [note, setNote] = useState('')
  const [followUpAt, setFollowUpAt] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/admin/leads', {
        name: name.trim() || undefined,
        phone: toE164Uz(phone),
        leadType,
        source: source.trim() || undefined,
        note: note.trim() || undefined,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      setName('')
      setPhone('')
      setLeadType('PASSENGER')
      setSource('')
      setNote('')
      setFollowUpAt('')
      onCreated()
    },
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
    <Modal open={open} title="Yangi lid" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Ism (ixtiyoriy)">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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
        <Field label="Turi">
          <select value={leadType} onChange={(e) => setLeadType(e.target.value as LeadType)} className={inputClass}>
            <option value="PASSENGER">Yo‘lovchi</option>
            <option value="DRIVER">Haydovchi</option>
          </select>
        </Field>
        <Field label="Manba (ixtiyoriy)">
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Masalan: Qo‘ng‘iroq, tavsiya" className={inputClass} />
        </Field>
        <Field label="Izoh">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Eslatma vaqti (ixtiyoriy)">
          <input
            type="datetime-local"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Qo‘shish'}
        </Button>
      </form>
    </Modal>
  )
}

function LeadThreadModal({ lead, onClose }: { lead: LeadRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const { data: messages, isLoading } = useQuery({
    queryKey: ['lead-messages', lead?.id],
    queryFn: () => api.get<LeadMessageRow[]>(`/admin/leads/${lead!.id}/messages`),
    enabled: Boolean(lead),
  })

  const send = useMutation({
    mutationFn: () => api.post(`/admin/leads/${lead!.id}/messages`, { body: body.trim() }),
    onSuccess: () => {
      setBody('')
      setError('')
      qc.invalidateQueries({ queryKey: ['lead-messages', lead?.id] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Xabar yuborilmadi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    send.mutate()
  }

  return (
    <Modal open={Boolean(lead)} title={lead?.igUsername ? `@${lead.igUsername}` : 'Instagram yozishmasi'} onClose={onClose}>
      <div className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded-xl bg-canvas p-3">
        {isLoading ? (
          <p className="text-sm text-muted">Yuklanmoqda…</p>
        ) : !messages?.length ? (
          <p className="text-sm text-muted">Xabarlar yo‘q</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn('flex', m.direction === 'OUT' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                  m.direction === 'OUT' ? 'bg-brand text-ink' : 'bg-white text-ink',
                )}
              >
                <p>{m.body}</p>
                <p className={cn('mt-1 text-[10px]', m.direction === 'OUT' ? 'text-white/70' : 'text-muted')}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Javob yozing…"
          className="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        />
        <Button type="submit" size="sm" disabled={send.isPending || !body.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm font-semibold text-red-500">{error}</p> : null}
    </Modal>
  )
}
