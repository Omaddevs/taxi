import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Inbox, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { cn, formatDateTime } from '../lib/utils'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { inputClass } from '../components/ui/Chart'
import { EmptyState, SkeletonGrid, SkeletonTable } from '../components/ui/EmptyState'
import { Switch } from '../components/ui/Switch'
import { BOT_SETTINGS_PAGES } from '../lib/botSettings'
import type { BotGroupAd, BotGroupAdStatus, BotGroupAdsResponse, BotSettingField, BotSettingsResponse, BotSettingsSection } from '../types'

const slugToKey = (slug: string) => slug.replace(/-/g, '_')

export default function BotSettings() {
  const { section = 'general' } = useParams()
  const navigate = useNavigate()
  const page = BOT_SETTINGS_PAGES.find((p) => p.slug === section)
  if (!page || page.to) return <Navigate to={page?.to ?? '/bot-settings/general'} replace />

  return (
    <div>
      <PageHeader
        title="Bot sozlamalari"
        subtitle="Telegram botning barcha sozlamalari — o‘zgarishlar botni qayta ishga tushirmasdan darhol kuchga kiradi"
      />
      <div className="mb-5">
        <FilterPills
          value={section}
          onChange={(value) => navigate(BOT_SETTINGS_PAGES.find((p) => p.slug === value)?.to ?? `/bot-settings/${value}`)}
          options={BOT_SETTINGS_PAGES.map((p) => ({ value: p.slug, label: p.label }))}
        />
      </div>
      {section === 'ads-log' ? <AdsLog /> : <SettingsSection sectionKey={slugToKey(section)} />}
    </div>
  )
}

function SettingsSection({ sectionKey }: { sectionKey: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-settings'],
    queryFn: () => api.get<BotSettingsResponse>('/admin/bot-settings'),
  })
  const section = data?.sections.find((s) => s.key === sectionKey)

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Bot xizmatiga ulanib bo‘lmadi'}
      </p>
    )
  }
  if (isLoading) return <SkeletonGrid count={2} />
  if (!section) return <EmptyState icon={Inbox} title="Bo‘lim topilmadi" text="Bot bu bo‘limni qaytarmadi." />

  return (
    <div className="space-y-4">
      {sectionKey === 'group_ads' ? <GroupAdsExplainer /> : null}
      {/* Remount on fresh data so the form starts from the saved values. */}
      <SectionForm key={JSON.stringify(section.fields.map((f) => f.value))} section={section} />
    </div>
  )
}

function SectionForm({ section }: { section: BotSettingsSection }) {
  const qc = useQueryClient()
  const initial = useMemo(() => Object.fromEntries(section.fields.map((f) => [f.key, f.value])), [section])
  const [values, setValues] = useState<Record<string, BotSettingField['value']>>(initial)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const id = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(id)
  }, [saved])

  const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== initial[key]))
  const dirty = Object.keys(changed).length > 0

  const save = useMutation({
    mutationFn: () => api.patch<BotSettingsResponse>('/admin/bot-settings', { values: changed }),
    onSuccess: (fresh) => {
      setError('')
      setSaved(true)
      qc.setQueryData(['bot-settings'], fresh)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (dirty) save.mutate()
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-ink">{section.label}</h2>
          <p className="mt-0.5 text-sm text-muted">{section.description}</p>
        </div>
        {section.fields.map((field) => (
          <SettingInput
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
          />
        ))}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          {saved ? <span className="text-sm font-semibold text-emerald-600">Saqlandi ✓</span> : null}
          <Button type="button" variant="ghost" disabled={!dirty || save.isPending} onClick={() => setValues(initial)}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function SettingInput({
  field,
  value,
  onChange,
}: {
  field: BotSettingField
  value: BotSettingField['value']
  onChange: (value: BotSettingField['value']) => void
}) {
  const isDefault = value === field.default
  const reset = isDefault ? null : (
    <button
      type="button"
      onClick={() => onChange(field.default)}
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
      title="Standart qiymatga qaytarish"
    >
      <RotateCcw className="h-3 w-3" />
      Standart
    </button>
  )

  if (field.type === 'bool') {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{field.label}</p>
          {field.help ? <p className="mt-0.5 text-xs text-muted">{field.help}</p> : null}
        </div>
        <Switch checked={Boolean(value)} onChange={onChange} label={field.label} />
      </div>
    )
  }

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">{field.label}</span>
        {reset}
      </span>
      {field.type === 'longtext' ? (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={cn(inputClass, 'h-auto py-2 leading-relaxed')}
        />
      ) : (
        <input
          type={field.type === 'int' ? 'number' : field.type === 'url' ? 'url' : 'text'}
          value={String(value ?? '')}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          onChange={(e) => onChange(field.type === 'int' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          className={cn(inputClass, field.type === 'int' && 'max-w-[180px]')}
        />
      )}
      {field.help || field.min != null ? (
        <span className="mt-1 block text-xs text-muted">
          {field.help}
          {field.type === 'int' && field.min != null ? ` (${field.min}–${field.max})` : ''}
        </span>
      ) : null}
    </label>
  )
}

function GroupAdsExplainer() {
  const steps = [
    'Ochiq guruhda kimdir yozadi — bot xabarni o‘chirib, “Yo‘lovchimisiz yoki haydovchi?” deb so‘raydi.',
    '🙋 Yo‘lovchi: ma’lumot shablon ko‘rinishida biriktirilgan yopiq haydovchilar guruhiga “✅ Men olaman” tugmasi bilan tushadi. Yo‘lovchiga «Yuborish» tugmali javob chiqadi.',
    '🚖 Haydovchi: hech narsa yuborilmaydi, “Adminga yozish” tugmali javob chiqadi.',
    'Bot javoblari guruhni to‘ldirmasligi uchun belgilangan vaqtdan keyin o‘chadi.',
  ]
  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-ink">Qanday ishlaydi</h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-ink">
        Har bir ochiq guruhni o‘z yopiq guruhiga biriktiring va “Yo‘lovchi/haydovchi so‘rovi”ni yoqing:
      </p>
      <Link
        to="/groups?tab=MAIN"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline"
      >
        Guruhlar va biriktirish <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  )
}

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

function AdsLog() {
  const [status, setStatus] = useState<'' | BotGroupAdStatus>('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-group-ads', status],
    queryFn: () => api.get<BotGroupAdsResponse>(`/admin/bot-settings/group-ads?limit=200${status ? `&status=${status}` : ''}`),
    refetchInterval: 30_000,
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
      <FilterPills value={status} onChange={(value) => setStatus(value as '' | BotGroupAdStatus)} options={STATUS_FILTERS} />
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error instanceof Error ? error.message : 'Bot xizmatiga ulanib bo‘lmadi'}
        </p>
      ) : null}
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.ads.length ? (
        <EmptyState icon={Inbox} title="Hozircha e’lon yo‘q" text="Ochiq guruhda “Yo‘lovchi/haydovchi so‘rovi” yoqilgach, xabarlar shu yerda ko‘rinadi." />
      ) : (
        <div className="space-y-2">
          {data.ads.map((ad) => (
            <AdRow key={ad.id} ad={ad} groupTitle={data.chatTitles[ad.sourceChatId] ?? ad.sourceChatId} />
          ))}
        </div>
      )}
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

function AdRow({ ad, groupTitle }: { ad: BotGroupAd; groupTitle: string | null }) {
  const meta = STATUS_META[ad.status] ?? { label: ad.status, tone: 'gray' as const }
  const profile = ad.authorUsername ? `https://t.me/${ad.authorUsername}` : null
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{formatDateTime(ad.createdAt)}</span>
        <span>·</span>
        <span className="font-semibold text-ink">{groupTitle}</span>
        <span className="ml-auto flex gap-1.5">
          {ad.role ? <Badge tone="gray">{ad.role === 'PASSENGER' ? '🙋 Yo‘lovchi' : '🚖 Haydovchi'}</Badge> : null}
          <Badge tone={meta.tone}>{meta.label}</Badge>
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
              {ad.authorName} · ID {ad.authorTelegramId}
            </span>
          )}
        </span>
        {ad.takenByName ? <span>🚖 Olgan: {ad.takenByName}</span> : null}
        {ad.hasPhoto ? <span>🖼 Rasm bilan</span> : null}
      </div>
    </Card>
  )
}
