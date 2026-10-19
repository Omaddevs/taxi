import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Lock } from 'lucide-react'
import { AccountScreen, PrimaryButton } from '../../components/account/AccountKit'
import { FlagUz } from '../../components/ui/Flags'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { isCompletePhoneUz, localPhoneDigitsUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../../lib/utils'
import { t } from '../../i18n'
import { PhoneConfirmPanel, usePhoneClaim } from '../../components/auth/PhoneConfirm'

// Menu → name, or Sozlamalar → Shaxsiy ma’lumotlar. Everything here is the person's own to change —
// name, phone, email, gender — whether they signed up with their number or with Google. A new
// number is saved only once it's confirmed in Telegram (PhoneConfirm.jsx). The one exception is
// a driver's number: it's tied to their driver profile, so support changes it.
const fieldCls =
  'h-14 w-full rounded-[18px] bg-canvas px-4 text-[16px] text-ink outline-none ring-brand/40 placeholder:text-muted focus:ring-2 disabled:text-muted'

const initialForm = (user) => ({
  name: user.name || '',
  phone: maskPhoneUz(user.phone || '+998'),
  email: user.email || '',
  gender: user.gender || '',
})

export default function ProfileEdit() {
  const { user } = useApp()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => initialForm(user))
  const [problem, setProblem] = useState('')
  const [saved, setSaved] = useState(false)
  const phoneLocked = user.role === 'DRIVER' || Boolean(user.driver)
  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setProblem('')
    setSaved(false)
  }

  const phoneDigits = localPhoneDigitsUz(form.phone)
  const phoneChanged = !phoneLocked && toE164Uz(form.phone) !== (user.phone || '+998')
  const detailsChanged =
    form.name.trim() !== (user.name || '') || form.email.trim() !== (user.email || '') || form.gender !== (user.gender || '')
  const dirty = detailsChanged || phoneChanged

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const phoneClaim = usePhoneClaim(async (phone) => {
    await queryClient.invalidateQueries({ queryKey: ['me'] })
    setForm((f) => ({ ...f, phone: maskPhoneUz(phone) }))
    flashSaved()
  })

  const save = useMutation({
    mutationFn: async () => {
      const me = detailsChanged
        ? await api.patch('/users/me', { name: form.name.trim(), email: form.email.trim(), gender: form.gender || undefined })
        : null
      const claimed = phoneChanged ? await phoneClaim.start(toE164Uz(form.phone)) : false
      return { me, claimed }
    },
    onSuccess: ({ me, claimed }) => {
      if (me) {
        queryClient.setQueryData(['me'], (prev) => (prev ? { ...prev, ...me } : prev))
        queryClient.invalidateQueries({ queryKey: ['me'] })
        setForm((f) => ({ ...initialForm({ ...user, ...me }), phone: f.phone }))
      }
      // The new number is saved once it's confirmed in Telegram — the panel below takes over.
      if (!claimed) flashSaved()
    },
    onError: (err) => setProblem(err?.message || t('Saqlab bo‘lmadi')),
  })

  function onSubmit(e) {
    e.preventDefault()
    if (!dirty) return
    if (!form.name.trim()) return setProblem(t('Ism kiritilishi shart'))
    // A number can be changed but not taken away: half-typed is an error, empty keeps the old one.
    if (phoneChanged && phoneDigits.length && !isCompletePhoneUz(form.phone)) {
      return setProblem(t('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak'))
    }
    if (phoneChanged && !phoneDigits.length && user.phone) return setProblem(t('Telefon raqamini kiriting'))
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setProblem(t('Email noto‘g‘ri'))
    save.mutate()
  }

  return (
    <AccountScreen title="Shaxsiy ma’lumotlar">
      <div className="mb-6 mt-2 flex justify-center">
        <img src={user.avatar} alt="" className="h-24 w-24 rounded-full bg-brand-soft object-cover" />
      </div>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{t('Ism familiya')}</span>
          <input value={form.name} onChange={(e) => set('name')(e.target.value)} className={fieldCls} autoComplete="name" maxLength={120} />
        </label>

        <div>
          <label htmlFor="profile-phone" className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">
            {t('Telefon')}
          </label>
          <div
            className={`flex h-14 items-center gap-2 rounded-[18px] bg-canvas px-4 ring-brand/40 focus-within:ring-2 ${phoneLocked ? 'text-muted' : 'text-ink'}`}
          >
            <FlagUz className="h-4 w-[22px] shrink-0" />
            <span className="text-[16px] font-semibold">+998</span>
            {phoneLocked ? <Lock className="h-3.5 w-3.5 text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-muted" />}
            <input
              id="profile-phone"
              value={maskLocalPhoneUz(form.phone)}
              onChange={(e) => {
                set('phone')(maskPhoneUz(e.target.value))
                phoneClaim.cancel()
              }}
              disabled={phoneLocked}
              placeholder="90 123 45 67"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={12}
              className="min-w-0 flex-1 bg-transparent text-[16px] tracking-wide outline-none placeholder:text-slate-300 disabled:text-muted"
            />
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted">
            {phoneLocked
              ? t('Haydovchi raqamini o‘zgartirish uchun qo‘llab-quvvatlash xizmatiga yozing.')
              : t('Haydovchilar siz bilan shu raqam orqali bog‘lanadi. Yangi raqam Telegram orqali tasdiqlanadi.')}
          </p>
          {phoneClaim.error ? <p className="mt-2 px-1 text-[13px] font-semibold text-red-500">{t(phoneClaim.error)}</p> : null}
          {phoneClaim.claim ? (
            <div className="mt-3">
              <PhoneConfirmPanel
                claim={phoneClaim.claim}
                state={phoneClaim.state}
                onRetry={() => phoneClaim.start(phoneClaim.claim.phone)}
                onCancel={phoneClaim.cancel}
              />
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{t('Email')}</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
            placeholder="ism@gmail.com"
            className={fieldCls}
            autoComplete="email"
          />
        </label>

        <div>
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{t('Jins')}</span>
          <div className="grid grid-cols-2 gap-1 rounded-[18px] bg-canvas p-1">
            {[
              ['MALE', 'Erkak'],
              ['FEMALE', 'Ayol'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={form.gender === id}
                onClick={() => set('gender')(id)}
                className={`h-12 rounded-[14px] text-[15px] font-semibold transition ${form.gender === id ? 'bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-muted'}`}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted">{t('O‘rindiq tanlashda o‘zingizga mos jins avtomatik belgilanadi.')}</p>
        </div>

        {problem ? (
          <p role="alert" className="px-1 text-[14px] font-semibold text-red-500">
            {t(problem)}
          </p>
        ) : null}
        <PrimaryButton type="submit" disabled={save.isPending || (!dirty && !saved)}>
          {save.isPending ? t('Saqlanmoqda…') : saved ? t('Saqlandi ✓') : t('Saqlash')}
        </PrimaryButton>
      </form>
    </AccountScreen>
  )
}
