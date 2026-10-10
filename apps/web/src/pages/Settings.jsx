import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'
import { LanguageRow } from '../components/ui/LanguagePicker'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { t } from '../i18n'

export default function Settings() {
  const { user } = useApp()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', gender: user.gender || '' })
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => api.patch('/users/me', { ...form, gender: form.gender || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title={t('Sozlamalar')} />
      <PageTitle title={t('Sozlamalar')} subtitle={t('Profil va ilova parametrlari')} />
      <Card className="space-y-4 p-4">
        <Field label={t('Ism familiya')}>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label={t('Telefon')}>
          <Input defaultValue={user.phone} disabled />
        </Field>
        <Field label={t('Email')}>
          <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{t('Jins')}</p>
          <p className="mb-2 text-[11px] text-muted">{t('O‘rindiq tanlashda o‘zingizga mos jins avtomatik belgilanadi.')}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'MALE', label: t('Erkak') },
              { id: 'FEMALE', label: t('Ayol') },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, gender: g.id }))}
                className={`h-11 rounded-2xl border text-sm font-bold ${
                  form.gender === g.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink'
                }`}
              >
                {t(g.label)}
              </button>
            ))}
          </div>
        </div>
        <LanguageRow />
        <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3 text-sm font-medium">
          {t('Bildirishnomalar')}
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
        </label>
        <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3 text-sm font-medium">
          {t('Joylashuvni ulashish')}
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
        </label>
        <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t('Saqlanmoqda…') : saved ? t('Saqlandi ✓') : t('Saqlash')}
        </Button>
      </Card>
    </div>
  )
}
