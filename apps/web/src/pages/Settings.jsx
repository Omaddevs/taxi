import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'
import { LanguageRow } from '../components/ui/LanguagePicker'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

export default function Settings() {
  const { user } = useApp()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '' })
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => api.patch('/users/me', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Sozlamalar" />
      <PageTitle title="Sozlamalar" subtitle="Profil va ilova parametrlari" />
      <Card className="space-y-4 p-4">
        <Field label="Ism familiya">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Telefon">
          <Input defaultValue={user.phone} disabled />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <LanguageRow />
        <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3 text-sm font-medium">
          Bildirishnomalar
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
        </label>
        <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3 text-sm font-medium">
          Joylashuvni ulashish
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
        </label>
        <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saqlanmoqda…' : saved ? 'Saqlandi ✓' : 'Saqlash'}
        </Button>
      </Card>
    </div>
  )
}
