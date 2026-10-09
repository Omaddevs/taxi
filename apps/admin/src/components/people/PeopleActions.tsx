import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Mail } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Field, inputClass } from '../ui/Chart'
import { Modal } from '../ui/Modal'
import type { PersonRow } from '../../types'

type EmailStatus = { configured: boolean; from: string | null; ok: boolean; error: string | null }

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError || err instanceof Error ? err.message : fallback)

// SMTP isn't set up / login fails → say so before anyone writes a long message.
function EmailStatusNote() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-status'],
    queryFn: () => api.get<EmailStatus>('/admin/people/email/status'),
    staleTime: 60_000,
  })
  if (isLoading) return <p className="text-xs text-muted">Pochta sozlamasi tekshirilmoqda…</p>
  if (!data?.configured) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Email yuborish hali sozlanmagan — serverga SMTP ma’lumotlari (pochta qutisi) kiritilishi kerak.
      </p>
    )
  }
  if (!data.ok) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Pochta serveriga ulanib bo‘lmadi: {data.error}
      </p>
    )
  }
  return <p className="text-xs text-muted">Yuboruvchi: {data.from}</p>
}

function MessageFields({ subject, setSubject, message, setMessage }: { subject: string; setSubject: (v: string) => void; message: string; setMessage: (v: string) => void }) {
  return (
    <>
      <Field label="Mavzu">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="Masalan: TaxiLine’da yangi aksiya" />
      </Field>
      <Field label="Xabar">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          className={cn(inputClass, 'h-auto py-2 leading-relaxed')}
          placeholder="Xabar matni. Har bir xat «Assalomu alaykum, <ism>!» bilan boshlanadi."
        />
      </Field>
    </>
  )
}

/** One person. */
export function EmailPersonModal({ person, onClose }: { person: Pick<PersonRow, 'id' | 'email' | 'name'>; onClose: () => void }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const send = useMutation({
    mutationFn: () => api.post(`/admin/people/${person.id}/email`, { subject: subject.trim(), message: message.trim() }),
    onError: (err) => setError(errorText(err, 'Yuborib bo‘lmadi')),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    send.mutate()
  }

  return (
    <Modal open title={`Email — ${person.name || person.email}`} onClose={onClose} wide>
      {send.isSuccess ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-bold text-ink">Xat yuborildi</p>
          <p className="mt-1 text-sm text-muted">{person.email}</p>
          <Button className="mt-5" onClick={onClose}>
            Yopish
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-muted">
            Kimga: <b className="text-ink">{person.email}</b>
          </p>
          <EmailStatusNote />
          <MessageFields subject={subject} setSubject={setSubject} message={message} setMessage={setMessage} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Bekor
            </Button>
            <Button type="submit" disabled={send.isPending || subject.trim().length < 2 || message.trim().length < 2}>
              <Mail className="h-4 w-4" />
              {send.isPending ? 'Yuborilmoqda…' : 'Yuborish'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

type BroadcastResult = { total: number; sent: number; failed: number; failures: { email: string; error: string }[] }

/** Many people: every Google sign-up, or everyone who has an email. */
export function EmailBroadcastModal({ onClose }: { onClose: () => void }) {
  const [audience, setAudience] = useState<'google' | 'with_email'>('google')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { data: count } = useQuery({
    queryKey: ['admin-email-audience', audience],
    queryFn: () => api.get<{ count: number }>(`/admin/people/email/audience?audience=${audience}`),
  })
  const send = useMutation({
    mutationFn: () => api.post<BroadcastResult>('/admin/people/email', { audience, subject: subject.trim(), message: message.trim() }),
    onError: (err) => setError(errorText(err, 'Yuborib bo‘lmadi')),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!confirm(`${count?.count ?? 0} ta foydalanuvchiga xat yuborilsinmi?`)) return
    send.mutate()
  }

  const result = send.data
  return (
    <Modal open title="Email yuborish" onClose={onClose} wide>
      {result ? (
        <div className="py-2">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 font-bold text-ink">
              {result.sent} / {result.total} ta xat yuborildi
            </p>
            {result.failed ? <p className="mt-1 text-sm text-red-600">{result.failed} tasini yuborib bo‘lmadi</p> : null}
          </div>
          {result.failures.length ? (
            <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-canvas p-3 text-xs text-muted">
              {result.failures.map((f) => (
                <li key={f.email}>
                  <b className="text-ink">{f.email}</b> — {f.error}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 text-center">
            <Button onClick={onClose}>Yopish</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Kimlarga">
            <select value={audience} onChange={(e) => setAudience(e.target.value as 'google' | 'with_email')} className={inputClass}>
              <option value="google">Google orqali ro‘yxatdan o‘tganlar</option>
              <option value="with_email">Emaili bor barcha mijozlar</option>
            </select>
          </Field>
          <p className="text-sm text-muted">
            Qabul qiluvchilar: <b className="text-ink">{count ? `${count.count} ta` : '…'}</b>
          </p>
          <EmailStatusNote />
          <MessageFields subject={subject} setSubject={setSubject} message={message} setMessage={setMessage} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Bekor
            </Button>
            <Button type="submit" disabled={send.isPending || !count?.count || subject.trim().length < 2 || message.trim().length < 2}>
              <Mail className="h-4 w-4" />
              {send.isPending ? 'Yuborilmoqda… (biroz vaqt olishi mumkin)' : 'Yuborish'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Add a customer by hand (phone and/or email). */
export function CreatePersonModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState('uz')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')


  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/admin/people', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        language,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (person) => {
      qc.invalidateQueries({ queryKey: ['admin-people'] })
      onCreated(person.id)
    },
    onError: (err) => setError(errorText(err, 'Saqlab bo‘lmadi')),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Ismni kiriting')
    if (!phone.trim() && !email.trim()) return setError('Telefon raqam yoki email kiriting')
    create.mutate()
  }

  return (
    <Modal open title="Yangi mijoz" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Ism familiya">
          <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} className={inputClass} autoFocus />
        </Field>
        <Field label="Telefon">
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setError('') }} className={inputClass} placeholder="+998 90 123 45 67" inputMode="tel" />
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} className={inputClass} placeholder="ism@gmail.com" type="email" />
        </Field>
        <Field label="Til">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
            <option value="uz">O‘zbekcha</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="Izoh (ixtiyoriy)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(inputClass, 'h-auto py-2')} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Saqlanmoqda…' : 'Qo‘shish'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
