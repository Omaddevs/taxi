import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { FilterPills } from '../components/ui/Filters'

export default function Broadcast() {
  const [role, setRole] = useState('')
  const [type, setType] = useState('SYSTEM')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const send = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<{ sent: number }>('/admin/notifications/broadcast', payload),
    onSuccess: (data) => {
      setResult(`${data.sent} ta foydalanuvchiga yuborildi`)
      setError('')
    },
    onError: (err) => {
      setResult('')
      setError(err instanceof ApiError ? err.message : 'Yuborilmadi')
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    send.mutate({
      title: form.get('title'),
      text: form.get('text'),
      type,
      role: role || undefined,
    })
  }

  return (
    <div>
      <PageHeader
        title="Xabar yuborish"
        subtitle="Tizim bildirishnomasini barcha yoki tanlangan rolga yuboring"
      />
      <Card className="max-w-xl p-5">
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-canvas px-3 py-3 text-sm text-muted">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
          Xabar ilova ichidagi bildirishnomalar ro‘yxatiga tushadi.
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Sarlavha">
            <input name="title" required maxLength={120} className={inputClass} placeholder="Yangi aksiya" />
          </Field>
          <Field label="Matn">
            <textarea
              name="text"
              required
              maxLength={1000}
              rows={4}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="Xabar matni…"
            />
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Tur</p>
            <FilterPills
              value={type}
              onChange={setType}
              options={[
                { value: 'SYSTEM', label: 'Tizim' },
                { value: 'PROMO', label: 'Promo' },
                { value: 'WALLET', label: 'Hamyon' },
                { value: 'BOOKING', label: 'Bron' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Auditoriya</p>
            <FilterPills
              value={role}
              onChange={setRole}
              options={[
                { value: '', label: 'Hammaga' },
                { value: 'PASSENGER', label: 'Yo‘lovchilar' },
                { value: 'DRIVER', label: 'Haydovchilar' },
              ]}
            />
          </div>
          {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
          {result ? <p className="text-sm font-semibold text-emerald-600">{result}</p> : null}
          <Button type="submit" disabled={send.isPending} className="w-full">
            {send.isPending ? 'Yuborilmoqda…' : 'Yuborish'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
