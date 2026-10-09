import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Inbox, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { inputClass } from '../components/ui/Chart'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { Switch } from '../components/ui/Switch'
import { AdsLog } from '../components/bot/AdsLog'
import { CallsReport } from '../components/bot/CallsReport'
import { GroupLinks } from '../components/bot/GroupLinks'
import { BOT_SETTINGS_PAGES } from '../lib/botSettings'
import type { BotSettingField, BotSettingsResponse, BotSettingsSection } from '../types'

const slugToKey = (slug: string) => slug.replace(/-/g, '_')

export default function BotSettings() {
  const { section = 'features' } = useParams()
  const navigate = useNavigate()
  const page = BOT_SETTINGS_PAGES.find((p) => p.slug === section)
  if (!page || page.to) return <Navigate to={page?.to ?? '/bot-settings/features'} replace />

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
      {section === 'ads-log' ? <AdsLog /> : section === 'calls' ? <CallsReport /> : <SettingsSection sectionKey={slugToKey(section)} />}
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
      {sectionKey === 'group_ads' ? <GroupLinks /> : null}
      {/* Remount when saved text/number values change, so the form starts from them. Switches
          save on their own and aren't part of the form state, so they don't trigger this. */}
      <SectionForm key={JSON.stringify(section.fields.filter((f) => f.type !== 'bool').map((f) => f.value))} section={section} />
    </div>
  )
}

function SectionForm({ section }: { section: BotSettingsSection }) {
  const qc = useQueryClient()
  const formFields = section.fields.filter((f) => f.type !== 'bool')
  const initial = useMemo(
    () => Object.fromEntries(section.fields.filter((f) => f.type !== 'bool').map((f) => [f.key, f.value])),
    [section],
  )
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

  // On/off switches save the moment they're flipped — that's what "yoqish/o'chirish" should feel like.
  const toggle = useMutation({
    mutationFn: (patch: Record<string, boolean>) => api.patch<BotSettingsResponse>('/admin/bot-settings', { values: patch }),
    onSuccess: (fresh) => {
      setError('')
      qc.setQueryData(['bot-settings'], fresh)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi'),
  })
  const pendingToggle = toggle.isPending ? toggle.variables : undefined

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
        {section.fields.map((field) =>
          field.type === 'bool' ? (
            <SettingInput
              key={field.key}
              field={field}
              value={pendingToggle && field.key in pendingToggle ? pendingToggle[field.key] : field.value}
              onChange={(value) => toggle.mutate({ [field.key]: Boolean(value) })}
            />
          ) : (
            <SettingInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
            />
          ),
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className={cn('flex items-center justify-end gap-3 border-t border-line pt-4', !formFields.length && 'hidden')}>
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
