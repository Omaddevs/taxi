import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AccountScreen, PrimaryButton } from '../../components/account/AccountKit'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { formatPhoneUz } from '../../lib/utils'
import { t } from '../../i18n'

// Menu → name, or Sozlamalar → Shaxsiy ma’lumotlar.
const fieldCls =
  'h-14 w-full rounded-[18px] bg-canvas px-4 text-[16px] text-ink outline-none ring-brand/40 placeholder:text-muted focus:ring-2 disabled:text-muted'

export default function ProfileEdit() {
  const { user } = useApp()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', gender: user.gender || '' })
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () =>
      api.patch('/users/me', { name: form.name.trim(), email: form.email.trim(), gender: form.gender || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <AccountScreen title="Shaxsiy ma’lumotlar">
      <div className="mb-6 mt-2 flex justify-center">
        <img src={user.avatar} alt="" className="h-24 w-24 rounded-full bg-brand-soft object-cover" />
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{t('Ism familiya')}</span>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={fieldCls} autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{t('Telefon')}</span>
          <input value={user.phone ? formatPhoneUz(user.phone) : ''} disabled className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-muted">{t('Email')}</span>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={fieldCls} autoComplete="email" />
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
                onClick={() => setForm((f) => ({ ...f, gender: id }))}
                className={`h-12 rounded-[14px] text-[15px] font-semibold transition ${form.gender === id ? 'bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-muted'}`}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted">{t('O‘rindiq tanlashda o‘zingizga mos jins avtomatik belgilanadi.')}</p>
        </div>
        {save.isError ? <p className="px-1 text-[14px] font-semibold text-red-500">{save.error?.message || t('Saqlab bo‘lmadi')}</p> : null}
        <PrimaryButton type="submit" disabled={save.isPending}>
          {save.isPending ? t('Saqlanmoqda…') : saved ? t('Saqlandi ✓') : t('Saqlash')}
        </PrimaryButton>
      </form>
    </AccountScreen>
  )
}
