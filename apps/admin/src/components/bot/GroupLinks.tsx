import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge, Button, Card } from '../ui/Button'
import { Field, inputClass } from '../ui/Chart'
import { Modal } from '../ui/Modal'
import { EmptyState, SkeletonTable } from '../ui/EmptyState'
import { Switch } from '../ui/Switch'
import type { BotGroup, BotGroupsResponse } from '../../types'

function title(group: BotGroup | undefined) {
  return group ? group.title || group.username || group.chatId : '—'
}

// Open group → closed driver group links, managed in one place. A link is just two fields on
// the open group (linkedGroupId + the ad_router toggle), so every action is a group PATCH.
export function GroupLinks() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<BotGroup | 'new' | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-groups', 'all'],
    queryFn: () => api.get<BotGroupsResponse>('/admin/bot-groups'),
  })
  const groups = data?.groups ?? []
  const mains = groups.filter((g) => g.kind === 'MAIN')
  const targets = groups.filter((g) => g.kind === 'CLOSED' || g.kind === 'ROUTE')
  const byId = new Map(groups.map((g) => [g.id, g]))
  const linked = mains.filter((g) => g.linkedGroupId)

  const patch = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => api.patch(`/admin/bot-groups/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-groups'] }),
  })

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Biriktirishlar</h2>
          <p className="mt-0.5 text-sm text-muted">
            Qaysi asosiy guruhning yo‘lovchi e’lonlari qaysi haydovchilar guruhiga tushadi. Kalit — shu guruhda funksiyani yoqish/o‘chirish.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing('new')} disabled={!mains.length || !targets.length}>
          <Plus className="h-4 w-4" />
          Biriktirish qo‘shish
        </Button>
      </div>
      {error ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error instanceof Error ? error.message : 'Bot xizmatiga ulanib bo‘lmadi'}
        </p>
      ) : null}
      {patch.error ? <p className="mb-3 text-sm text-red-600">{(patch.error as Error).message}</p> : null}
      {isLoading ? (
        <SkeletonTable />
      ) : !linked.length ? (
        <EmptyState
          icon={Link2}
          title="Biriktirish yo‘q"
          text={
            !mains.length
              ? 'Avval “Guruhlar → Asosiy guruhlar” bo‘limida asosiy guruh qo‘shing.'
              : !targets.length
                ? 'Avval “Guruhlar → Yopiq guruhlar” bo‘limida haydovchilar guruhini qo‘shing.'
                : 'Asosiy guruhni haydovchilar guruhiga biriktiring.'
          }
        />
      ) : (
        <div className="divide-y divide-line rounded-xl border border-line">
          {linked.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <span className="truncate font-semibold text-ink">{title(group)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate text-ink">{title(byId.get(group.linkedGroupId!))}</span>
                {!byId.get(group.linkedGroupId!) ? <Badge tone="red">guruh o‘chirilgan</Badge> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">{group.settings?.ad_router ? 'Yoqilgan' : 'O‘chiq'}</span>
                <Switch
                  checked={Boolean(group.settings?.ad_router)}
                  label="Yo‘lovchi/haydovchi so‘rovi"
                  onChange={(value) => patch.mutate({ id: group.id, payload: { settings: { ad_router: value } } })}
                />
                <button
                  type="button"
                  onClick={() => setEditing(group)}
                  className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                  title="Tahrirlash"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`«${title(group)}» biriktirmasini o‘chirasizmi? Guruhda so‘rov ham o‘chadi.`)) {
                      patch.mutate({ id: group.id, payload: { linkedGroupId: null, settings: { ad_router: false } } })
                    }
                  }}
                  className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500"
                  title="O‘chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing ? (
        <LinkModal
          key={editing === 'new' ? 'new' : editing.id}
          editing={editing === 'new' ? null : editing}
          mains={mains}
          targets={targets}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Card>
  )
}

function LinkModal({
  editing,
  mains,
  targets,
  onClose,
}: {
  editing: BotGroup | null
  mains: BotGroup[]
  targets: BotGroup[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const free = mains.filter((g) => !g.linkedGroupId)
  const [sourceId, setSourceId] = useState<number | ''>(editing?.id ?? free[0]?.id ?? '')
  const [targetId, setTargetId] = useState<number | ''>(editing?.linkedGroupId ?? '')
  const [enabled, setEnabled] = useState(editing ? Boolean(editing.settings?.ad_router) : true)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/bot-groups/${sourceId}`, { linkedGroupId: Number(targetId), settings: { ad_router: enabled } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-groups'] })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!sourceId || !targetId) {
      setError('Ikkala guruhni ham tanlang')
      return
    }
    save.mutate()
  }

  return (
    <Modal open title={editing ? 'Biriktirishni tahrirlash' : 'Yangi biriktirish'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Asosiy guruh (yo‘lovchilar yozadi)">
          <select
            value={sourceId}
            disabled={Boolean(editing)}
            onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          >
            <option value="">Tanlang</option>
            {(editing ? mains : free).map((g) => (
              <option key={g.id} value={g.id}>
                {title(g)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Haydovchilar guruhi (e’lonlar shu yerga tushadi)">
          <select value={targetId} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : '')} className={inputClass}>
            <option value="">Tanlang</option>
            {targets.map((g) => (
              <option key={g.id} value={g.id}>
                {title(g)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
          <span className="text-sm text-ink">Yo‘lovchi/haydovchi so‘rovini yoqish</span>
          <Switch checked={enabled} onChange={setEnabled} label="Yo‘lovchi/haydovchi so‘rovini yoqish" />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
