import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, formatDateTime } from '../../lib/utils'
import { Badge, Button, Card } from '../ui/Button'
import { FilterPills } from '../ui/Filters'
import { Field, inputClass } from '../ui/Chart'
import { Modal } from '../ui/Modal'
import { EmptyState, SkeletonTable } from '../ui/EmptyState'
import type { BotGroupAd, BotGroupAdStatus, BotGroupAdsResponse, BotGroupsResponse } from '../../types'

const STATUS_META: Record<BotGroupAdStatus, { label: string; tone: 'pink' | 'green' | 'red' | 'gray' | 'amber' }> = {
  PENDING: { label: 'Javob kutilmoqda', tone: 'amber' },
  SENT: { label: 'Haydovchilarga yuborildi', tone: 'pink' },
  TAKEN: { label: 'Haydovchi oldi', tone: 'green' },
  DRIVER: { label: 'Haydovchi (adminga)', tone: 'gray' },
  EXPIRED: { label: 'Javob berilmadi', tone: 'gray' },
  CANCELLED: { label: 'Bekor qilindi', tone: 'red' },
}

const STATUS_FILTERS: { value: '' | BotGroupAdStatus; label: string }[] = [
  { value: '', label: 'Hammasi' },
  { value: 'SENT', label: 'Yuborilgan' },
  { value: 'TAKEN', label: 'Olingan' },
  { value: 'DRIVER', label: 'Haydovchilar' },
  { value: 'PENDING', label: 'Kutilmoqda' },
  { value: 'EXPIRED', label: 'Javobsiz' },
  { value: 'CANCELLED', label: 'Bekor' },
]

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Xatolik')

export function AdsLog() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<'' | BotGroupAdStatus>('')
  const [editing, setEditing] = useState<BotGroupAd | 'new' | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-group-ads', status],
    queryFn: () => api.get<BotGroupAdsResponse>(`/admin/bot-settings/group-ads?limit=200${status ? `&status=${status}` : ''}`),
    refetchInterval: 30_000,
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/bot-settings/group-ads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-group-ads'] }),
  })
  const stats = data?.stats24h ?? {}
  const passengers = (stats.SENT ?? 0) + (stats.TAKEN ?? 0) + (stats.CANCELLED ?? 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Yo‘lovchi e’lonlari (24 soat)" value={passengers} />
        <Stat label="Haydovchi olgan" value={stats.TAKEN ?? 0} />
        <Stat label="Haydovchi deb javob bergan" value={stats.DRIVER ?? 0} />
        <Stat label="Javobsiz qolgan" value={stats.EXPIRED ?? 0} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills value={status} onChange={(value) => setStatus(value as '' | BotGroupAdStatus)} options={STATUS_FILTERS} />
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          Yangi e’lon
        </Button>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorText(error)}</p> : null}
      {remove.error ? <p className="text-sm text-red-600">{errorText(remove.error)}</p> : null}
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.ads.length ? (
        <EmptyState
          icon={Inbox}
          title="Hozircha e’lon yo‘q"
          text="Ochiq guruhda “Yo‘lovchi/haydovchi so‘rovi” yoqilgach, xabarlar shu yerda ko‘rinadi. “Yangi e’lon” bilan o‘zingiz ham qo‘sha olasiz."
        />
      ) : (
        <div className="space-y-2">
          {data.ads.map((ad) => (
            <AdRow
              key={ad.id}
              ad={ad}
              groupTitle={ad.manual ? 'Dashboard orqali' : (data.chatTitles[ad.sourceChatId] ?? ad.sourceChatId)}
              targetTitle={ad.targetChatId ? (data.chatTitles[ad.targetChatId] ?? ad.targetChatId) : null}
              onEdit={() => setEditing(ad)}
              onDelete={() => {
                if (confirm('E’lonni o‘chirasizmi? Haydovchilar guruhidagi kartochka va guruhdagi bot xabari ham o‘chadi.')) {
                  remove.mutate(ad.id)
                }
              }}
            />
          ))}
        </div>
      )}
      {editing === 'new' ? <CreateModal onClose={() => setEditing(null)} /> : null}
      {editing && editing !== 'new' ? <EditModal key={editing.id} ad={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
    </Card>
  )
}

function AdRow({
  ad,
  groupTitle,
  targetTitle,
  onEdit,
  onDelete,
}: {
  ad: BotGroupAd
  groupTitle: string | null
  targetTitle: string | null
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = STATUS_META[ad.status] ?? { label: ad.status, tone: 'gray' as const }
  const profile = ad.authorUsername ? `https://t.me/${ad.authorUsername}` : null
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{formatDateTime(ad.createdAt)}</span>
        <span>·</span>
        <span className="font-semibold text-ink">{groupTitle}</span>
        {targetTitle ? <span>→ {targetTitle}</span> : null}
        <span className="ml-auto flex items-center gap-1.5">
          {ad.role ? <Badge tone="gray">{ad.role === 'PASSENGER' ? '🙋 Yo‘lovchi' : '🚖 Haydovchi'}</Badge> : null}
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" title="Tahrirlash">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500" title="O‘chirish">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-ink">{ad.text}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          👤{' '}
          {profile ? (
            <a href={profile} target="_blank" rel="noreferrer" className="font-semibold text-brand-dark hover:underline">
              {ad.authorName} (@{ad.authorUsername})
            </a>
          ) : (
            <span className="font-semibold text-ink">
              {ad.authorName}
              {ad.manual ? '' : ` · ID ${ad.authorTelegramId}`}
            </span>
          )}
        </span>
        {ad.takenByName ? <span>🚖 Olgan: {ad.takenByName}</span> : null}
        {ad.hasPhoto ? <span>🖼 Rasm bilan</span> : null}
      </div>
    </Card>
  )
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['bot-groups', 'all'],
    queryFn: () => api.get<BotGroupsResponse>('/admin/bot-groups'),
  })
  const targets = (data?.groups ?? []).filter((g) => g.kind === 'CLOSED' || g.kind === 'ROUTE')
  const [targetId, setTargetId] = useState<number | ''>('')
  const [authorName, setAuthorName] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () =>
      api.post('/admin/bot-settings/group-ads', {
        targetGroupId: Number(targetId),
        text: text.trim(),
        authorName: authorName.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-group-ads'] })
      onClose()
    },
    onError: (err) => setError(errorText(err)),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!targetId) return setError('Haydovchilar guruhini tanlang')
    if (text.trim().length < 5) return setError('E’lon matnini yozing')
    save.mutate()
  }

  return (
    <Modal open title="Yangi yo‘lovchi e’loni" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-3">
        <p className="text-xs text-muted">
          Masalan, telefon orqali kelgan buyurtma. Bot uni shablon ko‘rinishida tanlangan haydovchilar guruhiga “✅ Men olaman” tugmasi bilan joylaydi.
        </p>
        <Field label="Haydovchilar guruhi">
          <select value={targetId} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : '')} className={inputClass}>
            <option value="">Tanlang</option>
            {targets.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title || g.username || g.chatId}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Yo‘lovchi ismi (ixtiyoriy)">
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} className={inputClass} placeholder="Masalan: Dilshod aka" />
        </Field>
        <Field label="E’lon matni">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className={cn(inputClass, 'h-auto py-2 leading-relaxed')}
            placeholder="Samarqanddan Toshkentga, ertaga 07:00, 2 kishi, +998 90 123 45 67"
          />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Yuborilmoqda…' : 'Guruhga yuborish'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditModal({ ad, onClose }: { ad: BotGroupAd; onClose: () => void }) {
  const qc = useQueryClient()
  const [text, setText] = useState(ad.text)
  const [status, setStatus] = useState<'' | 'SENT' | 'CANCELLED'>('')
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/bot-settings/group-ads/${ad.id}`, {
        ...(text.trim() !== ad.text ? { text: text.trim() } : {}),
        ...(status ? { status } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-group-ads'] })
      onClose()
    },
    onError: (err) => setError(errorText(err)),
  })

  const dirty = text.trim() !== ad.text || Boolean(status)
  // What "Faol" means depends on where the ad is now — say it plainly.
  const activateLabel =
    ad.status === 'TAKEN'
      ? 'Faol qilish (haydovchidan bo‘shatish)'
      : ad.status === 'SENT'
        ? 'Faol (o‘zgarishsiz)'
        : 'Faol — haydovchilar guruhiga yuborish'

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!dirty) return onClose()
    if (text.trim().length < 5) return setError('E’lon matni juda qisqa')
    save.mutate()
  }

  return (
    <Modal open title={`E’lon #${ad.id}`} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={STATUS_META[ad.status]?.tone ?? 'gray'}>{STATUS_META[ad.status]?.label ?? ad.status}</Badge>
          {ad.takenByName ? <Badge tone="green">Olgan: {ad.takenByName}</Badge> : null}
        </div>
        <Field label="E’lon matni">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className={cn(inputClass, 'h-auto py-2 leading-relaxed')} />
        </Field>
        {ad.hasCard ? (
          <p className="text-xs text-muted">Saqlanganda haydovchilar guruhidagi kartochka ham yangilanadi.</p>
        ) : null}
        <Field label="Holat">
          <select value={status} onChange={(e) => setStatus(e.target.value as '' | 'SENT' | 'CANCELLED')} className={inputClass}>
            <option value="">O‘zgartirmaslik</option>
            <option value="SENT">{activateLabel}</option>
            <option value="CANCELLED">Bekor qilish</option>
          </select>
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={save.isPending || !dirty}>
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
