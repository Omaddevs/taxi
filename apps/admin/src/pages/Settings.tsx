import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Monitor, ShieldOff } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { RevealSecret } from '../components/ui/RevealSecret'
import { useAuth } from '../context/AuthContext'
import { api, API_BASE, ApiError } from '../lib/api'
import { formatDateTime, formatPhoneUz, isCompletePhoneUz, localPhoneDigitsUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'
import type { SessionRow, StaffDetail } from '../types'

export default function Settings() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data } = useQuery({
    queryKey: ['staff-me'],
    queryFn: () => api.get<StaffDetail>('/admin/staff/me'),
  })

  useEffect(() => {
    if (!data) return
    setName(data.name || '')
    setPhone(localPhoneDigitsUz(data.phone))
  }, [data])

  const save = useMutation({
    mutationFn: () => {
      if (!isCompletePhoneUz(phone)) throw new Error('Telefon raqamini to‘liq kiriting')
      return api.patch('/admin/staff/me', {
        name: name.trim() || undefined,
        phone: toE164Uz(phone),
        ...(password.trim() ? { password: password.trim() } : {}),
      })
    },
    onSuccess: () => {
      setPassword('')
      setError('')
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['staff-me'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => setError(err instanceof ApiError || err instanceof Error ? err.message : 'Xatolik'),
  })

  function onSave(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  const roleLabel =
    user?.role === 'SALES_OPERATOR' ? 'Sotuv operatori' : user?.role === 'SUPPORT_OPERATOR' ? 'Texnik operator' : 'Administrator'

  return (
    <div>
      <PageHeader title="Sozlamalar" subtitle="Hisob, telefon va parol" />
      <div className="grid max-w-2xl gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Kirish ma’lumotlari</h2>
          <dl className="mb-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Lavozim</dt>
              <dd className="font-semibold">{roleLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Telefon</dt>
              <dd className="font-semibold">{data ? formatPhoneUz(data.phone) : user?.phone}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted">Parol</dt>
              <dd>
                <RevealSecret value={data?.loginPassword} empty="O‘rnatib saqlang — keyin ko‘rinadi" />
              </dd>
            </div>
          </dl>
          <form onSubmit={onSave} className="space-y-3 border-t border-line pt-4">
            <Field label="Ism">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Telefon">
              <div className={`${inputClass} flex items-center gap-2`}>
                <span className="text-sm font-bold">+998</span>
                <input
                  value={maskLocalPhoneUz(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            </Field>
            <Field label="Yangi parol">
              <div className="flex gap-2">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  minLength={6}
                  placeholder="Bo‘sh qoldiring — o‘zgarmaydi"
                  className={inputClass}
                  autoComplete="new-password"
                />
                <button type="button" className="shrink-0 text-xs font-bold text-brand" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? 'Yashirish' : 'Ko‘rsat'}
                </button>
              </div>
            </Field>
            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            {saved ? <p className="text-sm font-semibold text-emerald-600">Saqlandi</p> : null}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
            </Button>
          </form>
        </Card>
        <MySessionsCard />
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">API</h2>
          <p className="text-sm text-muted">Ulanish manzili</p>
          <p className="mt-1 font-mono text-sm font-semibold text-ink">{API_BASE}</p>
        </Card>
      </div>
    </div>
  )
}

function MySessionsCard() {
  const qc = useQueryClient()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['staff-sessions', 'me'],
    queryFn: () => api.get<SessionRow[]>('/admin/staff/me/sessions'),
  })

  const revoke = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/admin/staff/me/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-sessions', 'me'] }),
  })

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Monitor className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-bold text-ink">Faol sessiyalar</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted">Yuklanmoqda…</p>
      ) : !sessions?.length ? (
        <p className="text-sm text-muted">Faol sessiya yo‘q</p>
      ) : (
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{s.userAgent || 'Noma’lum qurilma'}</p>
                <p className="text-xs text-muted">
                  {s.ip || 'IP noma’lum'} · {formatDateTime(s.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke.mutate(s.id)}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
              >
                <ShieldOff className="h-3.5 w-3.5" />
                Chiqarish
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
