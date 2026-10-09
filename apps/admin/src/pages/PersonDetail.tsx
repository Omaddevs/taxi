import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Car, Mail, Star, Trash2, Wallet } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import { Field, inputClass } from '../components/ui/Chart'
import { SkeletonTable } from '../components/ui/EmptyState'
import { ChannelChips } from '../components/people/ChannelChips'
import { EmailPersonModal } from '../components/people/PeopleActions'
import { RevealSecret } from '../components/ui/RevealSecret'
import { displayName, formatDateTime, formatPhoneUz, formatSom } from '../lib/utils'
import { BOOKING_LABEL, BOOKING_TONE, CHANNEL_LABEL, ROLE_LABEL, ROLE_TONE, TX_TYPE_LABEL } from '../lib/labels'
import type { PersonDetail } from '../types'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: actor } = useAuth()
  const queryClient = useQueryClient()
  const canEditSecrets = actor?.role === 'ADMIN' || actor?.role === 'SUPPORT_OPERATOR'
  const canWallet = actor?.role === 'ADMIN'
  const canDelete = actor?.role === 'ADMIN'
  const [emailOpen, setEmailOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [walletOpen, setWalletOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('Admin tuzatishi')
  const [walletError, setWalletError] = useState('')
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState('uz')
  const [notes, setNotes] = useState('')
  const [verified, setVerified] = useState(false)
  const [carModel, setCarModel] = useState('')
  const [plate, setPlate] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')

  const { data: person, isLoading } = useQuery({
    queryKey: ['admin-person', id],
    queryFn: () => api.get<PersonDetail>(`/admin/people/${id}`),
  })

  useEffect(() => {
    if (!person) return
    setName(person.name || '')
    setPhone(person.phone || '')
    setEmail(person.email || '')
    setPassword('')
    setLanguage(person.language || 'uz')
    setNotes(person.notes || '')
    setVerified(person.verified)
    setCarModel(person.driver?.carModel || '')
    setPlate(person.driver?.plate || '')
    setLicenseNumber(person.driver?.licenseNumber || '')
  }, [person])

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: name.trim() || undefined,
        language,
        notes,
        email: email.trim() || null,
      }
      if (canEditSecrets) {
        if (phone.trim()) body.phone = phone.trim()
        if (password.trim()) body.password = password.trim()
        body.verified = verified
      }
      if (person?.driver) {
        if (carModel.trim()) body.carModel = carModel.trim()
        if (plate.trim()) body.plate = plate.trim()
        body.licenseNumber = licenseNumber.trim() || null
      }
      return api.patch(`/admin/people/${id}`, body)
    },
    onSuccess: () => {
      setPassword('')
      setFormError('')
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['admin-person', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-people'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Saqlashda xatolik'),
  })

  const adjust = useMutation({
    mutationFn: (payload: { amount: number; title: string }) =>
      api.post('/admin/wallet/adjust', { userId: id, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-person', id] })
      setWalletOpen(false)
      setAmount('')
      setWalletError('')
    },
    onError: (err) => setWalletError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  // Without history the account is removed; with trips/payments it is anonymised (server decides).
  const remove = useMutation({
    mutationFn: () => api.delete<{ mode: 'deleted' | 'anonymized' }>(`/admin/people/${id}`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-people'] })
      alert(
        result?.mode === 'anonymized'
          ? 'Foydalanuvchining safar/to‘lov tarixi bor edi — shaxsiy ma’lumotlari o‘chirildi, tarix saqlab qolindi.'
          : 'Foydalanuvchi butunlay o‘chirildi.',
      )
      navigate('/people', { replace: true })
    },
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : 'O‘chirib bo‘lmadi'),
  })

  function onDelete() {
    setDeleteError('')
    if (
      confirm(
        `«${displayName(person)}» o‘chirilsinmi?\n\nTarixi bo‘lmasa butunlay o‘chadi; safar yoki to‘lov tarixi bo‘lsa, ism, raqam, email va kirish ma’lumotlari o‘chiriladi, tarix qoladi. Bu amalni qaytarib bo‘lmaydi.`,
      )
    ) {
      remove.mutate()
    }
  }

  function onSave(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  if (isLoading || !person) return <SkeletonTable />

  const isDriver = Boolean(person.driver) || person.role === 'DRIVER'

  return (
    <div>
      <PageHeader
        title={displayName(person)}
        subtitle={person.phone ? formatPhoneUz(person.phone) : person.email || 'Raqam qo‘shilmagan'}
        onBack={() => navigate('/people')}
        backLabel="Katalogga"
        action={
          <div className="flex flex-wrap gap-2">
            {person.email ? (
              <Button variant="outline" onClick={() => setEmailOpen(true)}>
                <Mail className="h-4 w-4" />
                Email yozish
              </Button>
            ) : null}
            {canWallet ? (
              <Button variant="outline" onClick={() => setWalletOpen(true)}>
                <Wallet className="h-4 w-4" />
                Balans
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" onClick={onDelete} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4" />
                {remove.isPending ? 'O‘chirilmoqda…' : 'O‘chirish'}
              </Button>
            ) : null}
          </div>
        }
      />
      {deleteError ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p> : null}
      {emailOpen ? <EmailPersonModal person={person} onClose={() => setEmailOpen(false)} /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={displayName(person)} src={person.avatarUrl} />
              <div>
                <p className="font-bold text-ink">{displayName(person)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge tone={ROLE_TONE[isDriver ? 'DRIVER' : 'PASSENGER']}>
                    {ROLE_LABEL[isDriver ? 'DRIVER' : 'PASSENGER']}
                  </Badge>
                  <Badge tone={person.verified ? 'green' : 'gray'}>
                    {person.verified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}
                  </Badge>
                </div>
              </div>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Telefon" value={person.phone ? formatPhoneUz(person.phone) : 'Qo‘shilmagan'} />
              <Row label="Email" value={person.email || '—'} />
              <Row label="Google" value={person.googleId ? 'Bog‘langan' : 'Bog‘lanmagan'} />
              {canEditSecrets ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Parol</dt>
                  <dd className="text-right">
                    <RevealSecret value={person.loginPassword} empty="Hali saqlanmagan" />
                  </dd>
                </div>
              ) : null}
              <Row label="Telegram" value={person.telegramUsername ? `@${person.telegramUsername}` : person.telegramId || 'Bog‘lanmagan'} />
              <Row label="Birinchi manba" value={CHANNEL_LABEL[person.signupSource]} />
              <div>
                <p className="mb-1 text-sm text-muted">Kanallar</p>
                <ChannelChips person={person} />
              </div>
              <Row label="Til" value={(person.language || 'uz').toUpperCase()} />
              <Row label="Balans" value={formatSom(person.balance)} />
              <Row label="Ball / tanga" value={`${person.points} / ${person.coins}`} />
              <Row
                label="Reyting"
                value={person.ratingCount ? `${person.ratingAvg.toFixed(1)} (${person.ratingCount})` : 'Hali yo‘q'}
              />
              <Row label="Ro‘yxatdan o‘tgan" value={formatDateTime(person.createdAt)} />
              <Row label="Oxirgi faollik" value={formatDateTime(person.lastSeenAt)} />
            </dl>
          </Card>

          {person.driver ? (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Car className="h-4 w-4 text-brand-dark" />
                <h2 className="text-sm font-bold text-ink">Avtomobil</h2>
              </div>
              <dl className="space-y-2.5 text-sm">
                <Row label="Model" value={person.driver.carModel} />
                <Row label="Davlat raqami" value={person.driver.plate} />
                <Row label="Guvohnoma" value={person.driver.licenseNumber || '—'} />
                <Row label="Safarlar" value={String(person.driver.tripsCount)} />
                <Row
                  label="Reyting"
                  value={
                    person.driver.ratingCount
                      ? `${person.driver.ratingAvg.toFixed(1)} (${person.driver.ratingCount})`
                      : 'Hali yo‘q'
                  }
                />
                <Row label="Holat" value={person.driver.approved ? (person.driver.online ? 'Onlayn' : 'Tasdiqlangan') : 'Kutilmoqda'} />
              </dl>
              {actor?.role === 'ADMIN' ? (
                <button
                  type="button"
                  onClick={() => navigate(`/drivers/${person.driver!.id}`)}
                  className="mt-3 text-sm font-semibold text-brand-dark hover:underline"
                >
                  Haydovchi operatsiyasi →
                </button>
              ) : null}
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-bold text-ink">Ma’lumotlarni tahrirlash</h2>
            <p className="mb-4 text-xs text-muted">
              {canEditSecrets
                ? 'Telefon, parol va tasdiq holatini o‘zgartirish mumkin. Yangi parol kiritilsa, sessiyalar yopiladi.'
                : 'Sotuv operatori faqat ism, izoh va avto ma’lumotlarini yangilay oladi. Nomer va parol — admin yoki texnik xizmat.'}
            </p>
            <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
              <Field label="Ism">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Til">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                  <option value="uz">O‘zbekcha</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Telefon">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  disabled={!canEditSecrets}
                />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ism@gmail.com" />
              </Field>
              <Field label="Yangi parol">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder={canEditSecrets ? 'Bo‘sh qoldiring — o‘zgarmaydi' : 'Ruxsat yo‘q'}
                  disabled={!canEditSecrets}
                  autoComplete="new-password"
                />
              </Field>
              {person.driver ? (
                <>
                  <Field label="Mashina modeli">
                    <input value={carModel} onChange={(e) => setCarModel(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Davlat raqami">
                    <input value={plate} onChange={(e) => setPlate(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Guvohnoma raqami">
                    <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className={inputClass} />
                  </Field>
                </>
              ) : null}
              {canEditSecrets ? (
                <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
                  <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
                  Telefon tasdiqlangan
                </label>
              ) : null}
              <div className="sm:col-span-2">
                <Field label="Ichki izoh">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={`${inputClass} h-auto py-2`}
                    placeholder="Qo‘ng‘iroq, shikoyat yoki eslatma"
                  />
                </Field>
              </div>
              {formError ? <p className="text-sm font-semibold text-red-500 sm:col-span-2">{formError}</p> : null}
              {saved ? <p className="text-sm font-semibold text-emerald-600 sm:col-span-2">Saqlandi</p> : null}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saqlanmoqda…' : 'O‘zgarishlarni saqlash'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Yo‘lovchi bronlari</h2>
            {person.recentBookings.length === 0 ? (
              <p className="text-sm text-muted">Bronlar yo‘q</p>
            ) : (
              <ul className="divide-y divide-line">
                {person.recentBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2.5">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => actor?.role === 'ADMIN' && navigate(`/bookings/${b.id}`)}
                    >
                      <p className="text-sm font-semibold text-ink">
                        {b.fromLabel} → {b.toLabel}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(b.departAt)}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatSom(b.totalPrice)}</span>
                      <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_LABEL[b.status]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {person.driver ? (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Haydovchi safarlari</h2>
              {person.driverBookings.length === 0 ? (
                <p className="text-sm text-muted">Safarlar yo‘q</p>
              ) : (
                <ul className="divide-y divide-line">
                  {person.driverBookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {b.fromLabel} → {b.toLabel}
                        </p>
                        <p className="text-xs text-muted">
                          {displayName(b.rider)} · {formatDateTime(b.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatSom(b.totalPrice)}</span>
                        <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_LABEL[b.status]}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Tranzaksiyalar</h2>
            {person.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted">Harakatlar yo‘q</p>
            ) : (
              <ul className="divide-y divide-line">
                {person.recentTransactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-semibold text-ink">{t.title}</p>
                      <p className="text-xs text-muted">
                        {TX_TYPE_LABEL[t.type]} · {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <span className={t.amount >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>
                      {t.amount >= 0 ? '+' : ''}
                      {formatSom(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Olingan baholar</h2>
            {person.ratingsReceived.length === 0 ? (
              <p className="text-sm text-muted">Baholar yo‘q</p>
            ) : (
              <ul className="space-y-3">
                {person.ratingsReceived.map((r) => (
                  <li key={r.id} className="rounded-xl bg-canvas px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{displayName(r.rater)}</p>
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {r.stars}
                      </span>
                    </div>
                    {r.comment ? <p className="mt-1 text-sm text-muted">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={walletOpen} title="Balansni o‘zgartirish" onClose={() => setWalletOpen(false)}>
        <div className="space-y-3">
          <Field label="Summa (so‘m, minus — yechish)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder="50000 yoki -20000"
            />
          </Field>
          <Field label="Izoh">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          {walletError ? <p className="text-sm font-semibold text-red-500">{walletError}</p> : null}
          <Button
            className="w-full"
            disabled={!amount || Number(amount) === 0 || adjust.isPending}
            onClick={() => adjust.mutate({ amount: Number(amount), title })}
          >
            Saqlash
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  )
}
