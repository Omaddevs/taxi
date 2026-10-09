import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Hash, MessagesSquare, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { Modal } from '../components/ui/Modal'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { Switch } from '../components/ui/Switch'
import type { BotGroup, BotGroupsResponse } from '../types'

type Tab = 'MAIN' | 'CLOSED' | 'ROUTE' | 'CHANNEL'

const TABS: { value: Tab; label: string }[] = [
  { value: 'MAIN', label: 'Asosiy guruhlar' },
  { value: 'CLOSED', label: 'Yopiq guruhlar' },
  { value: 'ROUTE', label: 'Topic guruhlar' },
  { value: 'CHANNEL', label: 'Kanallar' },
]

const TAB_META: Record<Tab, { title: string; text: string; action: string }> = {
  MAIN: {
    title: 'Asosiy guruh yo‘q',
    text: 'Yo‘lovchilar yozadigan ochiq guruhlar (masalan Samarqand-Toshkent taksi). Har birini o‘z yopiq haydovchilar guruhiga biriktiring — yo‘lovchi e’lonlari o‘sha yerga tushadi.',
    action: 'Asosiy guruh qo‘shish',
  },
  CLOSED: {
    title: 'Yopiq guruh yo‘q',
    text: 'Haydovchilar guruhlari. Yo‘lovchi e’lonlari shu yerga tushadi. Mavjud guruhni Andijon-Toshkent kabi yo‘nalishga biriktiring.',
    action: 'Yopiq guruh qo‘shish',
  },
  ROUTE: {
    title: 'Ochiq guruh yo‘q',
    text: 'Masalan Andijon-Toshkent forum-guruhi. Ichida 2 ta Telegram Inner group (topic) bo‘ladi — ularning havolasini qo‘ying.',
    action: 'Ochiq guruh qo‘shish',
  },
  CHANNEL: {
    title: 'Kanal yo‘q',
    text: 'Kanal ID yoki t.me havolasini qo‘ying, keyin nom bering — keyin adashib ketmaslik uchun.',
    action: 'Kanal qo‘shish',
  },
}

function shortRegion(name: string) {
  return name.replace(/\s+(Respublikasi|viloyati|shahri)$/i, '').trim()
}

function corridorLabel(from?: string | null, to?: string | null) {
  if (from && to) return `${shortRegion(from)}-${shortRegion(to)}`
  return null
}

function groupTitle(group: BotGroup) {
  const fromRoute = group.routes[0]
  return group.title || corridorLabel(fromRoute?.fromRegion, fromRoute?.toRegion) || group.username || group.chatId
}

function chatHint(group: BotGroup) {
  return group.username || group.chatId
}

export default function TelegramGroups() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab') as Tab | null
  const tab: Tab = tabParam && TABS.some((t) => t.value === tabParam) ? tabParam : 'MAIN'
  const setTab = (value: Tab) => setParams({ tab: value }, { replace: true })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BotGroup | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-groups', tab],
    queryFn: () => api.get<BotGroupsResponse>(`/admin/bot-groups?kind=${tab}`),
  })

  // Closed/topic driver groups an open group can be linked to.
  const { data: allGroups } = useQuery({
    queryKey: ['bot-groups', 'all'],
    queryFn: () => api.get<BotGroupsResponse>('/admin/bot-groups'),
    enabled: tab === 'MAIN',
  })
  const linkTargets = (allGroups?.groups ?? []).filter((g) => g.kind === 'CLOSED' || g.kind === 'ROUTE')

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/bot-groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-groups'] }),
  })

  const regions = data?.regions ?? []
  const groups = data?.groups ?? []
  const settingLabels = data?.settingLabels ?? {}
  const meta = TAB_META[tab]

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row: BotGroup) {
    setEditing(row)
    setModalOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Guruhlar va kanallar"
        subtitle="Telegram guruhlar va kanallarni ID, @username yoki t.me havola orqali biriktiring, xizmatlarini yoqing"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {meta.action}
          </Button>
        }
      />
      <div className="mb-4">
        <FilterPills value={tab} onChange={(value) => setTab(value as Tab)} options={TABS} />
      </div>
      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error instanceof Error ? error.message : 'Bot xizmatiga ulanib bo‘lmadi'}
        </p>
      ) : null}
      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : !groups.length ? (
        <EmptyState icon={MessagesSquare} title={meta.title} text={meta.text} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((row) => (
            <GroupCard
              key={row.id}
              group={row}
              tab={tab}
              settingLabels={settingLabels}
              linkTargets={linkTargets}
              onEdit={() => openEdit(row)}
              onDelete={() => {
                if (confirm('Bu biriktirmani o‘chirasizmi? Telegram guruhi o‘zi o‘chmaydi.')) remove.mutate(row.id)
              }}
            />
          ))}
        </div>
      )}
      <GroupModal
        key={`${tab}-${editing?.id ?? 'new'}`}
        open={modalOpen}
        tab={tab}
        editing={editing}
        regions={regions}
        linkTargets={linkTargets}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}

function GroupCard({
  group,
  tab,
  settingLabels,
  linkTargets,
  onEdit,
  onDelete,
}: {
  group: BotGroup
  tab: Tab
  settingLabels: Record<string, string>
  linkTargets: BotGroup[]
  onEdit: () => void
  onDelete: () => void
}) {
  const primary = group.routes[0]
  const reverse = group.routes[1]
  const title = groupTitle(group)

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{chatHint(group)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {tab === 'CLOSED' ? (
        <div className="flex flex-wrap gap-1.5">
          {primary?.fromRegion && primary?.toRegion ? (
            <Badge tone="pink">{corridorLabel(primary.fromRegion, primary.toRegion)}</Badge>
          ) : group.region ? (
            <Badge tone="gray">{shortRegion(group.region)} · yo‘nalish belgilanmagan</Badge>
          ) : (
            <Badge tone="gray">Viloyat belgilanmagan</Badge>
          )}
          {reverse?.fromRegion && reverse?.toRegion ? (
            <Badge tone="gray">{corridorLabel(reverse.fromRegion, reverse.toRegion)}</Badge>
          ) : null}
        </div>
      ) : null}
      {tab === 'ROUTE' ? (
        <ul className="space-y-1 text-sm text-muted">
          {group.routes.length ? (
            group.routes.map((route, index) => (
              <li key={`${route.fromRegion}-${route.toRegion}-${index}`} className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {corridorLabel(route.fromRegion, route.toRegion) || 'Ichki chat'}
                  {route.threadId ? ` · topic ${route.threadId}` : ''}
                </span>
              </li>
            ))
          ) : (
            <li>Ichki chatlar hali qo‘shilmagan</li>
          )}
        </ul>
      ) : null}
      {tab === 'CHANNEL' ? (
        <Badge tone="pink">{group.kind === 'MANDATORY_SUB_TARGET' ? 'Majburiy obuna' : 'Kanal'}</Badge>
      ) : null}
      {tab === 'MAIN' ? <LinkPicker group={group} linkTargets={linkTargets} /> : null}
      {tab !== 'CHANNEL' ? <GroupServices group={group} settingLabels={settingLabels} /> : null}
    </Card>
  )
}

function useGroupPatch(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/admin/bot-groups/${groupId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-groups'] }),
  })
}

// Open group -> the closed driver group its passenger ads are routed to.
function LinkPicker({ group, linkTargets }: { group: BotGroup; linkTargets: BotGroup[] }) {
  const patch = useGroupPatch(group.id)
  const routing = group.settings?.ad_router
  return (
    <div className="space-y-1.5 rounded-xl bg-canvas p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        Yo‘lovchi e’lonlari <ArrowRight className="h-3 w-3" /> haydovchilar guruhi
      </p>
      <select
        value={group.linkedGroupId ?? ''}
        disabled={patch.isPending}
        onChange={(e) => patch.mutate({ linkedGroupId: e.target.value ? Number(e.target.value) : null })}
        className={inputClass}
      >
        <option value="">— Biriktirilmagan —</option>
        {linkTargets.map((target) => (
          <option key={target.id} value={target.id}>
            {groupTitle(target)}
          </option>
        ))}
      </select>
      {routing && !group.linkedGroupId ? (
        <p className="text-xs font-semibold text-amber-600">
          “Yo‘lovchi/haydovchi so‘rovi” yoqilgan, lekin guruh biriktirilmagan — xabarlar hozircha ushlanmaydi.
        </p>
      ) : null}
      {!routing && group.linkedGroupId ? (
        <p className="text-xs text-muted">Ishga tushirish uchun pastda “Yo‘lovchi/haydovchi so‘rovi”ni yoqing.</p>
      ) : null}
      {patch.error ? <p className="text-xs text-red-600">{(patch.error as Error).message}</p> : null}
    </div>
  )
}

function GroupServices({ group, settingLabels }: { group: BotGroup; settingLabels: Record<string, string> }) {
  const patch = useGroupPatch(group.id)
  const entries = Object.entries(settingLabels)
  if (!entries.length) return null
  return (
    <details className="rounded-xl border border-line" open={group.kind === 'MAIN'}>
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-muted">
        Guruh xizmatlari · {entries.filter(([key]) => group.settings?.[key]).length} ta yoqilgan
      </summary>
      <div className="space-y-2 border-t border-line px-3 py-2.5">
        {entries.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink">{label}</span>
            <Switch
              checked={Boolean(group.settings?.[key])}
              label={label}
              onChange={(value) => patch.mutate({ settings: { [key]: value } })}
            />
          </div>
        ))}
        {patch.error ? <p className="text-xs text-red-600">{(patch.error as Error).message}</p> : null}
      </div>
    </details>
  )
}

function emptyTopics() {
  return [
    { fromRegion: '', toRegion: '', ref: '' },
    { fromRegion: '', toRegion: '', ref: '' },
  ]
}

function GroupModal({
  open,
  tab,
  editing,
  regions,
  linkTargets,
  onClose,
}: {
  open: boolean
  tab: Tab
  editing: BotGroup | null
  regions: string[]
  linkTargets: BotGroup[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const primary = editing?.routes[0]
  const [ref, setRef] = useState(editing?.username || editing?.chatId || '')
  const [title, setTitle] = useState(editing?.title || '')
  const [fromRegion, setFromRegion] = useState(primary?.fromRegion || editing?.region || '')
  const [toRegion, setToRegion] = useState(primary?.toRegion || '')
  const [includeReverse, setIncludeReverse] = useState(editing ? editing.routes.length > 1 : true)
  const [titleTouched, setTitleTouched] = useState(Boolean(editing?.title))
  const [topics, setTopics] = useState(
    editing?.routes.length
      ? editing.routes.map((route) => ({
          fromRegion: route.fromRegion || '',
          toRegion: route.toRegion || '',
          ref: route.threadId ? String(route.threadId) : '',
        }))
      : emptyTopics(),
  )
  const [linkedGroupId, setLinkedGroupId] = useState<number | null>(editing?.linkedGroupId ?? null)
  const [error, setError] = useState('')

  const autoTitle = useMemo(() => corridorLabel(fromRegion, toRegion) || '', [fromRegion, toRegion])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ref: ref.trim() }
      if (!editing) payload.kind = tab
      if (tab === 'CLOSED') {
        payload.fromRegion = fromRegion
        payload.toRegion = toRegion
        payload.includeReverse = includeReverse
        payload.title = (titleTouched ? title : autoTitle).trim() || autoTitle
      } else if (tab === 'ROUTE') {
        payload.title = (title.trim() || autoTitle).trim() || undefined
        payload.fromRegion = fromRegion || undefined
        payload.toRegion = toRegion || undefined
        payload.topics = topics
          .filter((topic) => topic.fromRegion && topic.toRegion && topic.ref.trim())
          .map((topic) => ({ fromRegion: topic.fromRegion, toRegion: topic.toRegion, ref: topic.ref.trim() }))
      } else if (tab === 'MAIN') {
        payload.title = title.trim() || undefined
        payload.linkedGroupId = linkedGroupId
      } else {
        payload.title = title.trim()
      }
      return editing ? api.patch(`/admin/bot-groups/${editing.id}`, payload) : api.post('/admin/bot-groups', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-groups'] })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Xatolik'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!ref.trim()) {
      setError('ID, @username yoki t.me havolasini kiriting')
      return
    }
    if (tab === 'CLOSED' && (!fromRegion || !toRegion)) {
      setError('Qayerdan va qayerga viloyatni tanlang')
      return
    }
    if (tab === 'CHANNEL' && title.trim().length < 2) {
      setError('Kanalga nom qo‘ying')
      return
    }
    if (tab === 'ROUTE') {
      const filled = topics.filter((topic) => topic.fromRegion && topic.toRegion && topic.ref.trim())
      if (!filled.length) {
        setError('Kamida bitta ichki chat (topic) havolasini qo‘ying')
        return
      }
    }
    mutation.mutate()
  }

  const modalTitle = editing
    ? tab === 'CHANNEL'
      ? 'Kanalni tahrirlash'
      : 'Guruhni tahrirlash'
    : TAB_META[tab].action

  return (
    <Modal open={open} title={modalTitle} onClose={onClose} wide={tab === 'ROUTE'}>
      <form onSubmit={onSubmit} className="space-y-3">
        {tab === 'CLOSED' ? (
          <p className="text-xs text-muted">
            Yopiq guruh — haydovchilar guruhi. Yo‘lovchi kiritgan e’lonlar shu yo‘nalishga tushadi. Hozirgi guruhni Andijon-Toshkent qilib biriktiring.
          </p>
        ) : null}
        {tab === 'MAIN' ? (
          <p className="text-xs text-muted">
            Botni guruhga admin qiling (xabarlarni o‘chirish huquqi bilan), so‘ng guruh havolasini qo‘ying. Masalan:
            https://t.me/samarqand_toshkent_taxiline
          </p>
        ) : null}
        {tab === 'ROUTE' ? (
          <p className="text-xs text-muted">
            Ochiq forum-guruh havolasini qo‘ying, ichidagi har bir Inner group (topic) uchun alohida havola va yo‘nalish tanlang.
          </p>
        ) : null}
        <Field label={tab === 'CHANNEL' ? 'Kanal ID yoki havola' : 'Guruh ID yoki havola'}>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className={inputClass}
            placeholder="-100…, @username yoki https://t.me/…"
          />
        </Field>
        {tab === 'MAIN' ? (
          <Field label="Yo‘lovchi e’lonlari yuboriladigan haydovchilar guruhi">
            <select
              value={linkedGroupId ?? ''}
              onChange={(e) => setLinkedGroupId(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">— Keyinroq biriktiraman —</option>
              {linkTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {groupTitle(target)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {tab !== 'CHANNEL' && tab !== 'MAIN' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Qayerdan">
              <select value={fromRegion} onChange={(e) => setFromRegion(e.target.value)} className={inputClass}>
                <option value="">Viloyat</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qayerga">
              <select value={toRegion} onChange={(e) => setToRegion(e.target.value)} className={inputClass}>
                <option value="">Viloyat</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
        {tab === 'CLOSED' ? (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={includeReverse} onChange={(e) => setIncludeReverse(e.target.checked)} />
            Teskari yo‘nalish ham (masalan Toshkent-Andijon)
          </label>
        ) : null}
        <Field label={tab === 'CHANNEL' ? 'Nom' : 'Nom (ixtiyoriy)'}>
          <input
            value={tab === 'CLOSED' && !titleTouched ? autoTitle || title : title}
            onChange={(e) => {
              setTitle(e.target.value)
              setTitleTouched(true)
            }}
            className={inputClass}
            placeholder={tab === 'CHANNEL' ? 'Masalan: TaxiLine yangiliklar' : 'Masalan: Andijon-Toshkent'}
          />
        </Field>
        {tab === 'ROUTE' ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted">Ichki chatlar (Inner group / topic)</p>
            {topics.map((topic, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Qayerdan">
                    <select
                      value={topic.fromRegion}
                      onChange={(e) =>
                        setTopics((rows) => rows.map((row, i) => (i === index ? { ...row, fromRegion: e.target.value } : row)))
                      }
                      className={inputClass}
                    >
                      <option value="">Viloyat</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qayerga">
                    <select
                      value={topic.toRegion}
                      onChange={(e) =>
                        setTopics((rows) => rows.map((row, i) => (i === index ? { ...row, toRegion: e.target.value } : row)))
                      }
                      className={inputClass}
                    >
                      <option value="">Viloyat</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Topic havolasi">
                  <input
                    value={topic.ref}
                    onChange={(e) => setTopics((rows) => rows.map((row, i) => (i === index ? { ...row, ref: e.target.value } : row)))}
                    className={inputClass}
                    placeholder="https://t.me/guruh/3 yoki https://t.me/c/123/3"
                  />
                </Field>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTopics((rows) => [...rows, { fromRegion: '', toRegion: '', ref: '' }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Ichki chat qo‘shish
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
