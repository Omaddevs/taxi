import { useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlarmClock,
  ArrowRight,
  BellRing,
  Camera,
  Check,
  CheckSquare,
  Globe,
  GripVertical,
  MessageCircle,
  Phone,
  Send,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { cn, formatDateTime, isCompletePhoneUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import { LEAD_CHANNEL_LABEL, LEAD_STATUS_LABEL, LEAD_TYPE_LABEL } from '../lib/labels'
import {
  FOLLOW_UP_PRESETS,
  LEAD_COLUMNS,
  LEAD_STAGE_COLOR,
  LOST_REASONS,
  conversionRate,
  createdWithinDays,
  followUpState,
  phoneDigits,
  presetFollowUp,
  relativeAge,
  withLostReason,
} from '../lib/leads'
import { useAuth } from '../context/AuthContext'
import type { LeadMessageRow, LeadRow, LeadStatus, LeadType } from '../types'

const TYPE_TABS: { value: LeadType | 'all'; label: string }[] = [
  { value: 'all', label: 'Barchasi' },
  { value: 'PASSENGER', label: 'Yo‘lovchi' },
  { value: 'DRIVER', label: 'Haydovchi' },
]

const DRAG_MIME = 'application/x-taxiline-lead'

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function leadTitle(lead: LeadRow) {
  return lead.name || (lead.igUsername ? `@${lead.igUsername}` : null) || lead.phone || 'Ism kiritilmagan'
}

function nextStage(status: LeadStatus): LeadStatus | null {
  const i = LEAD_COLUMNS.indexOf(status)
  // CONVERTED and LOST are outcomes — there is no "next" after them.
  return i >= 0 && i < LEAD_COLUMNS.indexOf('CONVERTED') ? LEAD_COLUMNS[i + 1] : null
}

export default function Leads() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [leadType, setLeadType] = useState<LeadType | 'all'>('all')
  const [remindersOnly, setRemindersOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [threadLead, setThreadLead] = useState<LeadRow | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [losing, setLosing] = useState<LeadRow | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<LeadStatus | null>(null)
  const [error, setError] = useState('')
  // "Tanlash" mode: cards get checkboxes and a bottom bar deletes the selection in one go.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const listKey = ['leads', q, leadType] as const
  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (leadType !== 'all') params.set('leadType', leadType)
      return api.get<LeadRow[]>(`/admin/leads?${params}`)
    },
  })

  // Moving a card shows instantly; the server catches up, and a failure puts the card back.
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => api.patch<LeadRow>(`/admin/leads/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      setError('')
      await qc.cancelQueries({ queryKey: listKey })
      const previous = qc.getQueryData<LeadRow[]>(listKey)
      qc.setQueryData<LeadRow[]>(listKey, (rows) => rows?.map((l) => (l.id === id ? { ...l, ...patch } : l)))
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(listKey, ctx.previous)
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/leads/${id}`),
    onError: (err) => setError(err instanceof Error ? err.message : 'O‘chirib bo‘lmadi'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  // No bulk endpoint: one DELETE per lead, and whatever the server refuses (an operator's
  // lead that isn't theirs) is reported instead of silently skipped.
  const removeMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/admin/leads/${id}`)))
      return results.filter((r) => r.status === 'rejected').length
    },
    onSuccess: (failed, ids) => {
      setSelected(new Set())
      setSelecting(false)
      if (failed) setError(`${ids.length - failed} ta o‘chirildi, ${failed} tasini o‘chirib bo‘lmadi`)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleColumn(list: LeadRow[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const all = list.every((l) => next.has(l.id))
      for (const l of list) {
        if (all) next.delete(l.id)
        else next.add(l.id)
      }
      return next
    })
  }

  function exitSelecting() {
    setSelecting(false)
    setSelected(new Set())
  }

  function onDeleteSelected() {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`${ids.length} ta lidni o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`)) return
    removeMany.mutate(ids)
  }

  const leads = useMemo(() => {
    const all = data ?? []
    if (!remindersOnly) return all
    return all.filter((l) => {
      const s = followUpState(l.followUpAt)
      return s === 'overdue' || s === 'today'
    })
  }, [data, remindersOnly])

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadRow[]>(LEAD_COLUMNS.map((s) => [s, []]))
    for (const lead of leads) map.get(lead.status)?.push(lead)
    // Missed reminders float to the top of their column, then the freshest leads.
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ao = followUpState(a.followUpAt) === 'overdue' ? 0 : 1
        const bo = followUpState(b.followUpAt) === 'overdue' ? 0 : 1
        return ao - bo || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }
    return map
  }, [leads])

  const stats = useMemo(() => {
    const all = data ?? []
    let due = 0
    let overdue = 0
    for (const l of all) {
      const s = followUpState(l.followUpAt)
      if (s === 'overdue') overdue += 1
      if (s === 'overdue' || s === 'today') due += 1
    }
    return {
      total: all.length,
      week: createdWithinDays(all, 7),
      conversion: conversionRate(all),
      due,
      overdue,
    }
  }, [data])

  const openLead = openId ? (data ?? []).find((l) => l.id === openId) ?? null : null

  function moveTo(lead: LeadRow, status: LeadStatus) {
    if (lead.status === status) return
    if (status === 'LOST') {
      setLosing(lead)
      return
    }
    // A closed lead needs no more reminders — otherwise it keeps showing up as "overdue".
    update.mutate({ id: lead.id, patch: status === 'CONVERTED' ? { status, followUpAt: null } : { status } })
  }

  function onDrop(e: DragEvent, status: LeadStatus) {
    e.preventDefault()
    setOverColumn(null)
    const id = e.dataTransfer.getData(DRAG_MIME) || dragId
    setDragId(null)
    const lead = (data ?? []).find((l) => l.id === id)
    if (lead) moveTo(lead, status)
  }

  function onDelete(lead: LeadRow) {
    if (!window.confirm(`“${leadTitle(lead)}” lidini o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`)) return
    remove.mutate(lead.id)
    if (openId === lead.id) setOpenId(null)
  }

  return (
    <div>
      <PageHeader
        title="Lidlar"
        subtitle="Kartani sudrab keyingi bosqichga o‘tkazing. Bosilsa, to‘liq ma’lumot ochiladi"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Yangi lid
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Jami lidlar" value={String(stats.total)} hint={`${stats.week} tasi oxirgi 7 kunda`} />
        <StatCard icon={TrendingUp} label="Konversiya" value={`${stats.conversion}%`} hint="Mijozga aylanganlar ulushi" tone="success" />
        <StatCard
          icon={BellRing}
          label="Bugungi eslatmalar"
          value={String(stats.due)}
          hint={stats.overdue ? `${stats.overdue} tasi muddati o‘tgan` : 'Muddati o‘tgani yo‘q'}
          tone="amber"
        />
        <StatCard
          icon={Target}
          label="Ishlanmoqda"
          value={String((byStatus.get('CONTACTED')?.length ?? 0) + (byStatus.get('QUALIFIED')?.length ?? 0))}
          hint="Bog‘lanilgan va malakali"
          tone="slate"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setLeadType(tab.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                leadType === tab.value ? 'bg-ink text-white' : 'text-muted hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Ism yoki telefon" className="sm:w-72" />
        <button
          type="button"
          onClick={() => setRemindersOnly((v) => !v)}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold ring-1 transition-colors',
            remindersOnly ? 'bg-amber-50 text-amber-700 ring-amber-300' : 'bg-white text-muted ring-line hover:text-ink',
          )}
        >
          <AlarmClock className="h-4 w-4" />
          Bugungi eslatmalar
          {stats.due ? (
            <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{stats.due}</span>
          ) : null}
        </button>
        {data?.length ? (
          <button
            type="button"
            onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold ring-1 transition-colors sm:ml-auto',
              selecting ? 'bg-ink text-white ring-ink' : 'bg-white text-muted ring-line hover:text-ink',
            )}
          >
            <CheckSquare className="h-4 w-4" />
            {selecting ? 'Tanlashni yakunlash' : 'Tanlash'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>
      ) : null}

      {isLoading ? (
        <SkeletonGrid count={5} />
      ) : !data?.length ? (
        <EmptyState icon={UserPlus} title="Lid yo‘q" text="Qo‘ng‘iroq, tavsiya yoki Instagram orqali kelgan mijozlarni shu yerda kuzating." />
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
          {LEAD_COLUMNS.map((status) => {
            const list = byStatus.get(status) ?? []
            const isOver = overColumn === status && dragId != null
            return (
              <section
                key={status}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (overColumn !== status) setOverColumn(status)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverColumn(null)
                }}
                onDrop={(e) => onDrop(e, status)}
                className={cn(
                  'flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/60 ring-1 ring-line transition-colors xl:w-auto xl:min-w-[196px] xl:flex-1',
                  isOver && 'bg-white ring-2',
                )}
                style={isOver ? { boxShadow: `0 0 0 2px ${LEAD_STAGE_COLOR[status]}` } : undefined}
              >
                <header className="flex items-center gap-2 rounded-t-2xl border-t-[3px] px-3 pb-2 pt-3" style={{ borderColor: LEAD_STAGE_COLOR[status] }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: LEAD_STAGE_COLOR[status] }} />
                  <p className="flex-1 truncate text-xs font-extrabold uppercase tracking-wide text-ink">{LEAD_STATUS_LABEL[status]}</p>
                  {selecting && list.length ? (
                    <button
                      type="button"
                      onClick={() => toggleColumn(list)}
                      className="text-[11px] font-bold text-brand-dark hover:underline"
                    >
                      {list.every((l) => selected.has(l.id)) ? 'Bekor' : 'Hammasi'}
                    </button>
                  ) : null}
                  <span
                    className="min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold"
                    style={{ background: `${LEAD_STAGE_COLOR[status]}1a`, color: LEAD_STAGE_COLOR[status] }}
                  >
                    {list.length}
                  </span>
                </header>

                <div className="flex min-h-[440px] flex-1 flex-col gap-2.5 p-2">
                  {list.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      showOwner={user?.role === 'ADMIN'}
                      dragging={dragId === lead.id}
                      selecting={selecting}
                      selected={selected.has(lead.id)}
                      onToggleSelect={() => toggleSelected(lead.id)}
                      onDelete={() => onDelete(lead)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, lead.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDragId(lead.id)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverColumn(null)
                      }}
                      onOpen={() => setOpenId(lead.id)}
                      onAdvance={() => {
                        const next = nextStage(lead.status)
                        if (next) moveTo(lead, next)
                      }}
                    />
                  ))}
                  {!list.length || isOver ? (
                    <div
                      className={cn(
                        'flex flex-1 items-center justify-center rounded-xl border-2 border-dashed p-4 text-center text-xs font-semibold transition-colors',
                        isOver ? 'min-h-24 border-current text-ink' : 'min-h-24 border-line text-muted',
                      )}
                      style={isOver ? { color: LEAD_STAGE_COLOR[status] } : undefined}
                    >
                      {isOver ? 'Shu yerga tashlang' : 'Bo‘sh — kartani shu yerga sudrang'}
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {selecting ? (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ink py-2.5 pl-5 pr-2.5 text-white shadow-2xl">
            <span className="text-sm font-bold">{selected.size} ta tanlandi</span>
            <button type="button" onClick={exitSelecting} className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={!selected.size || removeMany.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              {removeMany.isPending ? 'O‘chirilmoqda…' : 'O‘chirish'}
            </button>
          </div>
        </div>
      ) : null}

      <LeadDrawer
        lead={openLead}
        onClose={() => setOpenId(null)}
        onSave={(patch) => openLead && update.mutate({ id: openLead.id, patch })}
        onMove={(status) => openLead && moveTo(openLead, status)}
        onDelete={() => openLead && onDelete(openLead)}
        onThread={() => openLead && setThreadLead(openLead)}
      />
      <LostReasonModal
        key={losing?.id ?? 'none'}
        lead={losing}
        onClose={() => setLosing(null)}
        onConfirm={(reason) => {
          if (!losing) return
          update.mutate({
            id: losing.id,
            patch: { status: 'LOST', followUpAt: null, ...(reason ? { note: withLostReason(losing.note, reason) } : {}) },
          })
          setLosing(null)
        }}
      />
      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
      <LeadThreadModal lead={threadLead} onClose={() => setThreadLead(null)} />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------------------------

function ChannelBadge({ lead }: { lead: LeadRow }) {
  if (lead.channel === 'MANUAL') return lead.source ? <Badge tone="gray">{lead.source}</Badge> : null
  return (
    <Badge tone={lead.channel === 'WEBSITE' ? 'green' : 'pink'} className="gap-1">
      {lead.channel === 'WEBSITE' ? <Globe className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
      {LEAD_CHANNEL_LABEL[lead.channel]}
    </Badge>
  )
}

function FollowUpChip({ iso }: { iso: string | null }) {
  const state = followUpState(iso)
  if (!state) return <span className="text-[11px] text-muted">Eslatma yo‘q</span>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        state === 'overdue' && 'bg-red-50 text-red-600',
        state === 'today' && 'bg-amber-50 text-amber-700',
        state === 'later' && 'bg-canvas text-muted',
      )}
    >
      <AlarmClock className="h-3 w-3" />
      {state === 'overdue' ? 'Kechikdi · ' : ''}
      {formatDateTime(iso)}
    </span>
  )
}

function LeadCard({
  lead,
  showOwner,
  dragging,
  selecting,
  selected,
  onToggleSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  onOpen,
  onAdvance,
}: {
  lead: LeadRow
  showOwner: boolean
  dragging: boolean
  selecting: boolean
  selected: boolean
  onToggleSelect: () => void
  onDelete: () => void
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onOpen: () => void
  onAdvance: () => void
}) {
  const next = nextStage(lead.status)
  const digits = phoneDigits(lead.phone)
  return (
    <article
      draggable={!selecting}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={selecting ? onToggleSelect : onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (selecting ? onToggleSelect : onOpen)()
      }}
      tabIndex={0}
      aria-selected={selecting ? selected : undefined}
      className={cn(
        'group relative rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,42,67,0.06)] ring-1 ring-line transition hover:shadow-[0_8px_20px_rgba(16,42,67,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        selecting ? 'cursor-pointer' : 'cursor-grab hover:-translate-y-0.5 active:cursor-grabbing',
        selected && 'bg-red-50/40 ring-2 ring-red-400',
        dragging && 'rotate-1 opacity-40',
      )}
    >
      {selecting ? null : (
        <GripVertical className="absolute right-1.5 top-3 h-4 w-4 text-line opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      <div className="flex items-start gap-2.5 pr-4">
        {selecting ? (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              selected ? 'border-red-500 bg-red-500 text-white' : 'border-line bg-white text-transparent',
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        ) : (
          <Avatar name={lead.name || lead.igUsername} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink" title={leadTitle(lead)}>
            {leadTitle(lead)}
          </p>
          <p className="truncate text-xs text-muted" title={formatDateTime(lead.createdAt)}>
            {[lead.phone, relativeAge(lead.createdAt)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge tone={lead.leadType === 'DRIVER' ? 'amber' : 'gray'}>{LEAD_TYPE_LABEL[lead.leadType]}</Badge>
        <ChannelBadge lead={lead} />
      </div>

      {lead.note ? <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-muted">{lead.note}</p> : null}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <FollowUpChip iso={lead.followUpAt} />
        {showOwner && lead.owner.name ? (
          <span title={`Egasi: ${lead.owner.name}`} className="shrink-0">
            <Avatar name={lead.owner.name} size="sm" />
          </span>
        ) : null}
      </div>

      {/* Quick actions — also the way to move a card without a mouse (touch, keyboard). */}
      <div className={cn('mt-2 flex gap-1.5', selecting && 'hidden')} onClick={(e) => e.stopPropagation()}>
        {digits ? (
          <a
            href={`tel:+${digits}`}
            title="Qo‘ng‘iroq qilish"
            className="flex h-7 flex-1 items-center justify-center rounded-lg bg-canvas text-muted hover:bg-brand-soft hover:text-brand-dark"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        ) : null}
        {digits ? (
          <a
            href={`https://t.me/+${digits}`}
            target="_blank"
            rel="noreferrer"
            title="Telegramda yozish"
            className="flex h-7 flex-1 items-center justify-center rounded-lg bg-canvas text-muted hover:bg-sky-50 hover:text-sky-600"
          >
            <Send className="h-3.5 w-3.5" />
          </a>
        ) : null}
        {next ? (
          <button
            type="button"
            onClick={onAdvance}
            title={`${LEAD_STATUS_LABEL[next]} bosqichiga o‘tkazish`}
            className="flex h-7 flex-[2] items-center justify-center gap-1 rounded-lg bg-canvas text-[11px] font-bold text-muted hover:bg-ink hover:text-white"
          >
            {LEAD_STATUS_LABEL[next]} <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          title="O‘chirish"
          aria-label="Lidni o‘chirish"
          className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------------------------

function LeadDrawer({
  lead,
  onClose,
  onSave,
  onMove,
  onDelete,
  onThread,
}: {
  lead: LeadRow | null
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => void
  onMove: (status: LeadStatus) => void
  onDelete: () => void
  onThread: () => void
}) {
  if (!lead) return null
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Yopish" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <DrawerBody key={lead.id} lead={lead} onClose={onClose} onSave={onSave} onMove={onMove} onDelete={onDelete} onThread={onThread} />
      </aside>
    </div>
  )
}

function DrawerBody({
  lead,
  onClose,
  onSave,
  onMove,
  onDelete,
  onThread,
}: {
  lead: LeadRow
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => void
  onMove: (status: LeadStatus) => void
  onDelete: () => void
  onThread: () => void
}) {
  const [name, setName] = useState(lead.name ?? '')
  const [leadType, setLeadType] = useState<LeadType>(lead.leadType)
  const [source, setSource] = useState(lead.source ?? '')
  const [note, setNote] = useState(lead.note ?? '')
  const [followUp, setFollowUp] = useState(toDatetimeLocal(lead.followUpAt))
  const digits = phoneDigits(lead.phone)

  const patch: Record<string, unknown> = {}
  if (name.trim() !== (lead.name ?? '')) patch.name = name.trim()
  if (leadType !== lead.leadType) patch.leadType = leadType
  if (source.trim() !== (lead.source ?? '')) patch.source = source.trim()
  if (note.trim() !== (lead.note ?? '')) patch.note = note.trim()
  if (followUp !== toDatetimeLocal(lead.followUpAt)) patch.followUpAt = followUp ? new Date(followUp).toISOString() : null
  const dirty = Object.keys(patch).length > 0

  function submit(e: FormEvent) {
    e.preventDefault()
    if (dirty) onSave(patch)
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-line p-5">
        <Avatar name={lead.name || lead.igUsername} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-ink">{leadTitle(lead)}</p>
          <p className="text-xs text-muted">
            {LEAD_CHANNEL_LABEL[lead.channel]} · {formatDateTime(lead.createdAt)}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Yopish">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={digits ? `tel:+${digits}` : undefined}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-ink',
              !digits && 'pointer-events-none opacity-40',
            )}
          >
            <Phone className="h-4 w-4" /> Qo‘ng‘iroq
          </a>
          {lead.channel === 'INSTAGRAM_DM' ? (
            <button type="button" onClick={onThread} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-pink-50 text-sm font-bold text-pink-600">
              <MessageCircle className="h-4 w-4" /> Yozishmalar
            </button>
          ) : (
            <a
              href={digits ? `https://t.me/+${digits}` : undefined}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-50 text-sm font-bold text-sky-600',
                !digits && 'pointer-events-none opacity-40',
              )}
            >
              <Send className="h-4 w-4" /> Telegram
            </a>
          )}
        </div>

        <DrawerSection title="Bosqich">
          <div className="grid grid-cols-5 gap-1">
            {LEAD_COLUMNS.map((s) => {
              const active = lead.status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onMove(s)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold leading-tight transition-colors',
                    active ? 'text-white' : 'bg-canvas text-muted hover:text-ink',
                  )}
                  style={active ? { background: LEAD_STAGE_COLOR[s] } : undefined}
                >
                  {active ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: LEAD_STAGE_COLOR[s] }} />}
                  {LEAD_STATUS_LABEL[s]}
                </button>
              )
            })}
          </div>
        </DrawerSection>

        <DrawerSection title="Eslatma">
          <input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={inputClass} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FOLLOW_UP_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setFollowUp(toDatetimeLocal(presetFollowUp(p.value).toISOString()))}
                className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-canvas"
              >
                {p.label}
              </button>
            ))}
            {followUp ? (
              <button type="button" onClick={() => setFollowUp('')} className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted hover:text-red-500">
                Olib tashlash
              </button>
            ) : null}
          </div>
        </DrawerSection>

        <DrawerSection title="Ma’lumotlar">
          <div className="space-y-3">
            <Field label="Ism">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ism kiritilmagan" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Turi">
                <select value={leadType} onChange={(e) => setLeadType(e.target.value as LeadType)} className={inputClass}>
                  <option value="PASSENGER">Yo‘lovchi</option>
                  <option value="DRIVER">Haydovchi</option>
                </select>
              </Field>
              <Field label="Manba">
                <input value={source} onChange={(e) => setSource(e.target.value)} className={inputClass} placeholder="Qo‘ng‘iroq, tavsiya…" />
              </Field>
            </div>
            <Field label="Izoh">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                placeholder="Suhbat natijasi, kelishuvlar…"
              />
            </Field>
          </div>
        </DrawerSection>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-canvas p-3 text-xs">
          <dt className="text-muted">Telefon</dt>
          <dd className="font-semibold text-ink">{lead.phone || '—'}</dd>
          {lead.igUsername ? (
            <>
              <dt className="text-muted">Instagram</dt>
              <dd className="font-semibold text-ink">@{lead.igUsername}</dd>
            </>
          ) : null}
          {lead.adName ? (
            <>
              <dt className="text-muted">Reklama</dt>
              <dd className="font-semibold text-ink">{lead.adName}</dd>
            </>
          ) : null}
          <dt className="text-muted">Egasi</dt>
          <dd className="font-semibold text-ink">{lead.owner.name || lead.owner.phone}</dd>
          <dt className="text-muted">Yangilangan</dt>
          <dd className="font-semibold text-ink">{formatDateTime(lead.updatedAt)}</dd>
        </dl>
      </div>

      <footer className="flex items-center gap-2 border-t border-line p-4">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-3.5 text-sm font-bold text-red-500 ring-1 ring-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> O‘chirish
        </button>
        <Button type="submit" disabled={!dirty} className="flex-1">
          {dirty ? 'O‘zgarishlarni saqlash' : 'Saqlangan'}
        </Button>
      </footer>
    </form>
  )
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">{title}</p>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------------------------
// Lost reason
// ---------------------------------------------------------------------------------------------

function LostReasonModal({
  lead,
  onClose,
  onConfirm,
}: {
  lead: LeadRow | null
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={Boolean(lead)} title="Nega yo‘qotildi?" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        “{lead ? leadTitle(lead) : ''}”. Sabab izohga yoziladi. Keyinchalik qaysi sababdan ko‘p mijoz yo‘qotilayotganini ko‘rasiz.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LOST_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-semibold',
              reason === r ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-line text-ink hover:bg-canvas',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Yoki o‘zingiz yozing" maxLength={200} />
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onConfirm('')}>
          Sababsiz
        </Button>
        <Button variant="danger" className="flex-1" onClick={() => onConfirm(reason.trim())} disabled={!reason.trim()}>
          Yo‘qotildi deb belgilash
        </Button>
      </div>
    </Modal>
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
