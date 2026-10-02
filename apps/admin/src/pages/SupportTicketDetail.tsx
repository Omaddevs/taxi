import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Car, Link2, Star, Ticket as TicketIcon, Unlink } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { formatDateTime, formatSom, displayName } from '../lib/utils'
import { TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL, TICKET_STATUS_TONE } from '../lib/labels'
import type { BookingLookupRow, CannedResponseRow, DriverLookupRow, TicketDetail, TicketStatus } from '../types'
import { useAuth } from '../context/AuthContext'

export default function SupportTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)

  const { data } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get<TicketDetail>(`/admin/tickets/${id}`),
    enabled: Boolean(id),
  })

  const patch = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/admin/tickets/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const message = useMutation({
    mutationFn: () => api.post(`/admin/tickets/${id}/messages`, { body, internal }),
    onSuccess: () => {
      setBody('')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  function onReply(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    message.mutate()
  }

  if (!data) return <p className="text-sm text-muted">Yuklanmoqda…</p>

  return (
    <div>
      <PageHeader
        title={`#${data.ticketNo} · ${data.subject}`}
        subtitle={`${data.requesterName || data.requesterPhone || 'Mijoz ko‘rsatilmagan'} · ${formatDateTime(data.createdAt)}`}
        onBack={() => navigate('/support')}
        backLabel="Navbat"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => patch.mutate({ claim: true })}>
              O‘zime olish
            </Button>
            <select
              value={data.status}
              onChange={(e) => patch.mutate({ status: e.target.value as TicketStatus })}
              className="h-9 rounded-xl border border-line bg-white px-3 text-sm font-semibold"
            >
              {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TICKET_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={TICKET_STATUS_TONE[data.status]}>{TICKET_STATUS_LABEL[data.status]}</Badge>
        <Badge>{TICKET_CATEGORY_LABEL[data.category]}</Badge>
        <Badge tone="amber">{TICKET_PRIORITY_LABEL[data.priority]}</Badge>
        <Badge tone="gray">Mas’ul: {data.assignee ? displayName(data.assignee) : 'Biriktirilmagan'}</Badge>
        {data.status === 'RESOLVED' || data.status === 'CLOSED' ? null : (
          <Badge tone={data.slaBreached ? 'red' : 'gray'}>
            {data.slaBreached ? 'SLA muddati o‘tdi' : `SLA: ${formatDateTime(data.slaDueAt)} gacha`}
          </Badge>
        )}
      </div>

      {data.satisfactionRating !== null ? (
        <Card className="mb-4 flex items-center gap-2 border-emerald-200 bg-emerald-50/60 p-4">
          <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700">
            Mijoz bahosi: {data.satisfactionRating}/5{data.satisfactionComment ? ` — “${data.satisfactionComment}”` : ''}
          </p>
        </Card>
      ) : null}

      <Card className="mb-4 p-5">
        <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{data.description}</p>
      </Card>

      <LinkedRecordsCard ticket={data} onPatch={(payload) => patch.mutate(payload)} />

      <Card className="mb-4 divide-y divide-line">
        {data.messages.map((m) => (
          <div key={m.id} className="px-5 py-3">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-sm font-bold text-ink">{m.author ? displayName(m.author) : 'Tizim'}</p>
              {m.internal ? <Badge tone="amber">Ichki</Badge> : null}
              {m.author?.id === user?.id ? <Badge tone="pink">Siz</Badge> : null}
              <span className="text-xs text-muted">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap text-ink">{m.body}</p>
          </div>
        ))}
      </Card>

      <form onSubmit={onReply} className="space-y-3">
        <CannedResponsePicker category={data.category} onPick={(text) => setBody((prev) => (prev ? `${prev}\n${text}` : text))} />
        <Field label="Javob">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={`${inputClass} h-auto py-2`} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          Ichki izoh (mijozga ko‘rinmaydi)
        </label>
        <Button type="submit" disabled={message.isPending}>
          Yuborish
        </Button>
      </form>
    </div>
  )
}

function CannedResponsePicker({ category, onPick }: { category: TicketDetail['category']; onPick: (text: string) => void }) {
  const { data } = useQuery({
    queryKey: ['canned-responses', 'picker'],
    queryFn: () => api.get<CannedResponseRow[]>('/admin/canned-responses'),
  })

  if (!data?.length) return null

  const sorted = [...data].sort((a, b) => (a.category === category ? -1 : b.category === category ? 1 : 0))

  return (
    <Field label="Tayyor javobni qo‘shish (ixtiyoriy)">
      <select
        defaultValue=""
        onChange={(e) => {
          const picked = sorted.find((r) => r.id === e.target.value)
          if (picked) onPick(picked.body)
          e.target.value = ''
        }}
        className={inputClass}
      >
        <option value="" disabled>
          Shablon tanlang…
        </option>
        {sorted.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
    </Field>
  )
}

function LinkedRecordsCard({
  ticket,
  onPatch,
}: {
  ticket: TicketDetail
  onPatch: (payload: Record<string, unknown>) => void
}) {
  const [bookingQuery, setBookingQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')

  const bookingResults = useQuery({
    queryKey: ['ticket-lookup-bookings', bookingQuery],
    queryFn: () => api.get<BookingLookupRow[]>(`/admin/tickets/lookup/bookings?q=${encodeURIComponent(bookingQuery)}`),
    enabled: bookingQuery.trim().length >= 2,
  })

  const driverResults = useQuery({
    queryKey: ['ticket-lookup-drivers', driverQuery],
    queryFn: () => api.get<DriverLookupRow[]>(`/admin/tickets/lookup/drivers?q=${encodeURIComponent(driverQuery)}`),
    enabled: driverQuery.trim().length >= 2,
  })

  return (
    <Card className="mb-4 space-y-4 p-5">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <TicketIcon className="h-4 w-4" />
          Bog‘langan bron
        </div>
        {ticket.booking ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-ink">
                {ticket.booking.fromLabel} → {ticket.booking.toLabel}
              </p>
              <p className="text-xs text-muted">
                {ticket.booking.rider ? displayName(ticket.booking.rider) : ''}
                {ticket.booking.totalPrice ? ` · ${formatSom(ticket.booking.totalPrice)}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPatch({ bookingId: null })}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Ajratish
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={bookingQuery}
              onChange={(e) => setBookingQuery(e.target.value)}
              placeholder="Mijoz ismi yoki telefon raqami bo‘yicha qidirish"
              className={inputClass}
            />
            {bookingResults.data?.length ? (
              <div className="absolute z-10 mt-1 w-full space-y-1 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                {bookingResults.data.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onPatch({ bookingId: b.id })
                      setBookingQuery('')
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-canvas"
                  >
                    <span className="truncate">
                      {b.fromLabel} → {b.toLabel} · {displayName(b.rider)}
                    </span>
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <Car className="h-4 w-4" />
          Bog‘langan haydovchi
        </div>
        {ticket.driver ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-ink">{displayName(ticket.driver.user)}</p>
              <p className="text-xs text-muted">
                {ticket.driver.carModel} · {ticket.driver.plate}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPatch({ driverId: null })}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Ajratish
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={driverQuery}
              onChange={(e) => setDriverQuery(e.target.value)}
              placeholder="Haydovchi ismi, telefon yoki avto raqami"
              className={inputClass}
            />
            {driverResults.data?.length ? (
              <div className="absolute z-10 mt-1 w-full space-y-1 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                {driverResults.data.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onPatch({ driverId: d.id })
                      setDriverQuery('')
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-canvas"
                  >
                    <span className="truncate">
                      {displayName(d.user)} · {d.plate}
                    </span>
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  )
}
