import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Bot,
  Check,
  ClipboardCheck,
  Clock,
  Globe,
  LayoutPanelLeft,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  X,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { Avatar } from '../components/ui/Avatar'
import { cn, formatDateTime, formatPhoneUz, isCompletePhoneUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import { APP_STATUS_LABEL } from '../lib/labels'
import type { DriverApplicationRow } from '../types'

const QUERY_KEY = ['admin-driver-applications']
const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' } as const

const SOURCE_META = {
  BOT: { label: 'Telegram bot', icon: Bot, className: 'bg-sky-50 text-sky-700' },
  WEBAPP: { label: 'Sayt', icon: Globe, className: 'bg-emerald-50 text-emerald-700' },
  PANEL: { label: 'Panel', icon: LayoutPanelLeft, className: 'bg-slate-100 text-slate-700' },
} as const

const REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon viloyati',
  'Buxoro viloyati',
  'Farg‘ona viloyati',
  'Jizzax viloyati',
  'Namangan viloyati',
  'Navoiy viloyati',
  'Qashqadaryo viloyati',
  'Qoraqalpog‘iston',
  'Samarqand viloyati',
  'Sirdaryo viloyati',
  'Surxondaryo viloyati',
  'Xorazm viloyati',
]

const REJECT_PRESETS = ['Hujjatlar to‘liq emas', 'Avtomobil talabga mos emas', 'Telefon javob bermadi', 'Takroriy ariza']

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'ALL'

export default function DriverApplications() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('PENDING')
  const [source, setSource] = useState('')
  const [search, setSearch] = useState('')
  const [rejecting, setRejecting] = useState<DriverApplicationRow | null>(null)
  const [blocking, setBlocking] = useState<DriverApplicationRow | null>(null)
  const [editing, setEditing] = useState<DriverApplicationRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const { data: all = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<DriverApplicationRow[]>('/admin/drivers/applications'),
    refetchInterval: 30_000,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEY })
    qc.invalidateQueries({ queryKey: ['admin-drivers'] })
    qc.invalidateQueries({ queryKey: ['analytics-summary'] })
  }
  const onError = (err: unknown) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi')

  const review = useMutation({
    mutationFn: (input: { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      api.patch(`/admin/drivers/applications/${input.id}`, { status: input.status, rejectionReason: input.rejectionReason }),
    onMutate: () => setError(''),
    onSuccess: refresh,
    onError,
  })
  const block = useMutation({
    mutationFn: (input: { id: string; blocked: boolean; reason?: string }) =>
      api.post(`/admin/drivers/applications/${input.id}/block`, { blocked: input.blocked, reason: input.reason }),
    onMutate: () => setError(''),
    onSuccess: refresh,
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/drivers/applications/${id}`),
    onMutate: () => setError(''),
    onSuccess: refresh,
    onError,
  })

  const counts = useMemo(() => {
    const c = { PENDING: 0, APPROVED: 0, REJECTED: 0, BLOCKED: 0, ALL: all.length }
    for (const a of all) {
      if (a.blocked) c.BLOCKED += 1
      else c[a.status] += 1
    }
    return c
  }, [all])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((a) => {
      if (tab === 'BLOCKED' ? !a.blocked : tab !== 'ALL' && (a.blocked || a.status !== tab)) return false
      if (source && (a.source ?? 'WEBAPP') !== source) return false
      if (!q) return true
      return [a.fullName, a.phone, a.plate, a.carModel, a.region, a.toRegion, a.user.telegramUsername].some((v) =>
        v?.toLowerCase().includes(q),
      )
    })
  }, [all, tab, source, search])

  function onDelete(a: DriverApplicationRow) {
    const note = a.status === 'APPROVED' ? '\n\nHaydovchi ishlashda davom etadi. Uni to‘xtatish uchun «Bloklash» dan foydalaning.' : ''
    if (window.confirm(`“${a.fullName}” arizasini o‘chirasizmi?${note}`)) remove.mutate(a.id)
  }

  return (
    <div>
      <PageHeader
        title="Haydovchi arizalari"
        subtitle="Sayt va Telegram botdan kelgan arizalar: tasdiqlash, rad etish, bloklash va tahrirlash"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Yangi ariza
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock} label="Kutilmoqda" value={String(counts.PENDING)} hint="Ko‘rib chiqilishi kerak" tone="amber" />
        <StatCard icon={ShieldCheck} label="Tasdiqlangan" value={String(counts.APPROVED)} tone="success" />
        <StatCard icon={XCircle} label="Rad etilgan" value={String(counts.REJECTED)} tone="slate" />
        <StatCard icon={Ban} label="Bloklangan" value={String(counts.BLOCKED)} hint="Buyurtma ololmaydi" tone="slate" />
      </div>

      <div className="mb-4 space-y-3">
        <FilterPills
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: 'PENDING', label: `Kutilmoqda (${counts.PENDING})` },
            { value: 'APPROVED', label: `Tasdiqlangan (${counts.APPROVED})` },
            { value: 'REJECTED', label: `Rad etilgan (${counts.REJECTED})` },
            { value: 'BLOCKED', label: `Bloklangan (${counts.BLOCKED})` },
            { value: 'ALL', label: `Barchasi (${counts.ALL})` },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism, telefon, davlat raqami yoki hudud bo‘yicha qidirish"
              className={`${inputClass} pl-9`}
            />
          </div>
          <FilterPills
            value={source}
            onChange={setSource}
            options={[
              { value: '', label: 'Barcha manbalar' },
              { value: 'BOT', label: 'Telegram bot' },
              { value: 'WEBAPP', label: 'Sayt' },
              { value: 'PANEL', label: 'Panel' },
            ]}
          />
        </div>
      </div>

      {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p> : null}

      {isLoading ? (
        <SkeletonTable />
      ) : !rows.length ? (
        <EmptyState
          icon={ClipboardCheck}
          title={all.length ? 'Mos ariza topilmadi' : 'Hozircha ariza yo‘q'}
          text={all.length ? 'Boshqa bo‘lim yoki filtrni tanlab ko‘ring.' : 'Sayt yoki Telegram botdan kelgan arizalar shu yerda chiqadi.'}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Haydovchi</th>
                <th className="px-4 py-3">Avtomobil</th>
                <th className="px-4 py-3">Yo‘nalish</th>
                <th className="px-4 py-3">Manba</th>
                <th className="px-4 py-3">Holati</th>
                <th className="px-4 py-3">Sana</th>
                <th className="sticky right-0 bg-white px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => {
                const src = SOURCE_META[a.source ?? 'WEBAPP']
                return (
                  <tr key={a.id} className={cn('hover:bg-canvas/60', a.blocked && 'bg-red-50/30')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.fullName} size="sm" />
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-bold text-ink">{a.fullName}</p>
                          <p className="text-xs text-muted">
                            {formatPhoneUz(a.phone)}
                            {a.user.gender ? ` · ${a.user.gender === 'FEMALE' ? 'Ayol' : 'Erkak'}` : ''}
                          </p>
                          {a.user.telegramUsername ? (
                            <a
                              href={`https://t.me/${a.user.telegramUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-sky-600 hover:underline"
                            >
                              @{a.user.telegramUsername}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{a.carModel}</p>
                      <span className="mt-1 inline-block whitespace-nowrap rounded-md border border-ink/20 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-ink">
                        {a.plate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {a.region || a.toRegion ? (
                        <p className="max-w-[200px] text-ink">
                          {a.region || '—'}
                          {a.toRegion ? <span className="text-muted"> → {a.toRegion}</span> : null}
                        </p>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', src.className)}>
                        <src.icon className="h-3 w-3" /> {src.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={STATUS_TONE[a.status]}>{APP_STATUS_LABEL[a.status]}</Badge>
                        {a.blocked ? <Badge tone="red">Bloklangan</Badge> : null}
                      </div>
                      {a.blocked && a.blockedReason ? (
                        <p className="mt-1 max-w-[180px] truncate text-[11px] text-red-500" title={a.blockedReason}>
                          {a.blockedReason}
                        </p>
                      ) : a.status === 'REJECTED' && a.rejectionReason ? (
                        <p className="mt-1 max-w-[180px] truncate text-[11px] text-red-500" title={a.rejectionReason}>
                          {a.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatDateTime(a.createdAt)}</td>
                    <td className="sticky right-0 bg-white px-3 py-3 shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]">
                      <div className="flex items-center justify-end gap-1">
                        {!a.blocked && a.status !== 'APPROVED' ? (
                          <Button size="sm" onClick={() => review.mutate({ id: a.id, status: 'APPROVED' })} disabled={review.isPending}>
                            <Check className="h-4 w-4" /> Tasdiqlash
                          </Button>
                        ) : null}
                        {!a.blocked && a.status !== 'REJECTED' ? (
                          <IconBtn title="Rad etish" tone="red" onClick={() => setRejecting(a)}>
                            <X className="h-4 w-4" />
                          </IconBtn>
                        ) : null}
                        {a.blocked ? (
                          <IconBtn title="Blokdan chiqarish" tone="green" onClick={() => block.mutate({ id: a.id, blocked: false })}>
                            <Unlock className="h-4 w-4" />
                          </IconBtn>
                        ) : (
                          <IconBtn title="Bloklash" tone="red" onClick={() => setBlocking(a)}>
                            <Ban className="h-4 w-4" />
                          </IconBtn>
                        )}
                        <IconBtn title="Tahrirlash" onClick={() => setEditing(a)}>
                          <Pencil className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title="O‘chirish" tone="red" onClick={() => onDelete(a)}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ReasonModal
        key={`reject-${rejecting?.id ?? ''}`}
        open={Boolean(rejecting)}
        title="Arizani rad etish"
        text={`“${rejecting?.fullName ?? ''}”. Sabab haydovchiga Telegram orqali yuboriladi.`}
        presets={REJECT_PRESETS}
        confirmLabel="Rad etish"
        required
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) review.mutate({ id: rejecting.id, status: 'REJECTED', rejectionReason: reason })
          setRejecting(null)
        }}
      />
      <ReasonModal
        key={`block-${blocking?.id ?? ''}`}
        open={Boolean(blocking)}
        title="Bloklash"
        text={`“${blocking?.fullName ?? ''}” buyurtma ololmaydi, qayta ariza bera olmaydi va botda ham bloklanadi. Keyin blokdan chiqarish mumkin.`}
        presets={['Qoidabuzarlik', 'Yo‘lovchilardan shikoyat', 'Soxta ma’lumot', 'Obuna to‘lanmagan']}
        confirmLabel="Bloklash"
        onClose={() => setBlocking(null)}
        onConfirm={(reason) => {
          if (blocking) block.mutate({ id: blocking.id, blocked: true, reason: reason || undefined })
          setBlocking(null)
        }}
      />
      {editing ? <ApplicationModal key={editing.id} editing={editing} onClose={() => setEditing(null)} onSaved={refresh} /> : null}
      {creating ? <ApplicationModal editing={null} onClose={() => setCreating(false)} onSaved={refresh} /> : null}
    </div>
  )
}

function IconBtn({ title, tone, onClick, children }: { title: string; tone?: 'green' | 'red'; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'rounded-lg p-2 text-muted hover:bg-canvas',
        tone === 'green' ? 'hover:text-emerald-600' : tone === 'red' ? 'hover:text-red-500' : 'hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function ReasonModal({
  open,
  title,
  text,
  presets,
  confirmLabel,
  required = false,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  text: string
  presets: string[]
  confirmLabel: string
  required?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-3 text-sm text-muted">{text}</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setReason(p)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-semibold',
              reason === p ? 'border-red-400 bg-red-50 text-red-600' : 'border-line text-ink hover:bg-canvas',
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={300}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        placeholder={required ? 'Sabab (majburiy)' : 'Sabab (ixtiyoriy)'}
      />
      <Button variant="danger" className="mt-3 w-full" disabled={required && !reason.trim()} onClick={() => onConfirm(reason.trim())}>
        {confirmLabel}
      </Button>
    </Modal>
  )
}

function ApplicationModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: DriverApplicationRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(editing?.fullName ?? '')
  const [phone, setPhone] = useState('')
  const [carModel, setCarModel] = useState(editing?.carModel ?? '')
  const [plate, setPlate] = useState(editing?.plate ?? '')
  const [region, setRegion] = useState(editing?.region ?? '')
  const [toRegion, setToRegion] = useState(editing?.toRegion ?? '')
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE'>(editing?.user.gender ?? '')
  const [approve, setApprove] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing ? api.patch(`/admin/drivers/applications/${editing.id}/details`, payload) : api.post('/admin/drivers/applications', payload),
    onSuccess: () => {
      onSaved()
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (fullName.trim().length < 2) return setError('Ism-familiyani kiriting')
    if (!carModel.trim()) return setError('Avtomobil modelini kiriting')
    if (!plate.trim()) return setError('Davlat raqamini kiriting')
    if (!editing && !isCompletePhoneUz(phone)) return setError('Telefon raqamini to‘liq kiriting')
    mutation.mutate({
      fullName: fullName.trim(),
      carModel: carModel.trim(),
      plate: plate.trim(),
      region: region.trim(),
      toRegion: toRegion.trim(),
      ...(gender ? { gender } : {}),
      ...(editing ? {} : { phone: toE164Uz(phone), approve }),
    })
  }

  return (
    <Modal open wide title={editing ? 'Arizani tahrirlash' : 'Yangi haydovchi arizasi'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ism-familiya *">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </Field>
          {editing ? (
            <Field label="Telefon">
              <input value={formatPhoneUz(editing.phone)} disabled className={`${inputClass} bg-canvas text-muted`} />
            </Field>
          ) : (
            <Field label="Telefon *">
              <div className={`${inputClass} flex items-center gap-2`}>
                <span className="text-sm font-bold">+998</span>
                <input
                  value={maskLocalPhoneUz(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="90 123 45 67"
                  type="tel"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            </Field>
          )}
          <Field label="Avtomobil *">
            <input value={carModel} onChange={(e) => setCarModel(e.target.value)} className={inputClass} placeholder="Cobalt, Gentra, Malibu…" />
          </Field>
          <Field label="Davlat raqami *">
            <input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="01 A 123 BC" />
          </Field>
          <Field label="Qayerdan (hudud)">
            <input value={region} onChange={(e) => setRegion(e.target.value)} list="uz-regions" className={inputClass} />
          </Field>
          <Field label="Qayerga (yo‘nalish)">
            <input value={toRegion} onChange={(e) => setToRegion(e.target.value)} list="uz-regions" className={inputClass} />
          </Field>
          <Field label="Jinsi">
            <select value={gender} onChange={(e) => setGender(e.target.value as '' | 'MALE' | 'FEMALE')} className={inputClass}>
              <option value="">Ko‘rsatilmagan</option>
              <option value="MALE">Erkak</option>
              <option value="FEMALE">Ayol</option>
            </select>
          </Field>
        </div>
        <datalist id="uz-regions">
          {REGIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        {editing ? (
          <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-muted">O‘zgarishlar haydovchi kartasiga va Telegram botdagi profiliga ham yoziladi.</p>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} className="h-4 w-4 accent-[#00c7d4]" />
            Darhol tasdiqlash (haydovchi sifatida ishga tushadi)
          </label>
        )}
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : editing ? 'Saqlash' : 'Ariza qo‘shish'}
        </Button>
      </form>
    </Modal>
  )
}
