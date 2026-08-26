import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button, Card } from '../components/ui/Button'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Field, Input } from '../components/ui/Input'
import { api, ApiError } from '../lib/api'

export default function BecomeDriver() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', phone: '+998', carModel: '', plate: '' })
  const [error, setError] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post('/drivers/applications', form),
    onSuccess: () => navigate('/driver'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Ariza yuborilmadi'),
  })

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const valid = form.fullName.trim().length > 1 && form.phone.trim().length > 6 && form.carModel.trim() && form.plate.trim()

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Haydovchi bo‘lish" />
      <PageTitle title="Haydovchi bo‘lish" subtitle="Ariza qoldiring va daromad qiling" />
      <Card className="space-y-4 p-4">
        <Field label="Ism familiya">
          <Input value={form.fullName} onChange={update('fullName')} placeholder="To‘liq ism" />
        </Field>
        <Field label="Telefon">
          <Input value={form.phone} onChange={update('phone')} placeholder="+998" />
        </Field>
        <Field label="Avtomobil">
          <Input value={form.carModel} onChange={update('carModel')} placeholder="Chevrolet Cobalt" />
        </Field>
        <Field label="Davlat raqami">
          <Input value={form.plate} onChange={update('plate')} placeholder="01 A 000 AA" />
        </Field>
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button className="w-full" disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? 'Yuborilmoqda…' : 'Ariza yuborish'}
        </Button>
      </Card>
    </div>
  )
}
